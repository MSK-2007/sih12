export type AssignmentStatus = 
  | 'RECOMMENDED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'DISPATCHED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ResourceAssignment {
  id: string;
  incidentId: string;
  resourceId: string;
  assignmentStatus: AssignmentStatus;
  recommendedAt: string;
  acceptedAt?: string;
  dispatchedAt?: string;
  startedAt?: string;
  completedAt?: string;
  distanceKm?: number;
  estimatedResponseMinutes?: number;
  allocationScore?: number;
  recommendationReason?: string;
  assignedBy?: string;
  createdAt: string;
  updatedAt: string;
}
