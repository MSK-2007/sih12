import { describe, it, expect } from 'vitest';

interface AppNotification {
  id: string;
  incidentId?: string;
  type: string;
  message: string;
  timestamp: string;
}

function addNotificationUnique(list: AppNotification[], newNotif: AppNotification): AppNotification[] {
  const isDuplicate = list.some(
    n => n.incidentId === newNotif.incidentId && n.type === newNotif.type && n.message === newNotif.message
  );
  if (isDuplicate) return list;
  return [newNotif, ...list];
}

describe('Notifications System Integration Tests', () => {
  it('should add new notifications to list', () => {
    const list: AppNotification[] = [];
    const notif: AppNotification = {
      id: 'notif-1',
      incidentId: 'inc-1',
      type: 'NEW_INCIDENT',
      message: 'New Critical Incident Reported',
      timestamp: new Date().toISOString(),
    };

    const updated = addNotificationUnique(list, notif);
    expect(updated.length).toBe(1);
  });

  it('should prevent duplicate notification creation for identical events', () => {
    const notif: AppNotification = {
      id: 'notif-1',
      incidentId: 'inc-1',
      type: 'NEW_INCIDENT',
      message: 'New Critical Incident Reported',
      timestamp: new Date().toISOString(),
    };

    const list = [notif];
    const updated = addNotificationUnique(list, { ...notif, id: 'notif-2' });
    expect(updated.length).toBe(1); // Duplicate prevented
  });
});
