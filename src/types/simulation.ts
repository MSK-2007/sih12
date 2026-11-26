import { EmergencyType, InjuryLevel } from './incident';
import { ResourceType } from './resource';

export type SimulationRunStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'STOPPED' | 'FAILED';

export type SimulationMode = 'AUTOMATIC' | 'MANUAL' | 'STEP';

export type SimulationEventType =
  | 'CREATE_INCIDENT'
  | 'UPDATE_INCIDENT'
  | 'ESCALATE_INCIDENT'
  | 'RESOURCE_OFFLINE'
  | 'RESOURCE_AVAILABLE'
  | 'RESOURCE_LOCATION_UPDATE'
  | 'ASSIGN_RESOURCE'
  | 'ARRIVE_ON_SCENE'
  | 'RESOLVE_INCIDENT'
  | 'BLOCK_ROUTE'
  | 'UNBLOCK_ROUTE'
  | 'CREATE_CRITICAL_INCIDENT'
  | 'ENVIRONMENTAL_EVENT_DETECTED'
  | 'AI_ANALYSIS_COMPLETED'
  | 'PRIORITY_RECALCULATED'
  | 'RESOURCE_CONFLICT_DETECTED'
  | 'REALLOCATION_RECOMMENDED'
  | 'OPERATOR_ACCEPTED'
  | 'OPERATOR_REJECTED';

export type SimulationEventStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface SimulationEventPayload {
  emergencyType?: EmergencyType;
  title?: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  peopleAffected?: number;
  injuryLevel?: InjuryLevel;
  resourceCode?: string;
  resourceType?: ResourceType;
  incidentId?: string;
  resourceId?: string;
  waitingMinutes?: number;
}

export interface SimulationEvent {
  id: string;
  simulationRunId?: string;
  simulatedTime: string; // e.g., "10:30"
  offsetMinutes: number;
  type: SimulationEventType;
  payload: SimulationEventPayload;
  status: SimulationEventStatus;
  processedAt?: string;
  error?: string;
}

export interface ResourceSeedConfig {
  ambulances: number;
  fireUnits: number;
  policeUnits: number;
  rescueTeams: number;
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  resourceConfig: ResourceSeedConfig;
  events: Omit<SimulationEvent, 'id' | 'status'>[];
}

export interface SimulationMetrics {
  activeIncidentsCount: number;
  criticalIncidentsCount: number;
  availableResourcesCount: number;
  assignedResourcesCount: number;
  unassignedIncidentsCount: number;
  averageEtaMinutes: number;
  resourceUtilizationPercent: number;
  reallocationCount: number;
  resolvedIncidentsCount: number;
  baselineEtaMinutes?: number;
  optimizationImprovementPercent?: number;
}

export interface SimulationRun {
  id: string;
  scenarioId: string;
  name: string;
  status: SimulationRunStatus;
  mode: SimulationMode;
  speedMultiplier: number; // 1x, 2x, 5x, 10x
  currentTime: string;
  startTime: string;
  elapsedSeconds: number;
  incidentIds: string[];
  resourceIds: string[];
  events: SimulationEvent[];
  metrics: SimulationMetrics;
  createdAt: string;
}
