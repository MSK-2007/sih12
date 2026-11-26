import { useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { ReallocationRecommendation } from '../engines/reallocationEngine';
import { analyzeDynamicReallocation } from '../services/reallocation';

const DEBOUNCE_MS = 3000; // 3 second debounce prevents burst re-analysis

/**
 * Realtime reallocation monitor hook.
 * Subscribes to Supabase changes on incidents, resources, and resource_assignments.
 * Debounces analysis triggers to avoid burst calculations on rapid database events.
 */
export function useReallocationRealtime(
  onReallocationNeeded: (recommendation: ReallocationRecommendation) => void,
  enabled: boolean = true
) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAnalyzing = useRef(false);

  const triggerAnalysis = useCallback(
    async (triggerIncidentId?: string) => {
      if (isAnalyzing.current) return; // Deduplicate concurrent analyses
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      debounceTimer.current = setTimeout(async () => {
        isAnalyzing.current = true;
        try {
          const result = await analyzeDynamicReallocation(triggerIncidentId);
          if (
            result &&
            result.status === 'REALLOCATION_RECOMMENDED'
          ) {
            onReallocationNeeded(result);
          }
        } catch (err) {
          console.warn('[ReallocationRealtime] Analysis error:', err);
        } finally {
          isAnalyzing.current = false;
        }
      }, DEBOUNCE_MS);
    },
    [onReallocationNeeded]
  );

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) return;

    // Subscribe to incident changes (new critical/high incidents, status changes)
    const incidentSub = supabase
      .channel('realloc-incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, (payload) => {
        const newRow = payload.new as any;
        // Trigger analysis only for significant events: CRITICAL/HIGH incidents
        if (
          payload.eventType === 'INSERT' &&
          (newRow?.priority_level === 'CRITICAL' || newRow?.priority_level === 'HIGH')
        ) {
          triggerAnalysis(newRow?.id);
        } else if (
          payload.eventType === 'UPDATE' &&
          (newRow?.priority_level === 'CRITICAL' || newRow?.priority_level === 'HIGH')
        ) {
          triggerAnalysis(newRow?.id);
        }
      })
      .subscribe();

    // Subscribe to resource status changes (OFFLINE = reallocation needed)
    const resourceSub = supabase
      .channel('realloc-resources')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'resources' }, (payload) => {
        const newRow = payload.new as any;
        const oldRow = payload.old as any;
        if (newRow?.status !== oldRow?.status) {
          triggerAnalysis();
        }
      })
      .subscribe();

    // Subscribe to assignment changes (new dispatch, release, etc.)
    const assignmentSub = supabase
      .channel('realloc-assignments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_assignments' }, () => {
        triggerAnalysis();
      })
      .subscribe();

    // Subscribe to environmental & external events (IMD/USGS/FIRMS alerts that change risk profile)
    const envSub = supabase
      .channel('realloc-env-events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'external_events' }, () => {
        triggerAnalysis();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'environmental_alerts' }, () => {
        triggerAnalysis();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(incidentSub);
      supabase.removeChannel(resourceSub);
      supabase.removeChannel(assignmentSub);
      supabase.removeChannel(envSub);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [enabled, triggerAnalysis]);
}
