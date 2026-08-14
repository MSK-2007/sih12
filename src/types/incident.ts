export type EmergencyType = 
  | 'ROAD_ACCIDENT'
  | 'FIRE'
  | 'MEDICAL'
  | 'FLOOD'
  | 'BUILDING_COLLAPSE'
  | 'NATURAL_DISASTER'
  | 'INDUSTRIAL_ACCIDENT'
  | 'OTHER';

export type InjuryLevel = 'NONE' | 'MINOR' | 'MODERATE' | 'SEVERE' | 'CRITICAL' | 'UNKNOWN';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PriorityClassification = PriorityLevel;

export type IncidentStatus = 
  | 'REPORTED'
  | 'ANALYSING'
  | 'PRIORITIZED'
  | 'AWAITING_DISPATCH'
  | 'DISPATCHED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED';

export interface Incident {
  id: string;
  incidentNumber: string;
  emergencyType: EmergencyType;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  peopleAffected: number;
  injuryLevel: InjuryLevel;
  severity: PriorityLevel;
  priorityScore: number;
  priorityLevel: PriorityLevel;
  status: IncidentStatus;
  reportedAt: string;
  createdBy?: string;
  assignedOperator?: string;
  locationId?: string;
  assignedResourceCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncidentInput {
  emergencyType: EmergencyType;
  title: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  peopleAffected: number;
  injuryLevel: InjuryLevel;
  locationId?: string;
  reportedAt?: string;
}

export interface UpdateIncidentInput {
  title?: string;
  description?: string;
  emergencyType?: EmergencyType;
  address?: string;
  peopleAffected?: number;
  injuryLevel?: InjuryLevel;
  status?: IncidentStatus;
}

export interface IncidentUpdate {
  id: string;
  incidentId: string;
  userId?: string;
  status: IncidentStatus;
  message: string;
  createdAt: string;
}

export interface IncidentFilters {
  searchQuery?: string;
  emergencyType?: EmergencyType | 'ALL';
  priorityLevel?: PriorityLevel | 'ALL';
  status?: IncidentStatus | 'ALL';
  injuryLevel?: InjuryLevel | 'ALL';
  sortBy?: 'priority_score' | 'reported_at' | 'people_affected' | 'status' | 'emergency_type';
  sortOrder?: 'asc' | 'desc';
}

export interface PriorityBreakdown {
  score: number;
  classification: PriorityLevel;
  factors: {
    name: string;
    weight: number;
    score: number;
    contribution: number;
  }[];
  explanations: string[];
}

export const ALLOWED_STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  REPORTED: ['ANALYSING', 'CLOSED'],
  ANALYSING: ['PRIORITIZED', 'CLOSED'],
  PRIORITIZED: ['AWAITING_DISPATCH', 'CLOSED'],
  AWAITING_DISPATCH: ['DISPATCHED', 'CLOSED'],
  DISPATCHED: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

export function isValidStatusTransition(currentStatus: IncidentStatus, targetStatus: IncidentStatus): boolean {
  if (currentStatus === targetStatus) return true;
  const allowedNext = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  return allowedNext.includes(targetStatus);
}
