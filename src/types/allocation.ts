import { Resource } from './resource';
import { Incident } from './incident';

export type AssignmentStatus = 
  | 'RECOMMENDED'
  | 'DISPATCHED'
  | 'EN_ROUTE'
  | 'ON_SCENE'
  | 'REALLOCATED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ResourceCandidate {
  resource: Resource;
  allocationScore: number;
  etaMinutes: number;
  distanceKm: number;
  capabilityFit: boolean;
  reasons: string[];
}

export interface AllocationRecommendation {
  incidentId: string;
  recommendedResource: Resource;
  allocationScore: number;
  etaMinutes: number;
  distanceKm: number;
  explanation: string[];
  alternativeCandidates: ResourceCandidate[];
}

export interface ReallocationProposal {
  id: string;
  preemptedResource: Resource;
  fromIncident: Incident;
  toIncident: Incident;
  currentAssignmentEta: number;
  newAssignmentEta: number;
  netUrgencyGain: number;
  rationale: string[];
  proposedAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export interface ResourceAssignment {
  id: string;
  incidentId: string;
  resourceId: string;
  assignedBy?: string;
  status: AssignmentStatus;
  allocationScore?: number;
  estimatedEtaMinutes?: number;
  distanceKm?: number;
  rationale?: Record<string, unknown>;
  isReallocation: boolean;
  reallocatedFromIncidentId?: string;
  assignedAt: string;
  completedAt?: string;
}
