export type ResourceType = 'AMBULANCE' | 'FIRE_UNIT' | 'POLICE_UNIT' | 'RESCUE_TEAM';

export type ResourceStatus = 'AVAILABLE' | 'ASSIGNED' | 'BUSY' | 'OFFLINE';

export interface Resource {
  id: string;
  resourceCode: string;
  name: string;
  resourceType: ResourceType;
  type?: ResourceType; // Compatibility alias
  status: ResourceStatus;
  latitude: number;
  longitude: number;
  capability: string[];
  capabilities?: string[]; // Compatibility alias
  capacity: number;
  departmentId?: string;
  currentAssignmentId?: string;
  lastLocationUpdate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResourceInput {
  resourceCode: string;
  name: string;
  resourceType: ResourceType;
  departmentId?: string;
  capability: string[];
  capacity: number;
  latitude: number;
  longitude: number;
  status?: ResourceStatus;
}

export interface UpdateResourceInput {
  name?: string;
  departmentId?: string;
  capability?: string[];
  capacity?: number;
  latitude?: number;
  longitude?: number;
  status?: ResourceStatus;
  isActive?: boolean;
}

export interface ResourceFilters {
  searchQuery?: string;
  resourceType?: ResourceType | 'ALL';
  status?: ResourceStatus | 'ALL';
  departmentId?: string | 'ALL';
  sortBy?: 'resource_code' | 'resource_type' | 'status' | 'department_id' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Validates status transitions for resources according to business rules.
 */
export const ALLOWED_RESOURCE_STATUS_TRANSITIONS: Record<ResourceStatus, ResourceStatus[]> = {
  AVAILABLE: ['ASSIGNED', 'BUSY', 'OFFLINE'],
  ASSIGNED: ['BUSY', 'AVAILABLE', 'OFFLINE'],
  BUSY: ['AVAILABLE', 'OFFLINE'],
  OFFLINE: ['AVAILABLE'],
};

export function validateResourceStatusTransition(
  currentStatus: ResourceStatus,
  targetStatus: ResourceStatus
): { valid: boolean; reason?: string } {
  if (currentStatus === targetStatus) return { valid: true };

  const allowed = ALLOWED_RESOURCE_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    return {
      valid: false,
      reason: `Cannot transition resource status directly from ${currentStatus} to ${targetStatus}`,
    };
  }

  return { valid: true };
}

export function getResourceTypeLabel(type: ResourceType): string {
  switch (type) {
    case 'AMBULANCE':
      return 'Ambulance';
    case 'FIRE_UNIT':
      return 'Fire Unit';
    case 'POLICE_UNIT':
      return 'Police Unit';
    case 'RESCUE_TEAM':
      return 'Rescue Team';
    default:
      return type;
  }
}
