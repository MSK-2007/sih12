export interface ReallocationExplanationInput {
  triggerIncidentNumber: string;
  triggerPriorityLevel: string;
  reassignedResourceCode: string;
  donorIncidentNumber: string;
  donorPriorityLevel: string;
  beforeEtaMinutes: number;
  afterEtaMinutes: number;
  donorBeforeEta: number;
  donorAfterEta: number;
  qualityImprovement: number;
}

/**
 * Generates natural human-readable explanation for dynamic resource reallocation recommendations.
 */
export function generateReallocationExplanation(input: ReallocationExplanationInput): string {
  return `${input.triggerIncidentNumber} is ${input.triggerPriorityLevel} and currently lacks a suitable response unit. Reassigning ${input.reassignedResourceCode} from lower-priority ${input.donorIncidentNumber} (${input.donorPriorityLevel}) reduces the critical incident ETA from ${input.beforeEtaMinutes} min to ${input.afterEtaMinutes} min (overall system quality improvement +${input.qualityImprovement} pts).`;
}
