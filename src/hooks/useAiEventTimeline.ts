import { useState, useEffect, useCallback, useRef } from 'react';
import { getAiEventTimeline, subscribeToAiTimeline } from '../services/providerHealthService';

export interface AiTimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  severity: string | null;
  source: string | null;
  incident_id: string | null;
  external_event_id: string | null;
  reallocation_event_id: string | null;
  ai_analysis_id: string | null;
  metadata: Record<string, any>;
  occurred_at: string;
  created_at: string;
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  INCIDENT_CREATED: { label: 'Incident Created', color: '#FF4D00', icon: '🚨' },
  PRIORITY_CALCULATED: { label: 'Priority Calculated', color: '#F59E0B', icon: '📊' },
  ENV_EVENT_DETECTED: { label: 'Environmental Event', color: '#3B82F6', icon: '🌍' },
  GEMINI_ANALYSIS_COMPLETED: { label: 'AI Analysis', color: '#8B5CF6', icon: '🤖' },
  RESOURCE_CONFLICT: { label: 'Resource Conflict', color: '#EF4444', icon: '⚠️' },
  REALLOCATION_RECOMMENDED: { label: 'Reallocation Recommended', color: '#F97316', icon: '🔄' },
  OPERATOR_APPROVED: { label: 'Operator Approved', color: '#10B981', icon: '✅' },
  OPERATOR_REJECTED: { label: 'Operator Rejected', color: '#6B7280', icon: '❌' },
};

export function getEventConfig(eventType: string) {
  return EVENT_TYPE_CONFIG[eventType] || { label: eventType.replace(/_/g, ' '), color: '#6B7280', icon: '📌' };
}

/**
 * useAiEventTimeline hook
 * 
 * Loads and subscribes to the AI event timeline.
 * Supports filtering by incident ID and severity.
 * Automatically updates in real-time when new events are written.
 */
export function useAiEventTimeline(options?: {
  incidentId?: string;
  limit?: number;
}) {
  const [events, setEvents] = useState<AiTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  const loadEvents = useCallback(async () => {
    try {
      const data = await getAiEventTimeline({
        incidentId: options?.incidentId,
        limit: options?.limit || 50,
      });
      if (isMountedRef.current) {
        setEvents(data as AiTimelineEvent[]);
      }
    } catch (err) {
      console.warn('[useAiEventTimeline] Load error:', err);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [options?.incidentId, options?.limit]);

  useEffect(() => {
    isMountedRef.current = true;
    loadEvents();

    // Subscribe to real-time timeline updates
    const unsubscribe = subscribeToAiTimeline((newEvent: any) => {
      if (!isMountedRef.current) return;

      // Filter by incidentId if specified
      if (options?.incidentId && newEvent.incident_id !== options.incidentId) return;

      setEvents(prev => {
        const updated = [newEvent as AiTimelineEvent, ...prev];
        return updated.slice(0, options?.limit || 50);
      });
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [loadEvents, options?.incidentId]);

  const refresh = useCallback(() => {
    setLoading(true);
    loadEvents();
  }, [loadEvents]);

  return { events, loading, refresh };
}
