import { useState, useEffect, useCallback } from 'react';
import { Incident, IncidentFilters } from '../types/incident';
import { getIncidents } from '../services/incidents';
import { supabase, isSupabaseConfigured } from '../services/supabase';

export function useIncidents(initialFilters?: IncidentFilters) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filters, setFilters] = useState<IncidentFilters>(initialFilters || {
    searchQuery: '',
    emergencyType: 'ALL',
    priorityLevel: 'ALL',
    status: 'ALL',
    injuryLevel: 'ALL',
    sortBy: 'priority_score',
    sortOrder: 'desc',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getIncidents(filters);
      setIncidents(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch incidents');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Supabase Realtime Subscription
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('realtime_incidents_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        () => {
          fetchList();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchList]);

  const updateFilters = (newFilters: Partial<IncidentFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return {
    incidents,
    filters,
    loading,
    error,
    refetch: fetchList,
    updateFilters,
  };
}
