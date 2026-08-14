import { useState, useEffect, useCallback } from 'react';
import { Incident, IncidentStatus } from '../types/incident';
import { getIncidentById, updateIncidentStatus } from '../services/incidents';
import { supabase, isSupabaseConfigured } from '../services/supabase';

export function useIncident(id: string | undefined) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadIncident = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getIncidentById(id);
      if (data) {
        setIncident(data);
      } else {
        setError('Incident not found');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load incident details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadIncident();
  }, [loadIncident]);

  // Realtime subscription for single incident
  useEffect(() => {
    if (!id || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`incident_detail_${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'incidents', filter: `id=eq.${id}` },
        () => {
          loadIncident();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadIncident]);

  const changeStatus = async (newStatus: IncidentStatus, message?: string) => {
    if (!id) return false;
    const result = await updateIncidentStatus(id, newStatus, message);
    if (result.success && result.incident) {
      setIncident(result.incident);
      return true;
    }
    if (result.error) {
      setError(result.error);
    }
    return false;
  };

  return {
    incident,
    loading,
    error,
    refetch: loadIncident,
    changeStatus,
  };
}
