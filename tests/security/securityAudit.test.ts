import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sanitizeInput, maskErrorMessage, isValidCoordinates } from '../helpers/testUtils';
import { priorityEngine } from '../../src/engines/priorityEngine';
import { isValidStatusTransition } from '../../src/types/incident';
import { validateResourceStatusTransition } from '../../src/types/resource';
import { calculateEnvironmentalRiskScore } from '../../src/types/externalData';

describe('Security, Validation & Boundary Guard Tests (Actual App Modules)', () => {
  it('should sanitize HTML/script tags and mask Postgres error details', () => {
    const rawInput = '<script>alert("xss")</script> Main Street Collision';
    const cleaned = sanitizeInput(rawInput);
    expect(cleaned).not.toContain('<script>');
    expect(cleaned).toContain('Main Street Collision');

    const rawError = 'PostgrestError: relation "incidents" does not exist at PG::SyntaxError';
    const masked = maskErrorMessage(rawError);
    expect(masked).not.toContain('PostgrestError');
    expect(masked).toBe('Unable to access database service. Please try again.');
  });

  it('should clamp out-of-range inputs safely in priorityEngine and environmental risk scoring', () => {
    const clamped = priorityEngine.calculatePriority({
      severity: 9999,
      people_affected: -50,
      environmentalRiskScore: 500,
    });
    expect(clamped.score).toBeGreaterThanOrEqual(0);
    expect(clamped.score).toBeLessThanOrEqual(100);
    expect(Number.isNaN(clamped.score)).toBe(false);

    const envRes = calculateEnvironmentalRiskScore(12.9716, 77.5946, [], 50);
    expect(envRes.score).toBe(0);
    expect(envRes.relevantAlerts).toEqual([]);
  });

  it('should enforce strict incident and resource status transition state machines', () => {
    expect(isValidStatusTransition('CLOSED', 'REPORTED')).toBe(false);
    expect(isValidStatusTransition('RESOLVED', 'IN_PROGRESS')).toBe(false);
    expect(validateResourceStatusTransition('OFFLINE', 'BUSY').valid).toBe(false);
    expect(isValidCoordinates(12.9716, 77.5946)).toBe(true);
    expect(isValidCoordinates(120, 77.5946)).toBe(false);
  });

  it('should not contain hardcoded service_role secrets or Gemini keys in client source', () => {
    const supabaseSrc = readFileSync(resolve(process.cwd(), 'src/services/supabase.ts'), 'utf8');
    expect(supabaseSrc).not.toMatch(/service_role/i);
    expect(supabaseSrc).not.toMatch(/AIza[0-9A-Za-z_-]{20,}/);
  });
});
