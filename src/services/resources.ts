import { supabase, isSupabaseConfigured } from './supabase';
import {
  Resource,
  CreateResourceInput,
  UpdateResourceInput,
  ResourceStatus,
  ResourceFilters,
  validateResourceStatusTransition,
} from '../types/resource';
import { ResourceAssignment } from '../types/assignment';
import { INITIAL_RESOURCES } from './mockData';

let localResourcesStore: Resource[] = [...INITIAL_RESOURCES];
let localAssignmentsHistory: ResourceAssignment[] = [
  {
    id: 'asgn-prev-1',
    incidentId: 'i1111111-1111-1111-1111-111111111111',
    resourceId: 'r1111111-1111-1111-1111-111111111111',
    assignmentStatus: 'COMPLETED',
    recommendedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    dispatchedAt: new Date(Date.now() - 1000 * 60 * 115).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    distanceKm: 4.2,
    estimatedResponseMinutes: 8,
    allocationScore: 94.5,
    recommendationReason: 'Nearest available ALS unit with cardiac monitor capability.',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
];

/**
 * Fetches all resources with optional search, filter, and sorting.
 */
export async function getResources(filters?: ResourceFilters): Promise<Resource[]> {
  let list: Resource[] = [];

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('resource_code', { ascending: true });

    if (!error && data) {
      list = data.map(mapDbResourceToModel);
    } else {
      list = [...localResourcesStore];
    }
  } else {
    list = [...localResourcesStore];
  }

  // Client-side filtering & sorting
  if (filters) {
    const query = filters.searchQuery?.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (r) =>
          r.resourceCode.toLowerCase().includes(query) ||
          r.name.toLowerCase().includes(query) ||
          r.capability.some((c) => c.toLowerCase().includes(query))
      );
    }

    if (filters.resourceType && filters.resourceType !== 'ALL') {
      list = list.filter((r) => r.resourceType === filters.resourceType);
    }

    if (filters.status && filters.status !== 'ALL') {
      list = list.filter((r) => r.status === filters.status);
    }

    if (filters.departmentId && filters.departmentId !== 'ALL') {
      list = list.filter((r) => r.departmentId === filters.departmentId);
    }

    // Default sorting: AVAILABLE first, then by code
    const sortBy = filters.sortBy || 'status';
    const isAsc = filters.sortOrder === 'asc';

    list.sort((a, b) => {
      if (sortBy === 'status') {
        const order: Record<ResourceStatus, number> = { AVAILABLE: 1, ASSIGNED: 2, BUSY: 3, OFFLINE: 4 };
        return isAsc ? order[a.status] - order[b.status] : order[a.status] - order[b.status];
      }

      let valA: any = a[sortBy === 'resource_code' ? 'resourceCode' : sortBy === 'resource_type' ? 'resourceType' : 'updatedAt'];
      let valB: any = b[sortBy === 'resource_code' ? 'resourceCode' : sortBy === 'resource_type' ? 'resourceType' : 'updatedAt'];

      return isAsc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });
  } else {
    // Default sorting: AVAILABLE first
    const order: Record<ResourceStatus, number> = { AVAILABLE: 1, ASSIGNED: 2, BUSY: 3, OFFLINE: 4 };
    list.sort((a, b) => order[a.status] - order[b.status]);
  }

  return list;
}

/**
 * Fetches a single resource by ID.
 */
export async function getResourceById(id: string): Promise<Resource | null> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      return mapDbResourceToModel(data);
    }
  }
  return localResourcesStore.find((r) => r.id === id) || null;
}

/**
 * Creates a new resource unit.
 */
export async function createResource(input: CreateResourceInput): Promise<Resource> {
  // Validate duplicate resource code
  const existingCode = localResourcesStore.find(
    (r) => r.resourceCode.toUpperCase() === input.resourceCode.toUpperCase()
  );
  if (existingCode) {
    throw new Error(`Resource code '${input.resourceCode}' already exists.`);
  }

  const now = new Date().toISOString();
  const newResource: Resource = {
    id: `res-${Date.now()}`,
    resourceCode: input.resourceCode.toUpperCase(),
    name: input.name,
    resourceType: input.resourceType,
    type: input.resourceType,
    status: input.status || 'AVAILABLE',
    latitude: input.latitude,
    longitude: input.longitude,
    capability: input.capability,
    capabilities: input.capability,
    capacity: input.capacity,
    departmentId: input.departmentId,
    lastLocationUpdate: now,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('resources')
      .insert({
        resource_code: newResource.resourceCode,
        name: newResource.name,
        resource_type: newResource.resourceType,
        status: newResource.status,
        latitude: newResource.latitude,
        longitude: newResource.longitude,
        capability: newResource.capability,
        capacity: newResource.capacity,
        department_id: newResource.departmentId,
        last_location_update: newResource.lastLocationUpdate,
        is_active: true,
      })
      .select()
      .single();

    if (!error && data) {
      return mapDbResourceToModel(data);
    }
  }

  localResourcesStore.unshift(newResource);
  return newResource;
}

/**
 * Updates a resource's editable fields.
 */
export async function updateResource(id: string, input: UpdateResourceInput): Promise<Resource | null> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('resources')
      .update({
        name: input.name,
        department_id: input.departmentId,
        capability: input.capability,
        capacity: input.capacity,
        latitude: input.latitude,
        longitude: input.longitude,
        status: input.status,
        is_active: input.isActive,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      return mapDbResourceToModel(data);
    }
  }

  const resource = localResourcesStore.find((r) => r.id === id);
  if (resource) {
    if (input.name !== undefined) resource.name = input.name;
    if (input.departmentId !== undefined) resource.departmentId = input.departmentId;
    if (input.capability !== undefined) {
      resource.capability = input.capability;
      resource.capabilities = input.capability;
    }
    if (input.capacity !== undefined) resource.capacity = input.capacity;
    if (input.latitude !== undefined) resource.latitude = input.latitude;
    if (input.longitude !== undefined) resource.longitude = input.longitude;
    if (input.status !== undefined) resource.status = input.status;
    if (input.isActive !== undefined) resource.isActive = input.isActive;
    resource.updatedAt = now;
    return { ...resource };
  }
  return null;
}

/**
 * Updates a resource status with business transition validation rules.
 */
export async function updateResourceStatus(
  id: string,
  newStatus: ResourceStatus,
  currentAssignmentId?: string
): Promise<{ success: boolean; resource?: Resource; error?: string }> {
  const resource = await getResourceById(id);
  if (!resource) {
    return { success: false, error: 'Resource unit not found' };
  }

  const transitionCheck = validateResourceStatusTransition(resource.status, newStatus);
  if (!transitionCheck.valid) {
    return { success: false, error: transitionCheck.reason };
  }

  if (isSupabaseConfigured) {
    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (currentAssignmentId !== undefined) {
      updatePayload.current_assignment_id = currentAssignmentId;
    }

    const { data, error } = await supabase
      .from('resources')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      return { success: true, resource: mapDbResourceToModel(data) };
    }
  }

  resource.status = newStatus;
  if (currentAssignmentId !== undefined) {
    resource.currentAssignmentId = currentAssignmentId;
  }
  resource.updatedAt = new Date().toISOString();
  return { success: true, resource: { ...resource } };
}

/**
 * Updates GPS location coordinates for a resource unit.
 */
export async function updateResourceLocation(
  id: string,
  latitude: number,
  longitude: number
): Promise<Resource | null> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('resources')
      .update({
        latitude,
        longitude,
        last_location_update: now,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      return mapDbResourceToModel(data);
    }
  }

  const resource = localResourcesStore.find((r) => r.id === id);
  if (resource) {
    resource.latitude = latitude;
    resource.longitude = longitude;
    resource.lastLocationUpdate = now;
    resource.updatedAt = now;
    return { ...resource };
  }
  return null;
}

/**
 * Fetches current and historical dispatches for a resource unit.
 */
export async function getResourceAssignments(resourceId: string): Promise<ResourceAssignment[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('resource_assignments')
      .select('*')
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data.map((d) => ({
        id: d.id as string,
        incidentId: d.incident_id as string,
        resourceId: d.resource_id as string,
        assignmentStatus: d.assignment_status as any,
        recommendedAt: d.recommended_at as string,
        acceptedAt: d.accepted_at as string,
        dispatchedAt: d.dispatched_at as string,
        startedAt: d.started_at as string,
        completedAt: d.completed_at as string,
        distanceKm: d.distance_km ? Number(d.distance_km) : undefined,
        estimatedResponseMinutes: d.estimated_response_minutes ? Number(d.estimated_response_minutes) : undefined,
        allocationScore: d.allocation_score ? Number(d.allocation_score) : undefined,
        recommendationReason: d.recommendation_reason as string,
        assignedBy: d.assigned_by as string,
        createdAt: d.created_at as string,
        updatedAt: d.updated_at as string,
      }));
    }
  }

  return localAssignmentsHistory.filter((a) => a.resourceId === resourceId);
}

function mapDbResourceToModel(data: Record<string, unknown>): Resource {
  const caps = (data.capability as string[]) || [];
  const type = data.resource_type as any;

  return {
    id: data.id as string,
    resourceCode: data.resource_code as string,
    name: data.name as string,
    resourceType: type,
    type,
    status: data.status as any,
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    capability: caps,
    capabilities: caps,
    capacity: Number(data.capacity),
    departmentId: data.department_id as string,
    currentAssignmentId: data.current_assignment_id as string,
    lastLocationUpdate: data.last_location_update as string,
    isActive: Boolean(data.is_active),
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}
