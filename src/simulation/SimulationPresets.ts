import { SimulationScenario } from '../types/simulation';
import { generateSimulationIncident } from './incidentGenerator';

export const SIMULATION_SCENARIOS: SimulationScenario[] = [
  {
    id: 'scenario-1-one-inc-many-res',
    name: 'Scenario 1 — One Incident, Many Resources',
    description: 'Low-load baseline test. Demonstrates rapid optimal resource selection when fleet capacity is abundant.',
    durationMinutes: 20,
    resourceConfig: { ambulances: 10, fireUnits: 5, policeUnits: 5, rescueTeams: 4 },
    events: [
      {
        simulatedTime: '10:30',
        offsetMinutes: 0,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('ROAD_ACCIDENT', 0, 2),
      },
      {
        simulatedTime: '10:35',
        offsetMinutes: 5,
        type: 'RESOLVE_INCIDENT',
        payload: { incidentId: 'sim-inc-0' },
      },
    ],
  },
  {
    id: 'scenario-2-many-inc-few-res',
    name: 'Scenario 2 — Many Incidents, Few Resources',
    description: 'High-stress fleet deficit test. Evaluates ResQAI queue management and priority prioritization under scarcity.',
    durationMinutes: 30,
    resourceConfig: { ambulances: 2, fireUnits: 1, policeUnits: 1, rescueTeams: 1 },
    events: [
      {
        simulatedTime: '10:30',
        offsetMinutes: 0,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('ROAD_ACCIDENT', 0, 3),
      },
      {
        simulatedTime: '10:32',
        offsetMinutes: 2,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('FIRE', 1, 5),
      },
      {
        simulatedTime: '10:34',
        offsetMinutes: 4,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('MEDICAL', 2, 1),
      },
      {
        simulatedTime: '10:36',
        offsetMinutes: 6,
        type: 'CREATE_CRITICAL_INCIDENT',
        payload: generateSimulationIncident('INDUSTRIAL_ACCIDENT', 3, 10),
      },
    ],
  },
  {
    id: 'scenario-3-multiple-critical',
    name: 'Scenario 3 — Multiple Critical Incidents',
    description: 'Simultaneous life-threatening catastrophes testing multi-unit priority scheduling and triage capabilities.',
    durationMinutes: 30,
    resourceConfig: { ambulances: 4, fireUnits: 3, policeUnits: 3, rescueTeams: 2 },
    events: [
      {
        simulatedTime: '10:30',
        offsetMinutes: 0,
        type: 'CREATE_CRITICAL_INCIDENT',
        payload: generateSimulationIncident('BUILDING_COLLAPSE', 0, 25),
      },
      {
        simulatedTime: '10:32',
        offsetMinutes: 2,
        type: 'CREATE_CRITICAL_INCIDENT',
        payload: generateSimulationIncident('INDUSTRIAL_ACCIDENT', 1, 18),
      },
      {
        simulatedTime: '10:35',
        offsetMinutes: 5,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('MEDICAL', 2, 2),
      },
    ],
  },
  {
    id: 'scenario-4-nearest-wrong-capability',
    name: 'Scenario 4 — Nearest Resource Has Wrong Capability',
    description: 'Demonstrates why distance-only baseline fails: nearest ambulance lacks Advanced Life Support (ALS) needed for cardiac arrest.',
    durationMinutes: 25,
    resourceConfig: { ambulances: 5, fireUnits: 2, policeUnits: 2, rescueTeams: 2 },
    events: [
      {
        simulatedTime: '10:30',
        offsetMinutes: 0,
        type: 'CREATE_CRITICAL_INCIDENT',
        payload: generateSimulationIncident('MEDICAL', 0, 1),
      },
      {
        simulatedTime: '10:33',
        offsetMinutes: 3,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('ROAD_ACCIDENT', 1, 4),
      },
    ],
  },
  {
    id: 'scenario-5-all-nearby-busy',
    name: 'Scenario 5 — All Nearby Resources Are Busy',
    description: 'Tests regional dispatch fallback and ETA balancing when immediate sector units are fully committed.',
    durationMinutes: 30,
    resourceConfig: { ambulances: 3, fireUnits: 2, policeUnits: 2, rescueTeams: 1 },
    events: [
      {
        simulatedTime: '10:30',
        offsetMinutes: 0,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('ROAD_ACCIDENT', 0, 4),
      },
      {
        simulatedTime: '10:32',
        offsetMinutes: 2,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('MEDICAL', 0, 2),
      },
      {
        simulatedTime: '10:34',
        offsetMinutes: 4,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('FIRE', 0, 6),
      },
      {
        simulatedTime: '10:38',
        offsetMinutes: 8,
        type: 'CREATE_CRITICAL_INCIDENT',
        payload: generateSimulationIncident('BUILDING_COLLAPSE', 1, 14),
      },
    ],
  },
  {
    id: 'scenario-6-new-critical-reallocation',
    name: 'Scenario 6 — New Critical Incident Arrives After Assignments',
    description: 'Intentionally creates shortage then introduces Critical Incident D. Triggers ResQAI Dynamic Reallocation with operator approval.',
    durationMinutes: 30,
    resourceConfig: { ambulances: 3, fireUnits: 2, policeUnits: 2, rescueTeams: 1 },
    events: [
      {
        simulatedTime: '10:30',
        offsetMinutes: 0,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('ROAD_ACCIDENT', 0, 2),
      },
      {
        simulatedTime: '10:32',
        offsetMinutes: 2,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('MEDICAL', 1, 1),
      },
      {
        simulatedTime: '10:34',
        offsetMinutes: 4,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('FIRE', 2, 4),
      },
      {
        simulatedTime: '10:40',
        offsetMinutes: 10,
        type: 'CREATE_CRITICAL_INCIDENT',
        payload: generateSimulationIncident('BUILDING_COLLAPSE', 3, 20),
      },
    ],
  },
  {
    id: 'scenario-7-traffic-eta-change',
    name: 'Scenario 7 — Traffic Gridlock Causes ETA Changes',
    description: 'Simulates severe traffic congestion factor (2.2x), causing baseline ETAs to blow out while ResQAI reroutes fleet.',
    durationMinutes: 30,
    resourceConfig: { ambulances: 6, fireUnits: 4, policeUnits: 4, rescueTeams: 3 },
    events: [
      {
        simulatedTime: '10:30',
        offsetMinutes: 0,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('ROAD_ACCIDENT', 4, 6),
      },
      {
        simulatedTime: '10:34',
        offsetMinutes: 4,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('FLOOD', 5, 12),
      },
      {
        simulatedTime: '10:38',
        offsetMinutes: 8,
        type: 'BLOCK_ROUTE',
        payload: { address: 'Hebbal Flyover Gridlock' },
      },
      {
        simulatedTime: '10:40',
        offsetMinutes: 10,
        type: 'CREATE_CRITICAL_INCIDENT',
        payload: generateSimulationIncident('INDUSTRIAL_ACCIDENT', 6, 15),
      },
    ],
  },
  {
    id: 'scenario-8-resource-breakdown',
    name: 'Scenario 8 — Assigned Resource Becomes Unavailable',
    description: 'Simulates active unit mechanical failure or involvement in crash. Tests automatic fallback dispatch and operator warning.',
    durationMinutes: 30,
    resourceConfig: { ambulances: 4, fireUnits: 3, policeUnits: 3, rescueTeams: 2 },
    events: [
      {
        simulatedTime: '10:30',
        offsetMinutes: 0,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('ROAD_ACCIDENT', 0, 4),
      },
      {
        simulatedTime: '10:35',
        offsetMinutes: 5,
        type: 'RESOURCE_OFFLINE',
        payload: { resourceCode: 'AMB-01' },
      },
      {
        simulatedTime: '10:38',
        offsetMinutes: 8,
        type: 'CREATE_CRITICAL_INCIDENT',
        payload: generateSimulationIncident('MEDICAL', 1, 2),
      },
    ],
  },
];
