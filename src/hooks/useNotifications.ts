import { useState, useEffect, useCallback } from 'react';
import { AppNotification, NotificationFilters } from '../types/notifications';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  acknowledgeNotification,
  dismissNotification,
} from '../services/notifications';

export function useNotifications(initialFilters?: NotificationFilters) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<NotificationFilters>(initialFilters || {});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, count] = await Promise.all([getNotifications(filters), getUnreadCount()]);
      setNotifications(list);
      setUnreadCount(count);
    } catch (err) {
      console.error('[useNotifications] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkAsRead = useCallback(async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, state: 'READ' } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, state: 'READ' })));
    setUnreadCount(0);
  }, []);

  const handleAcknowledge = useCallback(async (id: string) => {
    await acknowledgeNotification(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, state: 'ACKNOWLEDGED' } : n))
    );
  }, []);

  const handleDismiss = useCallback(async (id: string) => {
    await dismissNotification(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, state: 'DISMISSED' } : n))
    );
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    filters,
    setFilters,
    refresh: load,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    acknowledge: handleAcknowledge,
    dismiss: handleDismiss,
  };
}
