import { supabase, isSupabaseConfigured, markBackendLive, markBackendOffline } from './supabase';
import { ResourceAssignment, AssignmentStatus } from '../types/assignment';
import { getResourceById, updateResourceStatus } from './resources';
import { addIncidentUpdate, getIncidentById } from './incidents';
import { createAuditLog } from './auditLogs';
import { assertAuthorizedActor } from './authGuard';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIVE_ASSIGNMENT_STATUSES: AssignmentStatus[] = ['RECOMMENDED', 'ACCEPTED', 'DISPATCHED', 'IN_PROGRESS'];

export const ALLOWED_ASSIGNMENT_STATUS_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  RECOMMENDED: ['ACCEPTED', 'DISPATCHED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['DISPATCHED', 'IN_PROGRESS', 'CANCELLED'],
  DISPATCHED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
};

export function isValidAssignmentStatusTransition(
  currentStatus: AssignmentStatus,
  targetStatus: AssignmentStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  return (ALLOWED_ASSIGNMENT_STATUS_TRANSITIONS[currentStatus] || []).includes(targetStatus);
}

let localAssignmentsStore: ResourceAssignment[] = [];

function normalizeUuidOrNull(value?: string): string | null {
  if (!value) return null;
  return UUID_REGEX.test(value) ? value : null;
}

export async function getActiveAssignmentsForResource(resourceId: string): Promise<ResourceAssignment[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('resource_assignments')
        .select('*')
        .eq('resource_id', resourceId)
        .in('assignment_status', ACTIVE_ASSIGNMENT_STATUSES);

      if (!error && data) {
        markBackendLive();
        return data.map(mapDbAssignmentToModel);
      }
      if (error) markBackendOffline(error.message);
    } catch (err: unknown) {
      markBackendOffline(err instanceof Error ? err.message : 'Active assignment check failed');
    }
  }

  return localAssignmentsStore.filter(
    (a) => a.resourceId === resourceId && ACTIVE_ASSIGNMENT_STATUSES.includes(a.assignmentStatus)
  );
}

export async function fetchAssignments(): Promise<ResourceAssignment[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('resource_assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        markBackendLive();
        return data.map(mapDbAssignmentToModel);
      }
      if (error) markBackendOffline(error.message);
    } catch (err: unknown) {
      markBackendOffline(err instanceof Error ? err.message : 'Supabase assignments query failed');
    }
  }
  return [...localAssignmentsStore];
}

export async function getAssignmentById(id: string): Promise<ResourceAssignment | null> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('resource_assignments')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      markBackendLive();
      return mapDbAssignmentToModel(data);
    }
  }
  return localAssignmentsStore.find((a) => a.id === id) || null;
}

export async function createAssignment(
  assignmentData: Omit<ResourceAssignment, 'id' | 'createdAt' | 'updatedAt' | 'recommendedAt'>,
  options: { allowDuplicateActive?: boolean } = {}
): Promise<ResourceAssignment> {
  if (!options.allowDuplicateActive) {
    const activeExisting = await getActiveAssignmentsForResource(assignmentData.resourceId);
    if (activeExisting.length > 0) {
      throw new Error(
        `Resource ${assignmentData.resourceId} already has an active assignment (${activeExisting[0].id})`
      );
    }
  }

  const now = new Date().toISOString();
  const newAssignment: ResourceAssignment = {
    ...assignmentData,
    id: `asgn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    recommendedAt: now,
    dispatchedAt: assignmentData.assignmentStatus === 'DISPATCHED' ? now : assignmentData.dispatchedAt,
    createdAt: now,
    updatedAt: now,
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('resource_assignments')
      .insert({
        incident_id: newAssignment.incidentId,
        resource_id: newAssignment.resourceId,
        assignment_status: newAssignment.assignmentStatus,
        recommended_at: newAssignment.recommendedAt,
        dispatched_at: newAssignment.dispatchedAt || null,
        distance_km: newAssignment.distanceKm ?? null,
        estimated_response_minutes: newAssignment.estimatedResponseMinutes ?? null,
        allocation_score: newAssignment.allocationScore ?? null,
        recommendation_reason: newAssignment.recommendationReason || null,
        assigned_by: normalizeUuidOrNull(newAssignment.assignedBy),
      })
      .select()
      .single();

    if (!error && data) {
      markBackendLive();
      return mapDbAssignmentToModel(data);
    }

    throw new Error(`Failed to persist resource assignment: ${error?.message || 'Unknown database error'}`);
  }

  localAssignmentsStore.unshift(newAssignment);
  return { ...newAssignment };
}

export async function updateAssignmentStatus(
  id: string,
  status: AssignmentStatus,
  reason?: string
): Promise<ResourceAssignment | null> {
  const requiredPerm = status === 'CANCELLED' || status === 'REJECTED' ? 'DISPATCH_CANCEL' : 'FIELD_STATUS_UPDATE';
  await assertAuthorizedActor(requiredPerm, `updateAssignmentStatus:${status}`);
  const existing = await getAssignmentById(id);
  if (!existing) return null;

  if (!isValidAssignmentStatusTransition(existing.assignmentStatus, status)) {
    throw new Error(`Invalid assignment status transition from ${existing.assignmentStatus} to ${status}`);
  }

  const now = new Date().toISOString();
  const timeFields: Record<string, string> = { assignment_status: status, updated_at: now };

  if (status === 'ACCEPTED') timeFields.accepted_at = now;
  if (status === 'DISPATCHED') timeFields.dispatched_at = now;
  if (status === 'IN_PROGRESS') timeFields.started_at = now;
  if (status === 'COMPLETED') timeFields.completed_at = now;

  let updatedAssignment: ResourceAssignment | null = null;

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('resource_assignments')
      .update(timeFields)
      .eq('id', id)
      .eq('assignment_status', existing.assignmentStatus)
      .select()
      .single();

    if (!error && data) {
      markBackendLive();
      updatedAssignment = mapDbAssignmentToModel(data);
    } else if (error) {
      throw new Error(`Failed to update assignment status: ${error.message}`);
    }
  } else {
    const assignment = localAssignmentsStore.find((a) => a.id === id);
    if (assignment) {
      assignment.assignmentStatus = status;
      if (status === 'ACCEPTED') assignment.acceptedAt = now;
      if (status === 'DISPATCHED') assignment.dispatchedAt = now;
      if (status === 'IN_PROGRESS') assignment.startedAt = now;
      if (status === 'COMPLETED') assignment.completedAt = now;
      assignment.updatedAt = now;
      updatedAssignment = { ...assignment };
    }
  }

  if (!updatedAssignment) return null;

  // Synchronize unit availability when dispatch enters active field work or finishes/cancels
  if (status === 'IN_PROGRESS') {
    const res = await getResourceById(updatedAssignment.resourceId);
    if (res && res.status !== 'BUSY' && res.status !== 'OFFLINE') {
      await updateResourceStatus(res.id, 'BUSY', updatedAssignment.id);
    }
  } else if (status === 'COMPLETED' || status === 'CANCELLED' || status === 'REJECTED') {
    const remainingActive = await getActiveAssignmentsForResource(updatedAssignment.resourceId);
    const otherActive = remainingActive.filter((a) => a.id !== updatedAssignment!.id);
    if (otherActive.length === 0) {
      const res = await getResourceById(updatedAssignment.resourceId);
      if (res && res.status !== 'AVAILABLE' && res.status !== 'OFFLINE') {
        await updateResourceStatus(res.id, 'AVAILABLE', null);
      }
    }

    const inc = await getIncidentById(updatedAssignment.incidentId);
    if (inc) {
      const actionMsg =
        status === 'COMPLETED'
          ? `Assigned resource completed response and returned to AVAILABLE pool.`
          : `Dispatch assignment ${status.toLowerCase()}${reason ? `: ${reason}` : '.'}`;
      await addIncidentUpdate(updatedAssignment.incidentId, actionMsg, inc.status);
    }
  }

  await createAuditLog(
    `ASSIGNMENT_${status}`,
    'resource_assignment',
    updatedAssignment.id,
    { status: existing.assignmentStatus },
    { status, reason: reason || null }
  );

  return updatedAssignment;
}

/**
 * Cancels an active dispatch assignment and releases the assigned resource back to AVAILABLE.
 */
export async function cancelDispatch(
  assignmentId: string,
  reason: string = 'Cancelled by control room operator'
): Promise<{ success: boolean; assignment?: ResourceAssignment; message: string }> {
  try {
    const updated = await updateAssignmentStatus(assignmentId, 'CANCELLED', reason);
    if (!updated) {
      return { success: false, message: 'Assignment record not found.' };
    }
    return {
      success: true,
      assignment: updated,
      message: 'Dispatch cancelled and unit released back to AVAILABLE pool.',
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to cancel dispatch',
    };
  }
}

function mapDbAssignmentToModel(data: Record<string, unknown>): ResourceAssignment {
  return {
    id: data.id as string,
    incidentId: data.incident_id as string,
    resourceId: data.resource_id as string,
    assignmentStatus: data.assignment_status as any,
    recommendedAt: data.recommended_at as string,
    acceptedAt: data.accepted_at as string,
    dispatchedAt: data.dispatched_at as string,
    startedAt: data.started_at as string,
    completedAt: data.completed_at as string,
    distanceKm: data.distance_km ? Number(data.distance_km) : undefined,
    estimatedResponseMinutes: data.estimated_response_minutes ? Number(data.estimated_response_minutes) : undefined,
    allocationScore: data.allocation_score ? Number(data.allocation_score) : undefined,
    recommendationReason: data.recommendation_reason as string,
    assignedBy: data.assigned_by as string,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}
