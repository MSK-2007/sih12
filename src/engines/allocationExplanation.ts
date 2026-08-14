import { CapabilityMatchLevel } from './allocationConfig';

export interface ExplanationInput {
  resourceCode: string;
  resourceType: string;
  capabilityMatch: CapabilityMatchLevel;
  etaMinutes: number;
  distanceKm: number;
  allocationScore: number;
}

/**
 * Generates natural human-readable explanation for why a resource received its recommendation score.
 */
export function generateAllocationExplanation(input: ExplanationInput): string {
  const matchDesc =
    input.capabilityMatch === 'EXACT_MATCH'
      ? 'exact capability match'
      : input.capabilityMatch === 'GOOD_MATCH'
      ? 'strong capability match'
      : input.capabilityMatch === 'PARTIAL_MATCH'
      ? 'partial capability match'
      : 'basic compatibility';

  return `${input.resourceCode} is recommended because it provides ${matchDesc}, is currently available, and has a short response ETA of ${input.etaMinutes} min (${input.distanceKm} km).`;
}
