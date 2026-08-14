import { Incident, PriorityLevel } from '../types/incident';
import { Resource } from '../types/resource';
import { RouteResult } from '../types/map';
import {
  PROTECTION_LEVEL_MAPPINGS,
  PROTECTION_PENALTIES,
  DEFAULT_REALLOCATION_CONFIG,
  ReallocationConfig,
  AllocationProtectionLevel,
} from './reallocationConfig';
import { generateReallocationExplanation } from './reallocationExplanation';

export interface AssignmentSnapshot {
  resourceId: string;
  resourceCode: string;
  incidentId: string;
  incidentNumber: string;
  priorityLevel: PriorityLevel;
  priorityScore: number;
  etaMinutes: number;
  distanceKm: number;
  protectionLevel: AllocationProtectionLevel;
}

export interface SystemQualitySnapshot {
  score: number; // 0-100 system-wide operational efficiency
  unservedCriticalCount: number;
  unservedHighCount: number;
  averageEtaMinutes: number;
  activeAssignmentsCount: number;
}

export interface ReallocationAssignmentItem {
  resourceId: string;
  resourceCode: string;
  incidentId: string;
  incidentNumber: string;
  priorityLevel: PriorityLevel;
  etaMinutes: number;
  distanceKm: number;
  isReassigned?: boolean;
}

export type ReallocationResultStatus =
  | 'NO_REALLOCATION_REQUIRED'
  | 'REALLOCATION_RECOMMENDED'
  | 'NO_FEASIBLE_REALLOCATION'
  | 'PARTIAL_REALLOCATION';

export interface ReallocationRecommendation {
  id: string;
  triggerIncidentId: string;
  triggerIncidentNumber: string;
  triggerPriorityLevel: PriorityLevel;
  status: ReallocationResultStatus;
  currentAllocation: ReallocationAssignmentItem[];
  proposedAllocation: ReallocationAssignmentItem[];
  currentQuality: number;
  proposedQuality: number;
  improvement: number;
  affectedIncidents: { incidentId: string; incidentNumber: string; oldEta: number; newEta: number }[];
  affectedResources: { resourceId: string; resourceCode: string; fromIncidentId: string; toIncidentId: string }[];
  explanation: string;
  summaryMessage: string;
  createdAt: string;
  engineVersion: string;
}

export interface ConflictDetectionResult {
  hasConflict: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedIncidents: string[];
  affectedResources: string[];
  reason: string;
}

export interface CandidateResourceRoute {
  resource: Resource;
  route: RouteResult;
  currentAssignment?: AssignmentSnapshot;
}

export interface ReallocationEngineInterface {
  detectConflict(
    incidents: Incident[],
    resources: Resource[],
    assignments: AssignmentSnapshot[]
  ): ConflictDetectionResult;

  analyzeReallocation(
    triggerIncident: Incident,
    activeIncidents: Incident[],
    _allResources: Resource[],
    currentAssignments: AssignmentSnapshot[],
    candidateRoutes: CandidateResourceRoute[],
    config?: ReallocationConfig
  ): ReallocationRecommendation;
}

/**
 * Dynamic Resource Reallocation Engine for ResQAI Platform.
 * Evaluates global system quality, protection levels, and Pareto response efficiency.
 */
export class DynamicReallocationEngine implements ReallocationEngineInterface {
  public readonly version = '1.0.0-DYNAMIC_PARETO';

  /**
   * Detects allocation conflicts across active emergency incidents.
   */
  public detectConflict(
    incidents: Incident[],
    resources: Resource[],
    assignments: AssignmentSnapshot[]
  ): ConflictDetectionResult {
    const activeUnassigned = incidents.filter(
      (i) =>
        i.status !== 'RESOLVED' &&
        i.status !== 'CLOSED' &&
        !assignments.some((a) => a.incidentId === i.id)
    );

    const criticalUnassigned = activeUnassigned.filter((i) => i.priorityLevel === 'CRITICAL');
    const availableResources = resources.filter((r) => r.isActive && r.status === 'AVAILABLE');

    if (criticalUnassigned.length > 0 && availableResources.length === 0) {
      return {
        hasConflict: true,
        severity: 'CRITICAL',
        affectedIncidents: criticalUnassigned.map((i) => i.incidentNumber),
        affectedResources: [],
        reason: `${criticalUnassigned.length} CRITICAL emergency incident(s) require immediate dispatch but zero AVAILABLE response units remain in the pool.`,
      };
    }

    if (activeUnassigned.length > availableResources.length) {
      return {
        hasConflict: true,
        severity: 'HIGH',
        affectedIncidents: activeUnassigned.map((i) => i.incidentNumber),
        affectedResources: [],
        reason: `Operational demand (${activeUnassigned.length} pending incidents) exceeds available unassigned fleet capacity (${availableResources.length} units).`,
      };
    }

    return {
      hasConflict: false,
      severity: 'LOW',
      affectedIncidents: [],
      affectedResources: [],
      reason: 'Fleet allocation is currently stable and balanced.',
    };
  }

  /**
   * Calculates global system quality score (0-100).
   */
  public calculateSystemQuality(
    incidents: Incident[],
    assignments: ReallocationAssignmentItem[]
  ): SystemQualitySnapshot {
    let score = 100;
    let unservedCritical = 0;
    let unservedHigh = 0;
    let totalEta = 0;
    let servedCount = 0;

    for (const incident of incidents) {
      if (incident.status === 'RESOLVED' || incident.status === 'CLOSED') continue;

      const asgn = assignments.find((a) => a.incidentId === incident.id);
      if (asgn) {
        servedCount++;
        totalEta += asgn.etaMinutes;
        // Small penalty for higher ETAs
        if (asgn.etaMinutes > 15) score -= 5;
        if (asgn.etaMinutes > 25) score -= 10;
      } else {
        // Heavy penalty for unserved emergencies based on priority
        if (incident.priorityLevel === 'CRITICAL') {
          unservedCritical++;
          score -= 35;
        } else if (incident.priorityLevel === 'HIGH') {
          unservedHigh++;
          score -= 20;
        } else if (incident.priorityLevel === 'MEDIUM') {
          score -= 10;
        } else {
          score -= 5;
        }
      }
    }

    const avgEta = servedCount > 0 ? Math.round(totalEta / servedCount) : 0;
    const finalScore = Math.min(100, Math.max(0, Math.round(score)));

    return {
      score: finalScore,
      unservedCriticalCount: unservedCritical,
      unservedHighCount: unservedHigh,
      averageEtaMinutes: avgEta,
      activeAssignmentsCount: servedCount,
    };
  }

  /**
   * Analyzes dynamic reallocation options comparing Current System Quality vs Proposed System Quality.
   */
  public analyzeReallocation(
    triggerIncident: Incident,
    activeIncidents: Incident[],
    _allResources: Resource[],
    currentAssignments: AssignmentSnapshot[],
    candidateRoutes: CandidateResourceRoute[],
    config: ReallocationConfig = DEFAULT_REALLOCATION_CONFIG
  ): ReallocationRecommendation {
    const nowISO = new Date().toISOString();
    const id = `realloc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Build Current Allocation State Items
    const currentAllocationItems: ReallocationAssignmentItem[] = currentAssignments.map((a) => ({
      resourceId: a.resourceId,
      resourceCode: a.resourceCode,
      incidentId: a.incidentId,
      incidentNumber: a.incidentNumber,
      priorityLevel: a.priorityLevel,
      etaMinutes: a.etaMinutes,
      distanceKm: a.distanceKm,
    }));

    const currentQualitySnap = this.calculateSystemQuality(activeIncidents, currentAllocationItems);

    // Check if an available resource can directly fulfill the trigger incident
    const freeCandidates = candidateRoutes.filter(
      (c) => c.resource.isActive && c.resource.status === 'AVAILABLE'
    );

    if (freeCandidates.length > 0) {
      // Sort free candidates by ETA
      freeCandidates.sort((a, b) => a.route.durationMinutes - b.route.durationMinutes);
      const bestFree = freeCandidates[0];

      const proposedAllocationItems: ReallocationAssignmentItem[] = [
        ...currentAllocationItems,
        {
          resourceId: bestFree.resource.id,
          resourceCode: bestFree.resource.resourceCode,
          incidentId: triggerIncident.id,
          incidentNumber: triggerIncident.incidentNumber,
          priorityLevel: triggerIncident.priorityLevel,
          etaMinutes: bestFree.route.durationMinutes,
          distanceKm: bestFree.route.distanceKm,
          isReassigned: false,
        },
      ];

      const proposedQualitySnap = this.calculateSystemQuality(activeIncidents, proposedAllocationItems);

      return {
        id,
        triggerIncidentId: triggerIncident.id,
        triggerIncidentNumber: triggerIncident.incidentNumber,
        triggerPriorityLevel: triggerIncident.priorityLevel,
        status: 'NO_REALLOCATION_REQUIRED',
        currentAllocation: currentAllocationItems,
        proposedAllocation: proposedAllocationItems,
        currentQuality: currentQualitySnap.score,
        proposedQuality: proposedQualitySnap.score,
        improvement: Math.max(0, proposedQualitySnap.score - currentQualitySnap.score),
        affectedIncidents: [],
        affectedResources: [],
        explanation: `Available unit ${bestFree.resource.resourceCode} is unassigned and can respond directly to ${triggerIncident.incidentNumber} within ${bestFree.route.durationMinutes} min without reassigning active dispatches.`,
        summaryMessage: `No dynamic reassignment required. Unit ${bestFree.resource.resourceCode} is available for direct dispatch.`,
        createdAt: nowISO,
        engineVersion: this.version,
      };
    }

    // No free resources available: Evaluate reassigning an assigned resource from a lower-priority incident
    const reassignableCandidates = candidateRoutes.filter((c) => {
      if (!c.currentAssignment) return false;
      const donorPriority = c.currentAssignment.priorityLevel;
      const protection = PROTECTION_LEVEL_MAPPINGS[donorPriority];
      // Do not reassign from PROTECTED (CRITICAL) incidents unless trigger is CRITICAL and donor is LOW/MEDIUM
      if (protection === 'PROTECTED') return false;
      return true;
    });

    if (reassignableCandidates.length === 0) {
      return {
        id,
        triggerIncidentId: triggerIncident.id,
        triggerIncidentNumber: triggerIncident.incidentNumber,
        triggerPriorityLevel: triggerIncident.priorityLevel,
        status: 'NO_FEASIBLE_REALLOCATION',
        currentAllocation: currentAllocationItems,
        proposedAllocation: currentAllocationItems,
        currentQuality: currentQualitySnap.score,
        proposedQuality: currentQualitySnap.score,
        improvement: 0,
        affectedIncidents: [],
        affectedResources: [],
        explanation: `No feasible dynamic reallocation identified. All active response units are committed to protected high-priority emergencies or out of range. Additional fleet units required.`,
        summaryMessage: `No feasible reassignment available. All active units are protected.`,
        createdAt: nowISO,
        engineVersion: this.version,
      };
    }

    // Find best reassignment candidate that maximizes system quality improvement
    let bestProposedItems: ReallocationAssignmentItem[] | null = null;
    let bestQualityScore = currentQualitySnap.score;
    let bestCandidate: CandidateResourceRoute | null = null;

    for (const cand of reassignableCandidates) {
      if (!cand.currentAssignment) continue;
      const donorAssignment = cand.currentAssignment;

      // Create proposed allocation by shifting candidate resource to trigger incident
      const proposedItems: ReallocationAssignmentItem[] = currentAllocationItems
        .filter((item) => item.resourceId !== cand.resource.id)
        .concat([
          {
            resourceId: cand.resource.id,
            resourceCode: cand.resource.resourceCode,
            incidentId: triggerIncident.id,
            incidentNumber: triggerIncident.incidentNumber,
            priorityLevel: triggerIncident.priorityLevel,
            etaMinutes: cand.route.durationMinutes,
            distanceKm: cand.route.distanceKm,
            isReassigned: true,
          },
        ]);

      const proposedQualitySnap = this.calculateSystemQuality(activeIncidents, proposedItems);

      // Apply protection penalty
      const protectionPenalty = PROTECTION_PENALTIES[donorAssignment.protectionLevel];
      const netScore = proposedQualitySnap.score - Math.round(protectionPenalty * 0.1);

      if (netScore > bestQualityScore + config.minImprovementThreshold) {
        bestQualityScore = netScore;
        bestProposedItems = proposedItems;
        bestCandidate = cand;
      }
    }

    if (!bestCandidate || !bestProposedItems) {
      return {
        id,
        triggerIncidentId: triggerIncident.id,
        triggerIncidentNumber: triggerIncident.incidentNumber,
        triggerPriorityLevel: triggerIncident.priorityLevel,
        status: 'NO_FEASIBLE_REALLOCATION',
        currentAllocation: currentAllocationItems,
        proposedAllocation: currentAllocationItems,
        currentQuality: currentQualitySnap.score,
        proposedQuality: currentQualitySnap.score,
        improvement: 0,
        affectedIncidents: [],
        affectedResources: [],
        explanation: `Evaluated ${reassignableCandidates.length} candidate reassignments, but none produced a net system quality improvement above the required threshold (+${config.minImprovementThreshold} pts).`,
        summaryMessage: `Reallocation rejected: insufficient overall system response improvement.`,
        createdAt: nowISO,
        engineVersion: this.version,
      };
    }

    const donor = bestCandidate.currentAssignment!;
    const proposedQualitySnap = this.calculateSystemQuality(activeIncidents, bestProposedItems);
    const improvement = Math.max(0, proposedQualitySnap.score - currentQualitySnap.score);

    const explanation = generateReallocationExplanation({
      triggerIncidentNumber: triggerIncident.incidentNumber,
      triggerPriorityLevel: triggerIncident.priorityLevel,
      reassignedResourceCode: bestCandidate.resource.resourceCode,
      donorIncidentNumber: donor.incidentNumber,
      donorPriorityLevel: donor.priorityLevel,
      beforeEtaMinutes: 15, // estimated unserved ETA
      afterEtaMinutes: bestCandidate.route.durationMinutes,
      donorBeforeEta: donor.etaMinutes,
      donorAfterEta: 0,
      qualityImprovement: improvement,
    });

    return {
      id,
      triggerIncidentId: triggerIncident.id,
      triggerIncidentNumber: triggerIncident.incidentNumber,
      triggerPriorityLevel: triggerIncident.priorityLevel,
      status: 'REALLOCATION_RECOMMENDED',
      currentAllocation: currentAllocationItems,
      proposedAllocation: bestProposedItems,
      currentQuality: currentQualitySnap.score,
      proposedQuality: proposedQualitySnap.score,
      improvement,
      affectedIncidents: [
        {
          incidentId: triggerIncident.id,
          incidentNumber: triggerIncident.incidentNumber,
          oldEta: 99,
          newEta: bestCandidate.route.durationMinutes,
        },
        {
          incidentId: donor.incidentId,
          incidentNumber: donor.incidentNumber,
          oldEta: donor.etaMinutes,
          newEta: 0, // unassigned
        },
      ],
      affectedResources: [
        {
          resourceId: bestCandidate.resource.id,
          resourceCode: bestCandidate.resource.resourceCode,
          fromIncidentId: donor.incidentId,
          toIncidentId: triggerIncident.id,
        },
      ],
      explanation,
      summaryMessage: `Dynamic reallocation recommended: Reassign ${bestCandidate.resource.resourceCode} from ${donor.incidentNumber} to ${triggerIncident.incidentNumber} (+${improvement} pts system quality gain).`,
      createdAt: nowISO,
      engineVersion: this.version,
    };
  }
}

export const reallocationEngine = new DynamicReallocationEngine();
