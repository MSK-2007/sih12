import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { AppNotification } from '../types/notifications';
import {
  handleIncidentCreated,
  handleResourceStatusChanged,
} from '../services/notificationEvents';

export function useNotificationRealtime(
  onNewNotification: (notif: AppNotification) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) return;

    // 1. Subscribe to DB notifications table directly
    const notifSub = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const row = payload.new as any;
          if (row) {
            onNewNotification({
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
            });
          }
        }
      )
      .subscribe();

    // 2. Subscribe to incident creations to generate notifications via rules engine
    const incidentSub = supabase
      .channel('realtime-incident-rules')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidents' },
        async (payload) => {
          const row = payload.new as any;
          if (row) {
            const notif = await handleIncidentCreated({
              id: row.id,
              incidentNumber: row.incident_number,
              emergencyType: row.emergency_type,
              title: row.title,
              description: row.description,
              latitude: row.latitude,
              longitude: row.longitude,
              address: row.address,
              peopleAffected: row.people_affected,
              injuryLevel: row.injury_level,
              severity: row.priority_level,
              priorityScore: row.priority_score,
              priorityLevel: row.priority_level,
              status: row.status,
              reportedAt: row.reported_at || row.created_at,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            });
            if (notif) onNewNotification(notif);
          }
        }
      )
      .subscribe();

    // 3. Subscribe to resource status changes
    const resourceSub = supabase
      .channel('realtime-resource-rules')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'resources' },
        async (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;
          if (newRow && oldRow && newRow.status !== oldRow.status) {
            const notif = await handleResourceStatusChanged(
              {
                id: newRow.id,
                resourceCode: newRow.resource_code,
                name: newRow.name,
                resourceType: newRow.resource_type,
                status: newRow.status,
                latitude: newRow.latitude,
                longitude: newRow.longitude,
                capability: newRow.capability || [],
                capacity: newRow.capacity,
                isActive: newRow.is_active,
                createdAt: newRow.created_at,
                updatedAt: newRow.updated_at,
              },
              oldRow.status,
              newRow.status,
              newRow.current_assignment_id
            );
            if (notif) onNewNotification(notif);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifSub);
      supabase.removeChannel(incidentSub);
      supabase.removeChannel(resourceSub);
    };
  }, [onNewNotification]);
}
