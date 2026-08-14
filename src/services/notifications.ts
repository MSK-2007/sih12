import { supabase, isSupabaseConfigured } from './supabase';
import { AppNotification, NotificationFilters } from '../types/notifications';

let localNotificationsStore: AppNotification[] = [
  {
    id: 'notif-seed-1',
    incidentId: 'i5555555-5555-5555-5555-555555555555',
    type: 'CRITICAL_INCIDENT',
    severity: 'CRITICAL',
    title: 'NEW CRITICAL INCIDENT',
    message: 'INC-1045 (Structural Collapse) reported with 12 affected. Immediate operator review required.',
    actionUrl: '/incidents/i5555555-5555-5555-5555-555555555555',
    actionLabel: 'OPEN INCIDENT',
    state: 'UNREAD',
    deduplicationKey: 'CRITICAL_INCIDENT:i5555555-5555-5555-5555-555555555555',
    createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
  {
    id: 'notif-seed-2',
    type: 'REALLOCATION_REQUIRED',
    severity: 'WARNING',
    title: 'REALLOCATION RECOMMENDED',
    message: 'Dynamic reallocation recommended for INC-1045 (+18 pts system quality gain).',
    actionUrl: '/reallocation',
    actionLabel: 'REVIEW REALLOCATION',
    state: 'UNREAD',
    deduplicationKey: 'REALLOCATION_REQUIRED:seed-realloc-1',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'notif-seed-3',
    resourceId: 'r3333333-3333-3333-3333-333333333333',
    type: 'RESOURCE_OFFLINE',
    severity: 'WARNING',
    title: 'RESOURCE OFFLINE',
    message: 'POL-03 is now OFFLINE. Fleet capacity reduced.',
    actionUrl: '/resources/r3333333-3333-3333-3333-333333333333',
    actionLabel: 'INSPECT UNIT',
    state: 'READ',
    deduplicationKey: 'RESOURCE_OFFLINE:r3333333-3333-3333-3333-333333333333:AVAILABLE',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
];

/**
 * Creates and persists a new operational notification.
 */
export async function createNotification(notifData: AppNotification): Promise<AppNotification> {
  // Check local store deduplication
  const existing = localNotificationsStore.find((n) => n.deduplicationKey === notifData.deduplicationKey);
  if (existing) return existing;

  localNotificationsStore.unshift(notifData);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('notifications').insert({
        id: notifData.id,
        incident_id: notifData.incidentId,
        resource_id: notifData.resourceId,
        reallocation_event_id: notifData.reallocationEventId,
        type: notifData.type,
        severity: notifData.severity,
        title: notifData.title,
        message: notifData.message,
        action_url: notifData.actionUrl,
        state: notifData.state,
        deduplication_key: notifData.deduplicationKey,
        created_at: notifData.createdAt,
      });
    } catch (err) {
      // Fail silently if table missing
    }
  }

  return notifData;
}

/**
 * Retrieves notifications with search, filter, and sorting.
 */
export async function getNotifications(filters?: NotificationFilters): Promise<AppNotification[]> {
  let list = [...localNotificationsStore];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        list = data.map(mapDbNotificationToModel);
      }
    } catch (err) {
      // Fallback to local store
    }
  }

  // Apply filters
  if (filters) {
    if (filters.severity && filters.severity !== 'ALL') {
      list = list.filter((n) => n.severity === filters.severity);
    }
    if (filters.type && filters.type !== 'ALL') {
      list = list.filter((n) => n.type === filters.type);
    }
    if (filters.state === 'UNREAD_ONLY') {
      list = list.filter((n) => n.state === 'UNREAD');
    } else if (filters.state && filters.state !== 'ALL') {
      list = list.filter((n) => n.state === filters.state);
    }
    if (filters.searchQuery?.trim()) {
      const q = filters.searchQuery.toLowerCase();
      list = list.filter((n) => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q));
    }
  }

  return list;
}

/**
 * Returns count of unread notifications.
 */
export async function getUnreadCount(): Promise<number> {
  const list = await getNotifications();
  return list.filter((n) => n.state === 'UNREAD').length;
}

/**
 * Marks a notification as READ.
 */
export async function markAsRead(id: string): Promise<boolean> {
  const notif = localNotificationsStore.find((n) => n.id === id);
  if (notif && notif.state === 'UNREAD') {
    notif.state = 'READ';
  }

  if (isSupabaseConfigured) {
    try {
      await supabase.from('notifications').update({ state: 'READ' }).eq('id', id);
    } catch (err) {
      // Fail silently
    }
  }
  return true;
}

/**
 * Marks all unread notifications as READ.
 */
export async function markAllAsRead(): Promise<boolean> {
  localNotificationsStore.forEach((n) => {
    if (n.state === 'UNREAD') n.state = 'READ';
  });

  if (isSupabaseConfigured) {
    try {
      await supabase.from('notifications').update({ state: 'READ' }).eq('state', 'UNREAD');
    } catch (err) {
      // Fail silently
    }
  }
  return true;
}

/**
 * Explicitly acknowledges a notification (required for CRITICAL severity alerts).
 */
export async function acknowledgeNotification(id: string): Promise<boolean> {
  const notif = localNotificationsStore.find((n) => n.id === id);
  const now = new Date().toISOString();
  if (notif) {
    notif.state = 'ACKNOWLEDGED';
    notif.acknowledgedAt = now;
  }

  if (isSupabaseConfigured) {
    try {
      await supabase.from('notifications').update({ state: 'ACKNOWLEDGED', acknowledged_at: now }).eq('id', id);
    } catch (err) {
      // Fail silently
    }
  }
  return true;
}

/**
 * Dismisses an informational notification.
 */
export async function dismissNotification(id: string): Promise<boolean> {
  const notif = localNotificationsStore.find((n) => n.id === id);
  if (notif) {
    notif.state = 'DISMISSED';
  }

  if (isSupabaseConfigured) {
    try {
      await supabase.from('notifications').update({ state: 'DISMISSED' }).eq('id', id);
    } catch (err) {
      // Fail silently
    }
  }
  return true;
}

function mapDbNotificationToModel(row: any): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    incidentId: row.incident_id,
    resourceId: row.resource_id,
    reallocationEventId: row.reallocation_event_id,
    type: row.type,
    severity: row.severity,
    title: row.title,
    message: row.message,
    actionUrl: row.action_url,
    actionLabel: row.action_label || 'VIEW',
    state: row.state || 'UNREAD',
    deduplicationKey: row.deduplication_key,
    createdAt: row.created_at,
    acknowledgedAt: row.acknowledged_at,
  };
}
