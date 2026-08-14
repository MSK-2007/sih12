import { useState, useEffect, useCallback } from 'react';
import { IncidentUpdate, IncidentStatus } from '../types/incident';
import { getIncidentUpdates, addIncidentUpdate } from '../services/incidents';
import { supabase, isSupabaseConfigured } from '../services/supabase';

export function useIncidentUpdates(incidentId: string | undefined) {
  const [updates, setUpdates] = useState<IncidentUpdate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUpdates = useCallback(async () => {
    if (!incidentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getIncidentUpdates(incidentId);
      setUpdates(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch incident updates');
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  useEffect(() => {
    if (!incidentId || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`incident_updates_${incidentId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incident_updates', filter: `incident_id=eq.${incidentId}` },
        () => {
          fetchUpdates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [incidentId, fetchUpdates]);

  const postUpdate = async (message: string, status: IncidentStatus) => {
    if (!incidentId) return null;
    const newEntry = await addIncidentUpdate(incidentId, message, status);
    fetchUpdates();
    return newEntry;
  };

  return {
    updates,
    loading,
    error,
    refetch: fetchUpdates,
    postUpdate,
  };
}
