import { describe, it, expect } from 'vitest';
import { priorityEngine } from '../../src/engines/priorityEngine';
import { allocationEngine } from '../../src/engines/allocationEngine';
import { MOCK_INCIDENT_ROAD_ACCIDENT, MOCK_RESOURCE_AMBULANCE } from '../fixtures/mockData';
import { RouteResult } from '../../src/types/map';

const mockRoute: RouteResult = {
  distanceKm: 3.2,
  durationMinutes: 6,
  geometry: [[12.9716, 77.5946], [12.9352, 77.6245]],
  provider: 'OSRM',
};

describe('End-To-End Operational Pipeline Validation', () => {
  it('should process an incident through Priority -> Allocation -> Recommendation pipeline', () => {
    // 1. Analyze priority
    const priorityResult = priorityEngine.calculatePriority({
      emergencyType: MOCK_INCIDENT_ROAD_ACCIDENT.emergencyType,
      peopleAffected: MOCK_INCIDENT_ROAD_ACCIDENT.peopleAffected,
      injuryLevel: MOCK_INCIDENT_ROAD_ACCIDENT.injuryLevel,
    });
    expect(priorityResult.score).toBeGreaterThan(50);
    expect(['HIGH', 'CRITICAL']).toContain(priorityResult.level);

    // 2. Recommend resource
    const candidates = [{ resource: MOCK_RESOURCE_AMBULANCE, route: mockRoute }];
    const allocationResult = allocationEngine.analyzeAllocation(MOCK_INCIDENT_ROAD_ACCIDENT, candidates);
    expect(allocationResult).toBeDefined();
    expect(allocationResult.status).toBeDefined();
    expect(allocationResult.recommendations.length).toBeGreaterThan(0);
  });
});
