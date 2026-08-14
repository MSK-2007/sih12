import { useState, useEffect, useCallback } from 'react';
import { Incident } from '../types/incident';
import { Resource } from '../types/resource';
import { Hospital } from '../types/hospital';
import { getIncidents } from '../services/incidents';
import { getResources } from '../services/resources';
import { getHospitals } from '../services/hospitals';
import { supabase, isSupabaseConfigured } from '../services/supabase';

export function useMapData() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllMapData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [incData, resData, hospData] = await Promise.all([
        getIncidents(),
        getResources(),
        getHospitals(),
      ]);
      setIncidents(incData);
      setResources(resData);
      setHospitals(hospData);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch map spatial dataset');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllMapData();
  }, [fetchAllMapData]);

  // Realtime subscriptions for Incidents, Resources, and Hospitals
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const incidentsChannel = supabase
      .channel('map_incidents_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
        getIncidents().then(setIncidents);
      })
      .subscribe();

    const resourcesChannel = supabase
      .channel('map_resources_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, () => {
        getResources().then(setResources);
      })
      .subscribe();

    const hospitalsChannel = supabase
      .channel('map_hospitals_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospitals' }, () => {
        getHospitals().then(setHospitals);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(incidentsChannel);
      supabase.removeChannel(resourcesChannel);
      supabase.removeChannel(hospitalsChannel);
    };
  }, []);

  return {
    incidents,
    resources,
    hospitals,
    loading,
    error,
    refetch: fetchAllMapData,
  };
}
