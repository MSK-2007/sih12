import { describe, it, expect } from 'vitest';
import { allocationEngine } from '../../src/engines/allocationEngine';
import { MOCK_INCIDENT_ROAD_ACCIDENT, MOCK_RESOURCE_AMBULANCE, MOCK_RESOURCE_OFFLINE } from '../fixtures/mockData';
import { RouteResult } from '../../src/types/map';

const mockRoute: RouteResult = {
  distanceKm: 3.2,
  durationMinutes: 6,
  geometry: [[12.9716, 77.5946], [12.9352, 77.6245]],
  provider: 'OSRM',
};

describe('Allocation Engine Unit Tests', () => {
  it('should calculate allocation score between 0 and 100', () => {
    const candidates = [{ resource: MOCK_RESOURCE_AMBULANCE, route: mockRoute }];
    const result = allocationEngine.analyzeAllocation(MOCK_INCIDENT_ROAD_ACCIDENT, candidates);

    expect(result).toBeDefined();
    expect(result.status).toBeDefined();
    if (result.recommendations.length > 0) {
      const score = result.recommendations[0].allocationScore;
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(isNaN(score)).toBe(false);
    }
  });

  it('should filter out offline resources from recommendation pool', () => {
    const candidates = [
      { resource: MOCK_RESOURCE_AMBULANCE, route: mockRoute },
      { resource: MOCK_RESOURCE_OFFLINE, route: mockRoute },
    ];
    const result = allocationEngine.analyzeAllocation(MOCK_INCIDENT_ROAD_ACCIDENT, candidates);

    const recs = result.recommendations;
    expect(recs.some(r => r.resourceId === MOCK_RESOURCE_OFFLINE.id)).toBe(false);
  });

  it('should return deterministic results for identical inputs', () => {
    const candidates = [{ resource: MOCK_RESOURCE_AMBULANCE, route: mockRoute }];
    const res1 = allocationEngine.analyzeAllocation(MOCK_INCIDENT_ROAD_ACCIDENT, candidates);
    const res2 = allocationEngine.analyzeAllocation(MOCK_INCIDENT_ROAD_ACCIDENT, candidates);

    expect(res1.recommendations.length).toBe(res2.recommendations.length);
    if (res1.recommendations.length > 0 && res2.recommendations.length > 0) {
      expect(res1.recommendations[0].allocationScore).toBe(res2.recommendations[0].allocationScore);
    }
  });

  it('should handle empty candidate pool gracefully without throwing', () => {
    const result = allocationEngine.analyzeAllocation(MOCK_INCIDENT_ROAD_ACCIDENT, []);
    expect(result.status).toBe('NO_RESOURCES_AVAILABLE');
    expect(result.recommendations.length).toBe(0);
  });
});
