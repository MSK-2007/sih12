import { supabase, isSupabaseConfigured } from './supabase';
import { ResourceAssignment, AssignmentStatus } from '../types/assignment';

let localAssignmentsStore: ResourceAssignment[] = [];

export async function fetchAssignments(): Promise<ResourceAssignment[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('resource_assignments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data.map(mapDbAssignmentToModel);
    }
  }
  return [...localAssignmentsStore];
}

export async function createAssignment(
  assignmentData: Omit<ResourceAssignment, 'id' | 'createdAt' | 'updatedAt' | 'recommendedAt'>
): Promise<ResourceAssignment> {
  const newAssignment: ResourceAssignment = {
    ...assignmentData,
    id: `asgn-${Date.now()}`,
    recommendedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('resource_assignments')
      .insert({
        incident_id: newAssignment.incidentId,
        resource_id: newAssignment.resourceId,
        assignment_status: newAssignment.assignmentStatus,
        recommended_at: newAssignment.recommendedAt,
        distance_km: newAssignment.distanceKm,
        estimated_response_minutes: newAssignment.estimatedResponseMinutes,
        allocation_score: newAssignment.allocationScore,
        recommendation_reason: newAssignment.recommendationReason,
        assigned_by: newAssignment.assignedBy,
      })
      .select()
      .single();

    if (!error && data) {
      return mapDbAssignmentToModel(data);
    }
  }

  localAssignmentsStore.unshift(newAssignment);
  return newAssignment;
}

export async function updateAssignmentStatus(
  id: string,
  status: AssignmentStatus
): Promise<ResourceAssignment | null> {
  const timeFields: Record<string, string> = { assignment_status: status, updated_at: new Date().toISOString() };
  const now = new Date().toISOString();

  if (status === 'ACCEPTED') timeFields.accepted_at = now;
  if (status === 'DISPATCHED') timeFields.dispatched_at = now;
  if (status === 'IN_PROGRESS') timeFields.started_at = now;
  if (status === 'COMPLETED') timeFields.completed_at = now;

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('resource_assignments')
      .update(timeFields)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      return mapDbAssignmentToModel(data);
    }
  }

  const assignment = localAssignmentsStore.find((a) => a.id === id);
  if (assignment) {
    assignment.assignmentStatus = status;
    if (status === 'ACCEPTED') assignment.acceptedAt = now;
    if (status === 'DISPATCHED') assignment.dispatchedAt = now;
    if (status === 'IN_PROGRESS') assignment.startedAt = now;
    if (status === 'COMPLETED') assignment.completedAt = now;
    assignment.updatedAt = now;
    return { ...assignment };
  }
  return null;
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
