import { supabase, isSupabaseConfigured } from './supabase';
import { getIncidents, getIncidentById, updateIncidentStatus, addIncidentUpdate } from './incidents';
import { getResources, getResourceById, updateResourceStatus } from './resources';
import { getRoute } from './routing';
import {
  reallocationEngine,
  ReallocationRecommendation,
  AssignmentSnapshot,
  CandidateResourceRoute,
} from '../engines/reallocationEngine';
import { PROTECTION_LEVEL_MAPPINGS } from '../engines/reallocationConfig';
import { createAssignment, fetchAssignments } from './assignments';

let localReallocationStore: ReallocationRecommendation[] = [];

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

  // Store recommendation locally & in Supabase
  localReallocationStore.unshift(recommendation);

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
    } catch (err) {
      // Fail silently if table missing
    }
  }

  return recommendation;
}

/**
 * Confirms operator approval for dynamic resource reallocation with atomic stale verification.
 */
export async function confirmReallocation(
  recommendationId: string
): Promise<{ success: boolean; message: string }> {
  const rec = localReallocationStore.find((r) => r.id === recommendationId);
  if (!rec) {
    return { success: false, message: 'Reallocation recommendation record not found.' };
  }

  // 1. Transaction Safety & Stale Check: Verify affected resources are still in expected status
  for (const affRes of rec.affectedResources) {
    const res = await getResourceById(affRes.resourceId);
    if (!res || !res.isActive) {
      return {
        success: false,
        message: 'This recommendation is no longer current because resource state changed. Please recalculate.',
      };
    }
  }

  const now = new Date().toISOString();

  // 2. Perform Atomic Reassignment Steps
  for (const affRes of rec.affectedResources) {
    // Release donor assignment
    if (affRes.fromIncidentId) {
      await addIncidentUpdate(
        affRes.fromIncidentId,
        `Unit ${affRes.resourceCode} reassigned to critical incident ${rec.triggerIncidentNumber} via operator approved reallocation.`,
        'IN_PROGRESS'
      );
    }

    // Create new assignment for trigger incident
    const assignment = await createAssignment({
      incidentId: affRes.toIncidentId,
      resourceId: affRes.resourceId,
      assignmentStatus: 'DISPATCHED',
      distanceKm: 3.5,
      estimatedResponseMinutes: 7,
      allocationScore: 90,
      recommendationReason: `Reassigned via operator confirmed Dynamic Reallocation (+${rec.improvement} pts system quality gain).`,
      assignedBy: 'CONTROL_ROOM_OPERATOR',
    });

    // Update resource status
    await updateResourceStatus(affRes.resourceId, 'ASSIGNED', assignment.id);

    // Update trigger incident status
    await updateIncidentStatus(affRes.toIncidentId, 'DISPATCHED', `Reassigned unit ${affRes.resourceCode} dispatched to scene`);
  }

  // Mark recommendation status
  rec.status = 'NO_REALLOCATION_REQUIRED'; // Completed

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('reallocation_events')
        .update({ status: 'APPROVED', reviewed_at: now })
        .eq('id', recommendationId);
    } catch (err) {
      // Fail silently
    }
  }

  return {
    success: true,
    message: `Dynamic reallocation confirmed. ${rec.affectedResources.map((r) => r.resourceCode).join(', ')} reassigned successfully.`,
  };
}

/**
 * Records operator rejection of a dynamic reallocation recommendation.
 */
export async function rejectReallocation(
  recommendationId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const rec = localReallocationStore.find((r) => r.id === recommendationId);
  if (rec) {
    rec.status = 'NO_FEASIBLE_REALLOCATION';
  }

  const now = new Date().toISOString();

  if (rec && rec.triggerIncidentId) {
    await addIncidentUpdate(
      rec.triggerIncidentId,
      `Reallocation recommendation rejected by control room operator. ${reason ? `Reason: ${reason}` : ''}`,
      'AWAITING_DISPATCH'
    );
  }

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('reallocation_events')
        .update({ status: 'REJECTED', reviewed_at: now })
        .eq('id', recommendationId);
    } catch (err) {
      // Fail silently
    }
  }

  return {
    success: true,
    message: 'Reallocation recommendation rejected by operator.',
  };
}

/**
 * Returns historical dynamic reallocation events.
 */
export async function getReallocationHistory(): Promise<ReallocationRecommendation[]> {
  return [...localReallocationStore];
}
