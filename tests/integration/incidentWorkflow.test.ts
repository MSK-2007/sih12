import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/services/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {},
}));

import { isValidStatusTransition, ALLOWED_STATUS_TRANSITIONS } from '../../src/types/incident';
import {
  createIncident,
  getIncidentById,
  getIncidents,
  updateIncidentStatus,
  recalculateIncidentPriority,
  getIncidentUpdates,
} from '../../src/services/incidents';

describe('Incident Lifecycle Workflow Integration Tests (Actual App Modules)', () => {
  it('should enforce ALLOWED_STATUS_TRANSITIONS from src/types/incident', () => {
    expect(ALLOWED_STATUS_TRANSITIONS.REPORTED).toContain('ANALYSING');
    expect(isValidStatusTransition('REPORTED', 'ANALYSING')).toBe(true);
    expect(isValidStatusTransition('ANALYSING', 'PRIORITIZED')).toBe(true);
    expect(isValidStatusTransition('PRIORITIZED', 'AWAITING_DISPATCH')).toBe(true);
    expect(isValidStatusTransition('AWAITING_DISPATCH', 'DISPATCHED')).toBe(true);
    expect(isValidStatusTransition('DISPATCHED', 'IN_PROGRESS')).toBe(true);
    expect(isValidStatusTransition('IN_PROGRESS', 'RESOLVED')).toBe(true);
    expect(isValidStatusTransition('RESOLVED', 'CLOSED')).toBe(true);
  });

  it('should reject invalid transitions such as RESOLVED -> DISPATCHED and CLOSED -> REPORTED', () => {
    expect(isValidStatusTransition('RESOLVED', 'DISPATCHED')).toBe(false);
    expect(isValidStatusTransition('RESOLVED', 'REPORTED')).toBe(false);
    expect(isValidStatusTransition('CLOSED', 'DISPATCHED')).toBe(false);
  });

  it('should create an incident, recalculate priority, advance status, and log timeline updates', async () => {
    const created = await createIncident({
      emergencyType: 'FIRE',
      title: 'Warehouse Chemical Fire',
      description: 'Smoke visible across Peenya sector',
      address: 'Peenya Phase 2',
      latitude: 13.0285,
      longitude: 77.5197,
      peopleAffected: 12,
      injuryLevel: 'SEVERE',
    });

    expect(created.id).toBeTruthy();
    expect(created.status).toBe('REPORTED');

    const fetched = await getIncidentById(created.id);
    expect(fetched?.title).toBe('Warehouse Chemical Fire');

    const prioritized = await recalculateIncidentPriority(created.id);
    expect(prioritized).not.toBeNull();
    expect(prioritized!.analysis.score).toBeGreaterThan(50);

    const step1 = await updateIncidentStatus(created.id, 'ANALYSING', 'Initial triage started');
    expect(step1.success).toBe(true);
    expect(step1.incident?.status).toBe('ANALYSING');

    const invalidJump = await updateIncidentStatus(created.id, 'RESOLVED');
    expect(invalidJump.success).toBe(false);
    expect(invalidJump.error).toContain('Invalid status transition');

    const updates = await getIncidentUpdates(created.id);
    expect(updates.length).toBeGreaterThanOrEqual(2);

    const all = await getIncidents({ emergencyType: 'FIRE' });
    expect(all.some((i) => i.id === created.id)).toBe(true);
  });
});
