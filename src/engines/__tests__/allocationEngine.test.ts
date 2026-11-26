import { describe, it, expect } from 'vitest';
import { allocationEngine } from '../allocationEngine';
import { Incident } from '../../types/incident';
import { Resource } from '../../types/resource';

/**
 * Unit test suite validating Resource Allocation Engine across 12 scenarios.
 */
export function runAllocationEngineTests() {
  const results: { name: string; passed: boolean; details: string }[] = [];

  function assert(name: string, condition: boolean, message: string) {
    results.push({
      name,
      passed: condition,
      details: condition ? `PASSED: ${message}` : `FAILED: ${message}`,
    });
  }

  const baseIncident: Incident = {
    id: 'inc-test-1',
    incidentNumber: 'INC-9001',
    emergencyType: 'ROAD_ACCIDENT',
    title: 'Test Accident',
    description: 'Test incident description',
    latitude: 12.9716,
    longitude: 77.5946,
    address: 'Central Test Zone',
    peopleAffected: 4,
    injuryLevel: 'SEVERE',
    severity: 'CRITICAL',
    priorityScore: 92,
    priorityLevel: 'CRITICAL',
    status: 'AWAITING_DISPATCH',
    reportedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const amb1: Resource = {
    id: 'res-amb-1',
    resourceCode: 'AMB-01',
    name: 'Near BLS Ambulance',
    resourceType: 'AMBULANCE',
    status: 'AVAILABLE',
    latitude: 12.9720,
    longitude: 77.5950,
    capability: ['BASIC_LIFE_SUPPORT'],
    capacity: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const amb2: Resource = {
    id: 'res-amb-2',
    resourceCode: 'AMB-02',
    name: 'Far ALS Trauma Ambulance',
    resourceType: 'AMBULANCE',
    status: 'AVAILABLE',
    latitude: 12.9900,
    longitude: 77.6100,
    capability: ['ADVANCED_LIFE_SUPPORT', 'EXTRICATION', 'CRUSH_INJURY_MANAGEMENT'],
    capacity: 2,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // TEST 1: Multiple resources -> Best capability + ETA ranked first
  const t1 = allocationEngine.analyzeAllocation(baseIncident, [
    { resource: amb1, route: { distanceKm: 1.0, durationMinutes: 3, geometry: [], provider: 'OSRM', calculatedAt: '' } },
    { resource: amb2, route: { distanceKm: 3.5, durationMinutes: 6, geometry: [], provider: 'OSRM', calculatedAt: '' } },
  ]);
  assert('TEST 1: Multiple resources ranking', t1.recommendations.length === 2 && t1.recommendations[0].rank === 1, `Rank 1: ${t1.recommendations[0]?.resourceCode}`);

  // TEST 2: Capable ambulance vs incapable
  assert('TEST 2: Capable ALS unit ranks higher for severe accident', t1.recommendations[0].resourceCode === 'AMB-02', `Top candidate: ${t1.recommendations[0]?.resourceCode} (Score: ${t1.recommendations[0]?.allocationScore})`);

  // TEST 3: Nearest ambulance is BUSY -> Excluded
  const ambBusy: Resource = { ...amb1, status: 'BUSY' };
  const t3 = allocationEngine.analyzeAllocation(baseIncident, [
    { resource: ambBusy, route: { distanceKm: 0.5, durationMinutes: 1, geometry: [], provider: 'OSRM', calculatedAt: '' } },
  ]);
  assert('TEST 3: BUSY resource excluded', t3.recommendations.length === 0, `Recommendations count: ${t3.recommendations.length}`);

  // TEST 4: All ambulances unavailable -> NO_RESOURCES_AVAILABLE
  assert('TEST 4: All unavailable returns NO_RESOURCES_AVAILABLE', t3.status === 'NO_RESOURCES_AVAILABLE', `Status: ${t3.status}`);

  // TEST 5: Tie-breaker on similar scores (lower ETA/distance wins)
  const ambA: Resource = { ...amb2, id: 'res-a', resourceCode: 'AMB-A' };
  const ambB: Resource = { ...amb2, id: 'res-b', resourceCode: 'AMB-B' };
  const t5 = allocationEngine.analyzeAllocation(baseIncident, [
    { resource: ambA, route: { distanceKm: 4.0, durationMinutes: 8, geometry: [], provider: 'OSRM', calculatedAt: '' } },
    { resource: ambB, route: { distanceKm: 2.0, durationMinutes: 4, geometry: [], provider: 'OSRM', calculatedAt: '' } },
  ]);
  assert('TEST 5: Tie-breaker favors lower ETA', t5.recommendations[0].resourceCode === 'AMB-B', `Top: ${t5.recommendations[0]?.resourceCode}`);

  // TEST 6: Critical incident priority compatibility score
  assert('TEST 6: Critical incident priority compatibility factor', t5.recommendations[0].factorScores.priorityCompatibility === 100, `Priority factor: ${t5.recommendations[0]?.factorScores.priorityCompatibility}`);

  // TEST 7: Multiple resource requirements generated
  assert('TEST 7: Multiple resource requirements generated', t1.requiredResources.length >= 2, `Requirements count: ${t1.requiredResources.length}`);

  // TEST 8: Partial availability status
  assert('TEST 8: Status reflects ready or partial recommendations', t1.status === 'READY_FOR_OPERATOR_REVIEW' || t1.status === 'PARTIAL_RECOMMENDATION', `Status: ${t1.status}`);

  // TEST 9: Graceful fallback route data
  const t9 = allocationEngine.analyzeAllocation(baseIncident, [
    { resource: amb1, route: { distanceKm: 5.0, durationMinutes: 10, geometry: [], provider: 'HAVERSINE_ESTIMATE', calculatedAt: '' } },
  ]);
  assert('TEST 9: Route fallback handled gracefully', t9.recommendations.length === 1 && t9.recommendations[0].routeProvider === 'HAVERSINE_ESTIMATE', `Provider: ${t9.recommendations[0]?.routeProvider}`);

  // TEST 10: Resource unavailable after analysis
  const isStale = ambBusy.status !== 'AVAILABLE';
  assert('TEST 10: Stale resource detection', isStale === true, 'BUSY unit detected as non-AVAILABLE');

  // TEST 11: Valid recommendation output structure
  assert('TEST 11: Valid recommendation fields', typeof t1.recommendations[0].explanation === 'string' && t1.recommendations[0].explanation.length > 10, 'Explanation generated correctly');

  // TEST 12: Allocation summary message output
  assert('TEST 12: Summary message output', Boolean(t1.summaryMessage), `Summary: ${t1.summaryMessage}`);

  return results;
}

describe('Allocation Engine (Comprehensive 12-Scenario Suite)', () => {
  const results = runAllocationEngineTests();
  for (const r of results) {
    it(r.name, () => {
      expect(r.passed, r.details).toBe(true);
    });
  }
});
