import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {},
}));

import { notificationRules } from '../../src/engines/notificationRules';
import { notificationEngine } from '../../src/engines/notificationEngine';
import {
  createNotification,
  getNotifications,
  markAsRead,
  acknowledgeNotification,
  dismissNotification,
} from '../../src/services/notifications';
import { MOCK_INCIDENT_ROAD_ACCIDENT } from '../fixtures/mockData';

describe('Notifications System Integration Tests (Actual App Modules)', () => {
  beforeEach(() => {
    notificationEngine.clearCache();
  });

  it('should evaluate critical incident rules and suppress duplicates via notificationEngine', () => {
    const uniqueIncident = {
      ...MOCK_INCIDENT_ROAD_ACCIDENT,
      id: `inc-notif-${Date.now()}`,
    };

    const ruleOut = notificationRules.evaluateIncidentCreated(uniqueIncident);
    expect(ruleOut.shouldNotify).toBe(true);
    expect(ruleOut.severity).toBe('CRITICAL');
    expect(ruleOut.type).toBe('CRITICAL_INCIDENT');

    const first = notificationEngine.processRuleOutput(ruleOut);
    expect(first).not.toBeNull();

    const duplicate = notificationEngine.processRuleOutput(ruleOut);
    expect(duplicate).toBeNull();
  });

  it('should persist notifications and transition state across READ, ACKNOWLEDGED, and DISMISSED', async () => {
    const uniqueIncident = {
      ...MOCK_INCIDENT_ROAD_ACCIDENT,
      id: `inc-store-${Date.now()}`,
    };

    const ruleOut = notificationRules.evaluateIncidentCreated(uniqueIncident);
    const notif = notificationEngine.processRuleOutput(ruleOut)!;

    const saved = await createNotification(notif);
    expect(saved.state).toBe('UNREAD');

    const dedupSaved = await createNotification({ ...notif, id: 'notif-dup-id' });
    expect(dedupSaved.id).toBe(saved.id);

    await markAsRead(saved.id);
    let list = await getNotifications({ state: 'READ' });
    expect(list.some((n) => n.id === saved.id)).toBe(true);

    await acknowledgeNotification(saved.id);
    list = await getNotifications({ state: 'ACKNOWLEDGED' });
    expect(list.some((n) => n.id === saved.id)).toBe(true);

    await dismissNotification(saved.id);
    list = await getNotifications({ state: 'DISMISSED' });
    expect(list.some((n) => n.id === saved.id)).toBe(true);
  });
});
