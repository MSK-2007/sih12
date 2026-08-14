import { describe, it, expect } from 'vitest';
import { IncidentStatus } from '../../src/types/incident';

const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  REPORTED: ['ANALYSING', 'PRIORITIZED', 'CLOSED'],
  ANALYSING: ['PRIORITIZED', 'AWAITING_DISPATCH', 'CLOSED'],
  PRIORITIZED: ['AWAITING_DISPATCH', 'DISPATCHED', 'CLOSED'],
  AWAITING_DISPATCH: ['DISPATCHED', 'CLOSED'],
  DISPATCHED: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

function isValidStatusTransition(current: IncidentStatus, next: IncidentStatus): boolean {
  const allowed = VALID_TRANSITIONS[current] || [];
  return allowed.includes(next);
}

describe('Incident Lifecycle Workflow Integration Tests', () => {
  it('should allow valid sequential status transitions', () => {
    expect(isValidStatusTransition('REPORTED', 'ANALYSING')).toBe(true);
    expect(isValidStatusTransition('ANALYSING', 'PRIORITIZED')).toBe(true);
    expect(isValidStatusTransition('PRIORITIZED', 'AWAITING_DISPATCH')).toBe(true);
    expect(isValidStatusTransition('AWAITING_DISPATCH', 'DISPATCHED')).toBe(true);
    expect(isValidStatusTransition('DISPATCHED', 'IN_PROGRESS')).toBe(true);
    expect(isValidStatusTransition('IN_PROGRESS', 'RESOLVED')).toBe(true);
  });

  it('should reject invalid reverse transitions (e.g. RESOLVED -> DISPATCHED)', () => {
    expect(isValidStatusTransition('RESOLVED', 'DISPATCHED')).toBe(false);
    expect(isValidStatusTransition('RESOLVED', 'REPORTED')).toBe(false);
    expect(isValidStatusTransition('CLOSED', 'DISPATCHED')).toBe(false);
  });
});
