import { Incident } from '../../src/types/incident';
import { Resource } from '../../src/types/resource';
import { ResourceAssignment } from '../../src/types/assignment';

export const MOCK_INCIDENT_ROAD_ACCIDENT: Incident = {
  id: 'inc-test-001',
  incidentNumber: 'INC-1001',
  title: 'Multi-Vehicle Road Collision',
  description: 'Severe 3-car accident on highway junction.',
  emergencyType: 'ROAD_ACCIDENT',
  severity: 'CRITICAL',
  priorityScore: 88,
  priorityLevel: 'CRITICAL',
  status: 'AWAITING_DISPATCH',
  latitude: 12.9716,
  longitude: 77.5946,
  address: 'MG Road Junction, Bangalore',
  peopleAffected: 5,
  injuryLevel: 'CRITICAL',
  reportedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const MOCK_INCIDENT_FIRE: Incident = {
  id: 'inc-test-002',
  incidentNumber: 'INC-1002',
  title: 'Commercial Building Fire',
  description: 'Smoke and active flames on 3rd floor.',
  emergencyType: 'FIRE',
  severity: 'CRITICAL',
  priorityScore: 92,
  priorityLevel: 'CRITICAL',
  status: 'AWAITING_DISPATCH',
  latitude: 12.9352,
  longitude: 77.6245,
  address: 'Koramangala 5th Block, Bangalore',
  peopleAffected: 12,
  injuryLevel: 'SEVERE',
  reportedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const MOCK_RESOURCE_AMBULANCE: Resource = {
  id: 'res-test-001',
  resourceCode: 'AMB-01',
  name: 'ALS Ambulance Unit 1',
  resourceType: 'AMBULANCE',
  status: 'AVAILABLE',
  latitude: 12.9700,
  longitude: 77.5900,
  capability: ['ADVANCED_LIFE_SUPPORT', 'EXTRICATION'],
  capacity: 3,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const MOCK_RESOURCE_FIRE_UNIT: Resource = {
  id: 'res-test-002',
  resourceCode: 'FIRE-01',
  name: 'Heavy Water Tender 1',
  resourceType: 'FIRE_UNIT',
  status: 'AVAILABLE',
  latitude: 12.9300,
  longitude: 77.6200,
  capability: ['HIGH_REACH_LADDER', 'WATER_CANNON'],
  capacity: 5,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const MOCK_RESOURCE_OFFLINE: Resource = {
  id: 'res-test-003',
  resourceCode: 'AMB-99',
  name: 'Maintenance Ambulance',
  resourceType: 'AMBULANCE',
  status: 'OFFLINE',
  latitude: 12.9500,
  longitude: 77.6000,
  capability: ['BASIC_LIFE_SUPPORT'],
  capacity: 1,
  isActive: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const MOCK_ASSIGNMENT: ResourceAssignment = {
  id: 'asg-test-001',
  incidentId: MOCK_INCIDENT_ROAD_ACCIDENT.id,
  resourceId: MOCK_RESOURCE_AMBULANCE.id,
  assignmentStatus: 'ACCEPTED',
  recommendedAt: new Date().toISOString(),
  acceptedAt: new Date().toISOString(),
  dispatchedAt: new Date().toISOString(),
  distanceKm: 2.1,
  estimatedResponseMinutes: 6.5,
  allocationScore: 91,
  recommendationReason: 'Nearest available ALS ambulance with shortest ETA',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
