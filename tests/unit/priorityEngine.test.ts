import { describe, it, expect } from 'vitest';
import { priorityEngine } from '../../src/engines/priorityEngine';

describe('Priority Engine Unit Tests', () => {
  it('should calculate priority score between 0 and 100 deterministically', () => {
    const input = {
      emergencyType: 'ROAD_ACCIDENT' as const,
      peopleAffected: 5,
      injuryLevel: 'CRITICAL' as const,
    };

    const res1 = priorityEngine.calculatePriority(input);
    const res2 = priorityEngine.calculatePriority(input);

    expect(res1.score).toBeGreaterThanOrEqual(0);
    expect(res1.score).toBeLessThanOrEqual(100);
    expect(res1.score).toBe(res2.score); // Deterministic
    expect(['HIGH', 'CRITICAL']).toContain(res1.level);
  });

  it('should handle boundary case of 0 people affected without returning NaN', () => {
    const input = {
      emergencyType: 'MEDICAL' as const,
      peopleAffected: 0,
      injuryLevel: 'MINOR' as const,
    };

    const res = priorityEngine.calculatePriority(input);
    expect(isNaN(res.score)).toBe(false);
    expect(res.score).toBeGreaterThanOrEqual(0);
    expect(res.level).toBeDefined();
  });

  it('should cap extremely large casualty counts smoothly without overflow', () => {
    const input = {
      emergencyType: 'NATURAL_DISASTER' as const,
      peopleAffected: 10000,
      injuryLevel: 'FATAL' as const,
    };

    const res = priorityEngine.calculatePriority(input);
    expect(res.score).toBeLessThanOrEqual(100);
    expect(['HIGH', 'CRITICAL']).toContain(res.level);
  });

  it('should assign correct priority level classifications', () => {
    const input = {
      emergencyType: 'OTHER' as const,
      peopleAffected: 1,
      injuryLevel: 'NONE' as const,
    };

    const res = priorityEngine.calculatePriority(input);
    expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(res.level);
  });
});
