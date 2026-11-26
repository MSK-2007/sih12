import { supabase, isSupabaseConfigured, markBackendLive, markBackendOffline } from './supabase';
import { getIncidents, getIncidentById, advanceIncidentToStatus, addIncidentUpdate } from './incidents';
import { getResources, getResourceById, updateResourceStatus } from './resources';
import { getRoute } from './routing';
import {
  reallocationEngine,
  ReallocationRecommendation,
  AssignmentSnapshot,
  CandidateResourceRoute,
} from '../engines/reallocationEngine';
import { PROTECTION_LEVEL_MAPPINGS } from '../engines/reallocationConfig';
import {
  createAssignment,
  fetchAssignments,
  getActiveAssignmentsForResource,
  updateAssignmentStatus,
} from './assignments';
import { createAuditLog } from './auditLogs';
import { assertAuthorizedActor } from './authGuard';

let localReallocationStore: (ReallocationRecommendation & { reviewStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' })[] = [];

/**
 * Performs dynamic reallocation analysis across all active emergencies.
 */
export async function analyzeDynamicReallocation(
  triggerIncidentId?: string
): Promise<ReallocationRecommendation | null> {
  const allIncidents = await getIncidents();
  const activeIncidents = allIncidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED');

  if (activeIncidents.length === 0) return null;

  // Determine trigger incident (default to highest priority unassigned incident)
  let triggerInc = triggerIncidentId ? await getIncidentById(triggerIncidentId) : null;
  if (!triggerInc) {
    const unassigned = activeIncidents.filter((i) => i.status === 'AWAITING_DISPATCH' || i.status === 'REPORTED' || i.status === 'PRIORITIZED');
    triggerInc = unassigned.sort((a, b) => b.priorityScore - a.priorityScore)[0] || activeIncidents[0];
  }

  const allResources = await getResources();

  // Fetch current active dispatches/assignments
  const currentAssignments: AssignmentSnapshot[] = [];
  const assignments = await fetchAssignments();
  for (const res of allResources) {
    if (res.status === 'ASSIGNED' && res.currentAssignmentId) {
      // Find assignment record to get target incident ID
      const asgn = assignments.find((a) => a.id === res.currentAssignmentId);
      const targetIncidentId = asgn ? asgn.incidentId : res.currentAssignmentId;
      // Find assigned incident
      const inc = activeIncidents.find((i) => i.id === targetIncidentId) || activeIncidents[0];
      if (inc) {
        currentAssignments.push({
          resourceId: res.id,
          resourceCode: res.resourceCode,
          incidentId: inc.id,
          incidentNumber: inc.incidentNumber,
          priorityLevel: inc.priorityLevel,
          priorityScore: inc.priorityScore,
          etaMinutes: 7, // estimated active travel ETA
          distanceKm: 3.5,
          protectionLevel: PROTECTION_LEVEL_MAPPINGS[inc.priorityLevel] || 'NORMAL',
        });
      }
    }
  }

  // Calculate driving routes for candidate resources to trigger incident
  const candidateRoutes: CandidateResourceRoute[] = [];
  for (const resource of allResources) {
    if (!resource.isActive) continue;

    try {
      const route = await getRoute(
        { latitude: resource.latitude, longitude: resource.longitude },
        { latitude: triggerInc.latitude, longitude: triggerInc.longitude }
      );

      const currentAsgn = currentAssignments.find((a) => a.resourceId === resource.id);
      candidateRoutes.push({ resource, route, currentAssignment: currentAsgn });
    } catch (err) {
      console.warn(`Route calculation error for ${resource.resourceCode}:`, err);
    }
  }

  // Run Dynamic Reallocation Engine
  const recommendation = reallocationEngine.analyzeReallocation(
    triggerInc,
    activeIncidents,
    allResources,
    currentAssignments,
    candidateRoutes
  );

  // Fetch Gemini AI Explanation if dynamic reallocation is recommended
  if (recommendation.status === 'REALLOCATION_RECOMMENDED' && recommendation.affectedResources.length > 0) {
    const primaryAffRes = recommendation.affectedResources[0];
    const donorInc = activeIncidents.find((i) => i.id === primaryAffRes.fromIncidentId);
    const reassignedRes = allResources.find((r) => r.id === primaryAffRes.resourceId);

    try {
      if (isSupabaseConfigured) {
        const { data: geminiRes, error } = await supabase.functions.invoke('explain-reallocation', {
          body: {
            recommendation,
            triggerIncident: triggerInc,
            donorIncident: donorInc,
            resource: reassignedRes,
          },
        });

        if (!error && geminiRes && geminiRes.summary) {
          recommendation.geminiSummary = {
            summary: geminiRes.summary,
            reason: geminiRes.reason,
            operator_action: geminiRes.operator_action,
            risk: geminiRes.risk,
          };
        }
      }
    } catch (gErr) {
      console.warn('[ReallocationService] Gemini explanation fetch fallback:', gErr);
    }

    if (!recommendation.geminiSummary) {
      recommendation.geminiSummary = {
        summary: `Incident ${triggerInc.incidentNumber} (${triggerInc.priorityLevel}) requires urgent resource allocation.`,
        reason: `Reassigning ${primaryAffRes.resourceCode} yields +${recommendation.improvement} pts system quality improvement over static queueing.`,
        operator_action: `Review and confirm reassignment of ${primaryAffRes.resourceCode} to ${triggerInc.incidentNumber}.`,
        risk: donorInc
          ? `Displaced incident ${donorInc.incidentNumber} response time will increase until replacement unit is available.`
          : 'Minor adjustment to secondary unit coverage.',
      };
    }
  }

  // Store recommendation locally & in Supabase
  localReallocationStore.unshift({ ...recommendation, reviewStatus: 'PENDING' });

  if (isSupabaseConfigured) {
    try {
      await supabase.from('reallocation_events').insert({
        id: recommendation.id,
        trigger_incident_id: recommendation.triggerIncidentId,
        recommendation_data: recommendation,
        current_quality: recommendation.currentQuality,
        proposed_quality: recommendation.proposedQuality,
        improvement: recommendation.improvement,
        status: recommendation.status === 'REALLOCATION_RECOMMENDED' ? 'PENDING_OPERATOR_REVIEW' : 'COMPLETED',
        created_at: recommendation.createdAt,
      });

      // Insert Audit Log entry
      if (recommendation.affectedResources.length > 0) {
        const aff = recommendation.affectedResources[0];
        const donorInc = activeIncidents.find((i) => i.id === aff.fromIncidentId);

        await supabase.from('reallocation_audit_logs').insert({
          recommendation_id: recommendation.id,
          incident_id: recommendation.triggerIncidentId,
          resource_id: aff.resourceId,
          previous_assignment: aff.fromIncidentId ? { incidentId: aff.fromIncidentId, incidentNumber: donorInc?.incidentNumber } : null,
          proposed_assignment: { incidentId: aff.toIncidentId, incidentNumber: triggerInc.incidentNumber },
          reason: recommendation.explanation,
          priority_before: donorInc?.priorityScore || 50,
          priority_after: triggerInc.priorityScore || 90,
          eta_before: 15,
          eta_after: recommendation.affectedIncidents.find((a) => a.incidentId === recommendation.triggerIncidentId)?.newEta || 5,
          environmental_context: triggerInc.environmentalRiskScore ? { riskScore: triggerInc.environmentalRiskScore } : {},
          gemini_summary: recommendation.geminiSummary || {},
          operator_action: 'PENDING',
          created_at: recommendation.createdAt,
        });
      }
    } catch (err) {
      console.warn('[ReallocationService] Audit log DB insertion notice:', err);
    }
  }

  return recommendation;
}

const activeReallocationLocks = new Set<string>();

async function resolveRecommendationById(
  recommendationId: string
): Promise<(ReallocationRecommendation & { reviewStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' }) | null> {
  const localMatch = localReallocationStore.find((r) => r.id === recommendationId);
  if (localMatch) return localMatch;

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('reallocation_events')
      .select('id, recommendation_data, status, created_at')
      .eq('id', recommendationId)
      .single();

    if (!error && data && data.recommendation_data) {
      const rec = data.recommendation_data as ReallocationRecommendation;
      const reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' =
        data.status === 'APPROVED' ? 'APPROVED' : data.status === 'REJECTED' ? 'REJECTED' : 'PENDING';
      const hydrated = {
        ...rec,
        id: (data.id as string) || rec.id,
        createdAt: (data.created_at as string) || rec.createdAt,
        reviewStatus,
      };
      localReallocationStore.unshift(hydrated);
      return hydrated;
    }
  }

  return null;
}

/**
 * Confirms operator approval for dynamic resource reallocation with concurrency locking,
 * donor assignment release, and atomic stale verification.
 */
export async function confirmReallocation(
  recommendationId: string,
  options: { operatorApproved?: boolean; approvedByUserId?: string } = {}
): Promise<{ success: boolean; message: string }> {
  if (options.operatorApproved === false) {
    return { success: false, message: 'Explicit human operator approval is required before reallocation.' };
  }

  let verifiedActorId = options.approvedByUserId;
  try {
    const actor = await assertAuthorizedActor('REALLOCATION_APPROVE', 'confirmReallocation');
    if (actor) verifiedActorId = actor.userId;
  } catch (authErr: unknown) {
    return {
      success: false,
      message: authErr instanceof Error ? authErr.message : 'Unauthorized reallocation attempt.',
    };
  }

  if (activeReallocationLocks.has(recommendationId)) {
    return { success: false, message: 'Reallocation confirmation already in progress.' };
  }
  activeReallocationLocks.add(recommendationId);

  try {
    const rec = await resolveRecommendationById(recommendationId);
    if (!rec) {
      return { success: false, message: 'Reallocation recommendation record not found.' };
    }

    if (rec.reviewStatus === 'APPROVED') {
      return { success: false, message: 'This reallocation recommendation has already been approved.' };
    }
    if (rec.reviewStatus === 'REJECTED') {
      return { success: false, message: 'This reallocation recommendation was already rejected.' };
    }

    // 1. Stale Check: Verify affected resources are active and in expected operational state
    for (const affRes of rec.affectedResources) {
      const res = await getResourceById(affRes.resourceId);
      if (!res || !res.isActive || res.status === 'OFFLINE') {
        return {
          success: false,
          message: 'This recommendation is no longer current because resource state changed. Please recalculate.',
        };
      }
      if (affRes.fromIncidentId && res.status !== 'ASSIGNED' && res.status !== 'BUSY' && res.status !== 'AVAILABLE') {
        return {
          success: false,
          message: `Resource ${res.resourceCode} state (${res.status}) changed before confirmation.`,
        };
      }
    }

    const actorUserId = verifiedActorId;

    const now = new Date().toISOString();

    // 2. Perform Reassignment Steps: release donor assignment first, then create new assignment
    for (const affRes of rec.affectedResources) {
      const existingActive = await getActiveAssignmentsForResource(affRes.resourceId);
      for (const oldAsgn of existingActive) {
        await updateAssignmentStatus(
          oldAsgn.id,
          'CANCELLED',
          `Reassigned to incident ${rec.triggerIncidentNumber} via operator-approved reallocation`
        );
      }

      if (affRes.fromIncidentId) {
        await addIncidentUpdate(
          affRes.fromIncidentId,
          `Unit ${affRes.resourceCode} reassigned to higher-priority incident ${rec.triggerIncidentNumber} via operator approved reallocation.`,
          'IN_PROGRESS'
        );
      }

      const proposedItem = rec.proposedAllocation.find(
        (p) => p.resourceId === affRes.resourceId && p.incidentId === affRes.toIncidentId
      );

      // Ensure resource is AVAILABLE before assigning cleanly (or transition via updateAssignmentStatus release above)
      const assignment = await createAssignment({
        incidentId: affRes.toIncidentId,
        resourceId: affRes.resourceId,
        assignmentStatus: 'DISPATCHED',
        distanceKm: proposedItem?.distanceKm ?? 3.5,
        estimatedResponseMinutes: proposedItem?.etaMinutes ?? 7,
        allocationScore: Math.min(100, Math.max(50, rec.proposedQuality)),
        recommendationReason: `Reassigned via operator confirmed Dynamic Reallocation (+${rec.improvement} pts system quality gain).`,
        assignedBy: actorUserId,
      });

      await updateResourceStatus(affRes.resourceId, 'ASSIGNED', assignment.id);

      await advanceIncidentToStatus(
        affRes.toIncidentId,
        'DISPATCHED',
        `Reassigned unit ${affRes.resourceCode} dispatched to scene`
      );
    }

    rec.status = 'NO_REALLOCATION_REQUIRED';
    rec.reviewStatus = 'APPROVED';

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('reallocation_events')
          .update({ status: 'APPROVED', reviewed_at: now })
          .eq('id', recommendationId);

        await supabase
          .from('reallocation_audit_logs')
          .update({ operator_action: 'ACCEPTED', approved_at: now })
          .eq('recommendation_id', recommendationId);
      } catch (err) {
        console.warn('[ReallocationService] DB update audit notice:', err);
      }
    }

    await createAuditLog('REALLOCATION_APPROVED', 'reallocation_event', recommendationId, undefined, {
      triggerIncidentId: rec.triggerIncidentId,
      affectedResources: rec.affectedResources,
      improvement: rec.improvement,
    }, actorUserId);

    return {
      success: true,
      message: `Dynamic reallocation confirmed. ${rec.affectedResources.map((r) => r.resourceCode).join(', ')} reassigned successfully.`,
    };
  } finally {
    activeReallocationLocks.delete(recommendationId);
  }
}

/**
 * Records operator rejection of a dynamic reallocation recommendation.
 */
export async function rejectReallocation(
  recommendationId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  let actorUserId: string | undefined;
  try {
    const actor = await assertAuthorizedActor('REALLOCATION_APPROVE', 'rejectReallocation');
    actorUserId = actor?.userId;
  } catch (authErr: unknown) {
    return {
      success: false,
      message: authErr instanceof Error ? authErr.message : 'Unauthorized reallocation rejection.',
    };
  }

  const rec = await resolveRecommendationById(recommendationId);
  if (rec) {
    if (rec.reviewStatus === 'APPROVED') {
      return { success: false, message: 'Cannot reject an already approved reallocation.' };
    }
    rec.status = 'NO_FEASIBLE_REALLOCATION';
    rec.reviewStatus = 'REJECTED';
  }

  const now = new Date().toISOString();

  if (rec && rec.triggerIncidentId) {
    const inc = await getIncidentById(rec.triggerIncidentId);
    await addIncidentUpdate(
      rec.triggerIncidentId,
      `Reallocation recommendation rejected by control room operator. ${reason ? `Reason: ${reason}` : ''}`,
      inc?.status || 'AWAITING_DISPATCH'
    );
  }

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('reallocation_events')
        .update({ status: 'REJECTED', reviewed_at: now })
        .eq('id', recommendationId);

      await supabase
        .from('reallocation_audit_logs')
        .update({ operator_action: 'REJECTED', rejection_reason: reason || 'Operator declined proposed change' })
        .eq('recommendation_id', recommendationId);
    } catch (err) {
      console.warn('[ReallocationService] DB update audit notice:', err);
    }
  }

  await createAuditLog('REALLOCATION_REJECTED', 'reallocation_event', recommendationId, undefined, {
    reason: reason || 'Operator declined proposed change',
  }, actorUserId);

  return {
    success: true,
    message: 'Reallocation recommendation rejected by operator.',
  };
}

/**
 * Returns historical dynamic reallocation events from Supabase when available,
 * merged with any in-session records.
 */
export async function getReallocationHistory(): Promise<ReallocationRecommendation[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('reallocation_events')
        .select('id, recommendation_data, status, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        markBackendLive();
        const dbItems = data
          .map((row: Record<string, unknown>) => {
            const rec = row.recommendation_data as ReallocationRecommendation | undefined;
            if (!rec) return null;
            return {
              ...rec,
              id: (row.id as string) || rec.id,
              createdAt: (row.created_at as string) || rec.createdAt,
            };
          })
          .filter((item): item is ReallocationRecommendation => item !== null);

        if (dbItems.length > 0) {
          return dbItems;
        }
      } else if (error) {
        markBackendOffline(error.message);
      }
    } catch (err: unknown) {
      markBackendOffline(err instanceof Error ? err.message : 'Failed to load reallocation history');
    }
  }

  return [...localReallocationStore];
}
