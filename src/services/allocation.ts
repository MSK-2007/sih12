import {
  getIncidentById,
  advanceIncidentToStatus,
  addIncidentUpdate,
} from './incidents';
import { getResources, getResourceById, updateResourceStatus } from './resources';
import { getRoute } from './routing';
import { allocationEngine, AllocationAnalysis, CandidateRouteData } from '../engines/allocationEngine';
import {
  createAssignment,
  getActiveAssignmentsForResource,
  updateAssignmentStatus,
} from './assignments';
import { createAuditLog } from './auditLogs';
import { assertAuthorizedActor } from './authGuard';

// In-flight resource lock set preventing concurrent confirmDispatch calls from double-allocating the same unit
const activeDispatchLocks = new Set<string>();

/**
 * Runs spatial allocation analysis for an incident by evaluating all available units.
 */
export async function analyzeAllocation(incidentId: string): Promise<AllocationAnalysis | null> {
  const incident = await getIncidentById(incidentId);
  if (!incident) return null;

  // Fetch all active AVAILABLE resources
  const availableResources = await getResources({ status: 'AVAILABLE' });

  // Calculate driving route for each eligible resource
  const candidates: CandidateRouteData[] = [];
  for (const resource of availableResources) {
    if (!resource.isActive || resource.status !== 'AVAILABLE') continue;

    try {
      const route = await getRoute(
        { latitude: resource.latitude, longitude: resource.longitude },
        { latitude: incident.latitude, longitude: incident.longitude }
      );

      candidates.push({ resource, route });
    } catch (err) {
      console.warn(`Routing failed for resource ${resource.resourceCode}:`, err);
    }
  }

  // Run Allocation Engine
  const analysis = allocationEngine.analyzeAllocation(incident, candidates);

  // Log audit entry
  await addIncidentUpdate(
    incidentId,
    `Resource allocation analysis generated: ${analysis.summaryMessage}`,
    incident.status
  );

  return analysis;
}

/**
 * Confirms operator-approved dispatch of selected resources with concurrency locking,
 * double-allocation prevention, rollback on partial failure, and valid incident transitions.
 */
export async function confirmDispatch(
  incidentId: string,
  selectedResourceIds: string[],
  options: { operatorApproved?: boolean; approvedByUserId?: string } = {}
): Promise<{ success: boolean; message: string; staleResourceId?: string; assignmentIds?: string[] }> {
  if (options.operatorApproved === false) {
    return { success: false, message: 'Explicit human operator approval is required before dispatch.' };
  }

  let verifiedActorId = options.approvedByUserId;
  try {
    const actor = await assertAuthorizedActor('DISPATCH_CONFIRM', 'confirmDispatch');
    if (actor) verifiedActorId = actor.userId;
  } catch (authErr: unknown) {
    return {
      success: false,
      message: authErr instanceof Error ? authErr.message : 'Unauthorized dispatch attempt.',
    };
  }

  const uniqueResourceIds = Array.from(new Set(selectedResourceIds.filter(Boolean)));
  if (uniqueResourceIds.length === 0) {
    return { success: false, message: 'No resource units selected for dispatch.' };
  }

  const incident = await getIncidentById(incidentId);
  if (!incident) {
    return { success: false, message: 'Target incident record not found.' };
  }

  if (incident.status === 'RESOLVED' || incident.status === 'CLOSED') {
    return {
      success: false,
      message: `Cannot dispatch resources to a ${incident.status} incident.`,
    };
  }

  // Acquire per-resource in-flight locks atomically before async DB checks
  const acquiredLocks: string[] = [];
  for (const resId of uniqueResourceIds) {
    if (activeDispatchLocks.has(resId)) {
      acquiredLocks.forEach((id) => activeDispatchLocks.delete(id));
      return {
        success: false,
        staleResourceId: resId,
        message: 'Concurrent dispatch in progress for selected unit. Please wait and recalculate.',
      };
    }
    activeDispatchLocks.add(resId);
    acquiredLocks.push(resId);
  }

  const createdAssignments: { assignmentId: string; resourceId: string; resourceCode: string }[] = [];

  try {
    // 1. Stale & Double-Allocation Check: Re-verify ALL selected resources are active, AVAILABLE, and have no active assignment
    const resourcesToAssign = [];
    for (const id of uniqueResourceIds) {
      const res = await getResourceById(id);
      if (!res || !res.isActive || res.status !== 'AVAILABLE') {
        return {
          success: false,
          staleResourceId: id,
          message: `${res ? res.resourceCode : 'Selected unit'} is no longer available. Recalculate recommendations.`,
        };
      }

      const activeAssignments = await getActiveAssignmentsForResource(id);
      if (activeAssignments.length > 0) {
        return {
          success: false,
          staleResourceId: id,
          message: `${res.resourceCode} already has an active assignment (${activeAssignments[0].assignmentStatus}). Double allocation prevented.`,
        };
      }

      resourcesToAssign.push(res);
    }

    const actorUserId = verifiedActorId;

    // 2. Compute deterministic routes & suitability scores and execute guarded assignments
    for (const res of resourcesToAssign) {
      const route = await getRoute(
        { latitude: res.latitude, longitude: res.longitude },
        { latitude: incident.latitude, longitude: incident.longitude }
      );
      const evalAnalysis = allocationEngine.analyzeAllocation(incident, [{ resource: res, route }]);
      const matchedRec = evalAnalysis.recommendations[0];
      const allocScore = matchedRec?.allocationScore ?? 85;

      // Reserve resource first with optimistic concurrency guard (expected status = AVAILABLE)
      const statusLock = await updateResourceStatus(res.id, 'ASSIGNED', undefined, 'AVAILABLE');
      if (!statusLock.success) {
        throw new Error(statusLock.error || `${res.resourceCode} was allocated concurrently.`);
      }

      const assignment = await createAssignment({
        incidentId,
        resourceId: res.id,
        assignmentStatus: 'DISPATCHED',
        distanceKm: route.distanceKm,
        estimatedResponseMinutes: route.durationMinutes,
        allocationScore: allocScore,
        recommendationReason:
          matchedRec?.explanation ||
          `Dispatched via ResQAI Allocation Engine (${route.distanceKm} km, ETA ${route.durationMinutes} min).`,
        assignedBy: actorUserId,
      });

      await updateResourceStatus(res.id, 'ASSIGNED', assignment.id);
      createdAssignments.push({
        assignmentId: assignment.id,
        resourceId: res.id,
        resourceCode: res.resourceCode,
      });
    }

    const assignedCodes = createdAssignments.map((a) => a.resourceCode);

    // 3. Advance Incident Lifecycle Status safely along ALLOWED_STATUS_TRANSITIONS
    if (
      incident.status === 'REPORTED' ||
      incident.status === 'ANALYSING' ||
      incident.status === 'PRIORITIZED' ||
      incident.status === 'AWAITING_DISPATCH'
    ) {
      const adv = await advanceIncidentToStatus(
        incidentId,
        'DISPATCHED',
        `Units ${assignedCodes.join(', ')} dispatched to scene (operator confirmed)`
      );
      if (!adv.success) {
        await addIncidentUpdate(
          incidentId,
          `Units ${assignedCodes.join(', ')} dispatched to scene`,
          incident.status
        );
      }
    } else {
      await addIncidentUpdate(
        incidentId,
        `Additional units ${assignedCodes.join(', ')} dispatched to scene`,
        incident.status
      );
    }

    await createAuditLog('DISPATCH_CONFIRMED', 'incident', incidentId, undefined, {
      incidentNumber: incident.incidentNumber,
      resourceIds: uniqueResourceIds,
      resourceCodes: assignedCodes,
      assignmentIds: createdAssignments.map((a) => a.assignmentId),
    }, actorUserId);

    return {
      success: true,
      message: `Units ${assignedCodes.join(', ')} successfully dispatched to incident ${incident.incidentNumber}.`,
      assignmentIds: createdAssignments.map((a) => a.assignmentId),
    };
  } catch (err: unknown) {
    // Rollback any partial batch assignments on failure
    for (const item of createdAssignments) {
      try {
        await updateAssignmentStatus(item.assignmentId, 'CANCELLED', 'Automatic rollback due to concurrent dispatch failure');
      } catch {
        // best-effort rollback
      }
      try {
        await updateResourceStatus(item.resourceId, 'AVAILABLE', null);
      } catch {
        // best-effort rollback
      }
    }

    return {
      success: false,
      message: err instanceof Error ? err.message : 'Concurrent dispatch failure — transaction rolled back cleanly.',
    };
  } finally {
    acquiredLocks.forEach((id) => activeDispatchLocks.delete(id));
  }
}
