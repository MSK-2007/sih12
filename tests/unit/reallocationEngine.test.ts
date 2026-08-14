import { describe, it, expect } from 'vitest';
import { reallocationEngine } from '../../src/engines/reallocationEngine';
import { MOCK_INCIDENT_ROAD_ACCIDENT, MOCK_INCIDENT_FIRE, MOCK_RESOURCE_AMBULANCE } from '../fixtures/mockData';

describe('Dynamic Reallocation Engine Unit Tests', () => {
  it('should detect allocation conflicts when pending demand exists', () => {
    const conflictResult = reallocationEngine.detectConflict(
      [MOCK_INCIDENT_ROAD_ACCIDENT, MOCK_INCIDENT_FIRE],
      [MOCK_RESOURCE_AMBULANCE],
      []
    );

    expect(conflictResult).toBeDefined();
    expect(conflictResult.severity).toBeDefined();
  });

  it('should calculate system quality score between 0 and 100', () => {
    const quality = reallocationEngine.calculateSystemQuality(
      [MOCK_INCIDENT_ROAD_ACCIDENT],
      []
    );

    expect(quality.score).toBeGreaterThanOrEqual(0);
    expect(quality.score).toBeLessThanOrEqual(100);
  });
});
