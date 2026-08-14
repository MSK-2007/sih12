import { SimulationScenario } from '../types/simulation';
import { generateSimulationIncident } from './incidentGenerator';

export const SIMULATION_SCENARIOS: SimulationScenario[] = [
  {
    id: 'normal-day',
    name: 'Scenario 1 — Normal Day',
    description: 'Routine emergency activity with adequate fleet capacity. Demonstrates standard dispatch without reallocation bottlenecks.',
    durationMinutes: 30,
    resourceConfig: { ambulances: 6, fireUnits: 4, policeUnits: 4, rescueTeams: 3 },
    events: [
      {
        simulatedTime: '10:30',
        offsetMinutes: 0,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('ROAD_ACCIDENT', 0, 2),
      },
      {
        simulatedTime: '10:34',
        offsetMinutes: 4,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('MEDICAL', 2, 1),
      },
      {
        simulatedTime: '10:40',
        offsetMinutes: 10,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('ROAD_ACCIDENT', 3, 1),
      },
      {
        simulatedTime: '10:48',
        offsetMinutes: 18,
        type: 'RESOLVE_INCIDENT',
        payload: { incidentId: 'sim-inc-0' },
      },
    ],
  },
  {
    id: 'urban-surge',
    name: 'Scenario 2 — Urban Emergency Surge',
    description: 'Rapid influx of simultaneous multi-category emergencies. Demonstrates constraint management, priority escalation, dynamic reallocation, and realtime operator alerting.',
    durationMinutes: 30,
    resourceConfig: { ambulances: 4, fireUnits: 3, policeUnits: 3, rescueTeams: 2 },
    events: [
      {
        simulatedTime: '10:30',
        offsetMinutes: 0,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('ROAD_ACCIDENT', 1, 4),
      },
      {
        simulatedTime: '10:32',
        offsetMinutes: 2,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('FIRE', 2, 8),
      },
      {
        simulatedTime: '10:35',
        offsetMinutes: 5,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('MEDICAL', 3, 3),
      },
      {
        simulatedTime: '10:38',
        offsetMinutes: 8,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('FLOOD', 4, 15),
      },
      {
        simulatedTime: '10:40',
        offsetMinutes: 10,
        type: 'CREATE_CRITICAL_INCIDENT',
        payload: generateSimulationIncident('BUILDING_COLLAPSE', 0, 18),
      },
      {
        simulatedTime: '10:43',
        offsetMinutes: 13,
        type: 'RESOURCE_OFFLINE',
        payload: { resourceCode: 'AMB-02' },
      },
      {
        simulatedTime: '10:50',
        offsetMinutes: 20,
        type: 'RESOLVE_INCIDENT',
        payload: { incidentId: 'sim-inc-1' },
      },
    ],
  },
  {
    id: 'mass-casualty',
    name: 'Scenario 3 — Mass Casualty Event',
    description: 'Major structural catastrophe with 30+ victims. Demonstrates multi-unit dispatch, casualty triage, hospital bed allocation, and severe capacity warnings.',
    durationMinutes: 30,
    resourceConfig: { ambulances: 5, fireUnits: 3, policeUnits: 4, rescueTeams: 4 },
    events: [
      {
        simulatedTime: '10:30',
        offsetMinutes: 0,
        type: 'CREATE_CRITICAL_INCIDENT',
        payload: generateSimulationIncident('BUILDING_COLLAPSE', 0, 30),
      },
      {
        simulatedTime: '10:33',
        offsetMinutes: 3,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('MEDICAL', 2, 4),
      },
      {
        simulatedTime: '10:35',
        offsetMinutes: 5,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('FIRE', 1, 10),
      },
      {
        simulatedTime: '10:45',
        offsetMinutes: 15,
        type: 'ESCALATE_INCIDENT',
        payload: { incidentId: 'sim-inc-0', peopleAffected: 45 },
      },
    ],
  },
  {
    id: 'resource-shortage',
    name: 'Scenario 4 — Resource Shortage',
    description: 'Severe fleet deficit testing system boundary limits. Demonstrates unassigned incident queues, waiting time warnings, and no-resource critical notifications.',
    durationMinutes: 30,
    resourceConfig: { ambulances: 2, fireUnits: 1, policeUnits: 2, rescueTeams: 1 },
    events: [
      {
        simulatedTime: '10:30',
        offsetMinutes: 0,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('ROAD_ACCIDENT', 0, 5),
      },
      {
        simulatedTime: '10:32',
        offsetMinutes: 2,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('FIRE', 1, 6),
      },
      {
        simulatedTime: '10:34',
        offsetMinutes: 4,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('MEDICAL', 2, 2),
      },
      {
        simulatedTime: '10:36',
        offsetMinutes: 6,
        type: 'CREATE_CRITICAL_INCIDENT',
        payload: generateSimulationIncident('INDUSTRIAL_ACCIDENT', 3, 12),
      },
    ],
  },
  {
    id: 'cascading-emergencies',
    name: 'Scenario 5 — Cascading Emergencies',
    description: 'Chain-reaction events where initial incidents trigger secondary emergencies, unit failures, and dynamic reallocation.',
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
        simulatedTime: '10:33',
        offsetMinutes: 3,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('FLOOD', 1, 6),
      },
      {
        simulatedTime: '10:36',
        offsetMinutes: 6,
        type: 'RESOURCE_OFFLINE',
        payload: { resourceCode: 'AMB-01' },
      },
      {
        simulatedTime: '10:40',
        offsetMinutes: 10,
        type: 'CREATE_CRITICAL_INCIDENT',
        payload: generateSimulationIncident('FIRE', 2, 14),
      },
    ],
  },
];
