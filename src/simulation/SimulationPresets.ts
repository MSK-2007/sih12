import { SimulationScenario } from '../types/simulation';
import { generateSimulationIncident } from './incidentGenerator';

export const SIMULATION_SCENARIOS: SimulationScenario[] = [
  {
    id: 'scenario-1-single-emergency',
    name: 'Scenario 1 — Single Emergency (Sufficient Capacity)',
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
    id: 'scenario-2-simultaneous-emergencies',
    name: 'Scenario 2 — Multiple Simultaneous Emergencies',
    description: 'Concurrent emergency reports arriving simultaneously across central urban districts.',
    durationMinutes: 30,
    resourceConfig: { ambulances: 5, fireUnits: 3, policeUnits: 3, rescueTeams: 2 },
    events: [
      {
        simulatedTime: '10:30',
        offsetMinutes: 0,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('ROAD_ACCIDENT', 0, 3),
      },
      {
        simulatedTime: '10:30',
        offsetMinutes: 0,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('FIRE', 1, 5),
      },
      {
        simulatedTime: '10:30',
        offsetMinutes: 0,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('MEDICAL', 2, 1),
      },
    ],
  },
  {
    id: 'scenario-3-resource-shortage',
    name: 'Scenario 3 — Resource Shortage (5 Incidents, 2 Units)',
    description: 'High-stress fleet deficit test. Evaluates ResQAI queue management and priority triage under severe resource deficit.',
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
        simulatedTime: '10:35',
        offsetMinutes: 5,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('FLOOD', 3, 4),
      },
      {
        simulatedTime: '10:36',
        offsetMinutes: 6,
        type: 'CREATE_CRITICAL_INCIDENT',
        payload: generateSimulationIncident('INDUSTRIAL_ACCIDENT', 4, 10),
      },
    ],
  },
  {
    id: 'scenario-4-multiple-critical',
    name: 'Scenario 4 — Multiple CRITICAL Incidents',
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
    id: 'scenario-5-new-critical-reallocation',
    name: 'Scenario 5 — New CRITICAL Incident During Active Assignments',
    description: 'Intentionally creates resource commitment then introduces a new Critical Incident D. Triggers Dynamic Reallocation with operator approval modal.',
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
    id: 'scenario-6-environmental-escalation',
    name: 'Scenario 6 — Environmental Risk Escalation (Real IMD/USGS Event)',
    description: 'Simulates IMD extreme nowcast alert near active incident, driving environmental risk score to 85+ and escalating priority.',
    durationMinutes: 30,
    resourceConfig: { ambulances: 4, fireUnits: 3, policeUnits: 3, rescueTeams: 2 },
    events: [
      {
        simulatedTime: '10:30',
        offsetMinutes: 0,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('FLOOD', 0, 8),
      },
      {
        simulatedTime: '10:33',
        offsetMinutes: 3,
        type: 'ENVIRONMENTAL_EVENT_DETECTED',
        payload: { address: 'IMD Heavy Rainfall & Thunderstorm Warning', waitingMinutes: 0 },
      },
      {
        simulatedTime: '10:35',
        offsetMinutes: 5,
        type: 'ESCALATE_INCIDENT',
        payload: { title: 'Flood Risk Escalation' },
      },
    ],
  },
  {
    id: 'scenario-7-resource-failure',
    name: 'Scenario 7 — Resource Failure / Unit Goes Offline',
    description: 'Simulates active response unit mechanical breakdown during response, triggering automated fallback reassignment.',
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
  {
    id: 'scenario-8-incident-surge',
    name: 'Scenario 8 — Large Incident Surge (Mass Casualty Event)',
    description: 'Mass disaster event generating sudden influx of 8 simultaneous emergencies across multiple urban sectors.',
    durationMinutes: 45,
    resourceConfig: { ambulances: 6, fireUnits: 4, policeUnits: 4, rescueTeams: 3 },
    events: [
      {
        simulatedTime: '10:30',
        offsetMinutes: 0,
        type: 'CREATE_CRITICAL_INCIDENT',
        payload: generateSimulationIncident('BUILDING_COLLAPSE', 0, 30),
      },
      {
        simulatedTime: '10:31',
        offsetMinutes: 1,
        type: 'CREATE_CRITICAL_INCIDENT',
        payload: generateSimulationIncident('FIRE', 1, 20),
      },
      {
        simulatedTime: '10:32',
        offsetMinutes: 2,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('ROAD_ACCIDENT', 2, 5),
      },
      {
        simulatedTime: '10:33',
        offsetMinutes: 3,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('MEDICAL', 3, 2),
      },
      {
        simulatedTime: '10:34',
        offsetMinutes: 4,
        type: 'CREATE_INCIDENT',
        payload: generateSimulationIncident('FLOOD', 4, 10),
      },
    ],
  },
];
