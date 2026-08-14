import { Incident } from '../types/incident';
import { Resource, ResourceType } from '../types/resource';
import { RouteResult } from '../types/map';
import {
  DEFAULT_ALLOCATION_WEIGHTS,
  AllocationWeights,
  CapabilityMatchLevel,
  CAPABILITY_MATCH_SCORES,
  PRIORITY_COMPATIBILITY_SCORES,
  INCIDENT_PREFERRED_CAPABILITIES,
  getEtaScore,
  getDistanceScore,
} from './allocationConfig';
import { determineRequiredResourceUnits, RequiredResourceItem } from './resourceRequirements';
import { generateAllocationExplanation } from './allocationExplanation';

export interface AllocationFactorScores {
  capability: number;           // 0-100
  eta: number;                  // 0-100
  distance: number;             // 0-100
  availability: number;         // 0-100
  workload: number;             // 0-100
  priorityCompatibility: number;// 0-100
}

export interface AllocationRecommendation {
  rank: number;
  resourceId: string;
  resourceCode: string;
  resourceType: ResourceType;
  allocationScore: number;      // 0-100
  etaMinutes: number;
  distanceKm: number;
  capabilityMatch: CapabilityMatchLevel;
  factorScores: AllocationFactorScores;
  explanation: string;
  routeProvider?: string;
  routeGeometry?: [number, number][];
}

export type AllocationAnalysisStatus =
  | 'NO_RESOURCES_AVAILABLE'
  | 'RECOMMENDATION_READY'
  | 'PARTIAL_RECOMMENDATION'
  | 'READY_FOR_OPERATOR_REVIEW';

export interface AllocationAnalysis {
  incidentId: string;
  requiredResources: RequiredResourceItem[];
  recommendations: AllocationRecommendation[];
  status: AllocationAnalysisStatus;
  summaryMessage: string;
  calculatedAt: string;
  engineVersion: string;
}

/**
 * Evaluates capability match between resource capabilities and preferred incident capabilities.
 */
export function evaluateCapabilityMatch(
  resourceCaps: string[],
  preferredCaps: string[]
): CapabilityMatchLevel {
  if (!preferredCaps || preferredCaps.length === 0) return 'GOOD_MATCH';
  if (!resourceCaps || resourceCaps.length === 0) return 'PARTIAL_MATCH';

  const matches = resourceCaps.filter((cap) =>
    preferredCaps.some((pref) => pref.toUpperCase() === cap.toUpperCase())
  );

  if (matches.length >= 2 || matches.length === preferredCaps.length) {
    return 'EXACT_MATCH';
  }
  if (matches.length === 1) {
    return 'GOOD_MATCH';
  }
  return 'PARTIAL_MATCH';
}

export interface CandidateRouteData {
  resource: Resource;
  route: RouteResult;
}

export class ResourceAllocationEngine {
  public readonly version = '1.0.0-WEIGHTED_SUITABILITY';

  /**
   * Ranks eligible resource candidates for an incident using weighted suitability scoring.
   */
  public analyzeAllocation(
    incident: Incident,
    candidates: CandidateRouteData[],
    weights: AllocationWeights = DEFAULT_ALLOCATION_WEIGHTS
  ): AllocationAnalysis {
    const requiredResources = determineRequiredResourceUnits(
      incident.emergencyType,
      incident.priorityLevel,
      incident.peopleAffected
    );

    const preferredCaps = INCIDENT_PREFERRED_CAPABILITIES[incident.emergencyType] || [];
    const recommendations: AllocationRecommendation[] = [];

    // Filter candidate resources: must be active, AVAILABLE, matching required types
    for (const cand of candidates) {
      const { resource, route } = cand;

      // Business Rule 1: Eligibility check
      if (!resource.isActive || resource.status !== 'AVAILABLE') {
        continue; // Exclude non-available or inactive units
      }

      const capabilityMatch = evaluateCapabilityMatch(
        resource.capability || resource.capabilities || [],
        preferredCaps
      );

      // Factor scores
      const capabilityScore = CAPABILITY_MATCH_SCORES[capabilityMatch];
      const etaScore = getEtaScore(route.durationMinutes);
      const distanceScore = getDistanceScore(route.distanceKm);
      const availabilityScore = resource.status === 'AVAILABLE' ? 100 : 0;
      const workloadScore = 100; // 0 active workload for AVAILABLE units
      const priorityCompatibilityScore = PRIORITY_COMPATIBILITY_SCORES[incident.priorityLevel] ?? 65;

      const factorScores: AllocationFactorScores = {
        capability: capabilityScore,
        eta: etaScore,
        distance: distanceScore,
        availability: availabilityScore,
        workload: workloadScore,
        priorityCompatibility: priorityCompatibilityScore,
      };

      // Weighted Suitability Score calculation
      const rawScore =
        capabilityScore * weights.capability +
        etaScore * weights.eta +
        distanceScore * weights.distance +
        availabilityScore * weights.availability +
        workloadScore * weights.workload +
        priorityCompatibilityScore * weights.priorityCompatibility;

      const allocationScore = Math.min(100, Math.max(0, Math.round(rawScore)));

      const explanation = generateAllocationExplanation({
        resourceCode: resource.resourceCode,
        resourceType: resource.resourceType || resource.type || 'AMBULANCE',
        capabilityMatch,
        etaMinutes: route.durationMinutes,
        distanceKm: route.distanceKm,
        allocationScore,
      });

      recommendations.push({
        rank: 0, // Assigned after sorting
        resourceId: resource.id,
        resourceCode: resource.resourceCode,
        resourceType: resource.resourceType || resource.type || 'AMBULANCE',
        allocationScore,
        etaMinutes: route.durationMinutes,
        distanceKm: route.distanceKm,
        capabilityMatch,
        factorScores,
        explanation,
        routeProvider: route.provider,
        routeGeometry: route.geometry,
      });
    }

    // Sort recommendations: highest allocation score, lower ETA, better capability match, lower distance
    recommendations.sort((a, b) => {
      if (b.allocationScore !== a.allocationScore) return b.allocationScore - a.allocationScore;
      if (a.etaMinutes !== b.etaMinutes) return a.etaMinutes - b.etaMinutes;
      return a.distanceKm - b.distanceKm;
    });

    // Assign 1-based ranks
    recommendations.forEach((rec, idx) => {
      rec.rank = idx + 1;
    });

    // Determine status & summary
    let status: AllocationAnalysisStatus = 'RECOMMENDATION_READY';
    let summaryMessage = '';

    if (recommendations.length === 0) {
      status = 'NO_RESOURCES_AVAILABLE';
      summaryMessage = 'No suitable available resources were found in the operational fleet pool.';
    } else {
      const requiredTotalUnits = requiredResources.reduce((acc, r) => acc + r.quantity, 0);
      if (recommendations.length < requiredTotalUnits) {
        status = 'PARTIAL_RECOMMENDATION';
        summaryMessage = `Found ${recommendations.length} of ${requiredTotalUnits} required response units. Additional units required.`;
      } else {
        status = 'READY_FOR_OPERATOR_REVIEW';
        summaryMessage = `Ranked ${recommendations.length} suitable candidate resource unit(s) ready for operator review and confirmation.`;
      }
    }

    return {
      incidentId: incident.id,
      requiredResources,
      recommendations,
      status,
      summaryMessage,
      calculatedAt: new Date().toISOString(),
      engineVersion: this.version,
    };
  }
}

export const allocationEngine = new ResourceAllocationEngine();
