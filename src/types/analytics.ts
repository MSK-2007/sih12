import { PriorityLevel, EmergencyType, IncidentStatus } from './incident';
import { ResourceType } from './resource';

// ─── Filter ────────────────────────────────────────────────────────────────

export type DateRangePreset = 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'SIMULATION_RUN' | 'CUSTOM';

export interface AnalyticsFilter {
  preset: DateRangePreset;
  from?: string;   // ISO date string
  to?: string;     // ISO date string
  simulationRunId?: string;
  priority?: PriorityLevel | 'ALL';
  incidentType?: EmergencyType | 'ALL';
  resourceType?: ResourceType | 'ALL';
}

// ─── Overview ──────────────────────────────────────────────────────────────

export interface OverviewMetrics {
  totalIncidents: number;
  criticalIncidents: number;
  highIncidents: number;
  /** Average minutes from incident.createdAt to first dispatched assignment */
  avgResponseMinutes: number | null;
  /** assignment-based: assignedCount / totalActiveCount × 100 */
  resourceUtilizationPercent: number | null;
  /** successful reallocations / approved reallocations × 100 */
  reallocationSuccessRate: number | null;
  unassignedIncidents: number;
  resolvedIncidents: number;
  totalResources: number;
}

// ─── Response ──────────────────────────────────────────────────────────────

export interface ResponseByPriority {
  priority: PriorityLevel;
  avgMinutes: number | null;
  count: number;
  /** Prototype target minutes */
  targetMinutes: number;
  /** incidents within target / eligible incidents */
  compliancePercent: number | null;
}

export interface ResponseMetrics {
  avgResponseMinutes: number | null;
  medianResponseMinutes: number | null;
  fastestResponseMinutes: number | null;
  slowestResponseMinutes: number | null;
  byPriority: ResponseByPriority[];
  /** {label: string (e.g. "10:30"), avgMinutes: number}[] — for trend chart */
  trend: { label: string; avgMinutes: number }[];
  insufficientData: boolean;
}

// ─── Resources ─────────────────────────────────────────────────────────────

export interface ResourceTypeBreakdown {
  resourceType: ResourceType;
  label: string;
  total: number;
  available: number;
  assigned: number;
  busy: number;
  offline: number;
  utilizationPercent: number | null;
}

export interface ResourceMetrics {
  total: number;
  available: number;
  assigned: number;
  busy: number;
  offline: number;
  overallUtilizationPercent: number | null;
  byType: ResourceTypeBreakdown[];
}

// ─── Allocation ────────────────────────────────────────────────────────────

export interface AllocationMetrics {
  /** incidents with at least one ACCEPTED/DISPATCHED assignment / total incidents */
  successRatePercent: number | null;
  avgAllocationScore: number | null;
  highestAllocationScore: number | null;
  lowestAllocationScore: number | null;
  avgEtaMinutes: number | null;
  /** assignments matching resource type / total assignments */
  capabilityMatchRatePercent: number | null;
  unassignedCount: number;
}

// ─── Reallocation ──────────────────────────────────────────────────────────

export interface ReallocationMetrics {
  totalRecommendations: number;
  approved: number;
  rejected: number;
  /** Expired means recommendation age > 5 min with no action */
  expired: number;
  /** approved that improved system quality (allocationScore improved) */
  successful: number;
  failed: number;
  successRatePercent: number | null;
  avgQualityImprovementPoints: number | null;
  avgEtaBefore: number | null;
  avgEtaAfter: number | null;
  etaImprovementPercent: number | null;
}

// ─── Incidents ─────────────────────────────────────────────────────────────

export interface IncidentTypeBreakdown {
  type: EmergencyType;
  label: string;
  count: number;
  percent: number;
}

export interface IncidentStatusBreakdown {
  status: IncidentStatus;
  count: number;
  percent: number;
}

export interface IncidentMetrics {
  total: number;
  byType: IncidentTypeBreakdown[];
  byPriority: { priority: PriorityLevel; count: number; percent: number }[];
  byStatus: IncidentStatusBreakdown[];
  resolutionRatePercent: number | null;
  avgResolutionMinutes: number | null;
  avgWaitMinutes: number | null;
  criticalWaitMinutes: number | null;
  longestWaitMinutes: number | null;
  unassignedCount: number;
  criticalUnassignedCount: number;
}

// ─── Baseline Comparison ───────────────────────────────────────────────────

export interface BaselineComparisonRow {
  metric: string;
  unit: string;
  baseline: number | null;
  resqai: number | null;
  /** positive = ResQAI is better */
  improvementPercent: number | null;
  /** true if lower is better */
  lowerIsBetter: boolean;
}

export interface BaselineComparison {
  rows: BaselineComparisonRow[];
  /** Auto-generated from actual data, never hardcoded */
  impactSummary: string;
  hasEnoughData: boolean;
}

// ─── Simulation Analytics ──────────────────────────────────────────────────

export interface SimulationRunSummary {
  runId: string;
  scenarioName: string;
  totalEvents: number;
  completedEvents: number;
  totalIncidents: number;
  criticalIncidents: number;
  resolvedIncidents: number;
  avgEtaMinutes: number | null;
  resourceUtilizationPercent: number | null;
  reallocationCount: number;
  unassignedCount: number;
}

export interface SimulationAnalytics {
  currentRun: SimulationRunSummary | null;
  hasData: boolean;
}
