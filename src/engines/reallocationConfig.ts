import { PriorityLevel } from '../types/incident';

export type AllocationProtectionLevel = 'PROTECTED' | 'HIGH' | 'NORMAL' | 'REASSIGNABLE';

export const PROTECTION_LEVEL_MAPPINGS: Record<PriorityLevel, AllocationProtectionLevel> = {
  CRITICAL: 'PROTECTED',
  HIGH: 'HIGH',
  MEDIUM: 'NORMAL',
  LOW: 'REASSIGNABLE',
};

/**
 * Minimum system quality improvement (points) required to justify dynamic reallocation.
 */
export const MIN_REALLOCATION_IMPROVEMENT = 5;

/**
 * Protection penalty added to reallocation cost if attempting to reassign from a protected incident.
 */
export const PROTECTION_PENALTIES: Record<AllocationProtectionLevel, number> = {
  PROTECTED: 100, // Exclude or severely penalize reassigning from CRITICAL
  HIGH: 45,       // High penalty
  NORMAL: 20,     // Moderate penalty
  REASSIGNABLE: 0, // No penalty for LOW priority incidents
};

export interface ReallocationConfig {
  minImprovementThreshold: number;
  maxEtaAcceptableMinutes: number;
  reassignmentDisturbanceCost: number;
}

export const DEFAULT_REALLOCATION_CONFIG: ReallocationConfig = {
  minImprovementThreshold: MIN_REALLOCATION_IMPROVEMENT,
  maxEtaAcceptableMinutes: 25,
  reassignmentDisturbanceCost: 15,
};
