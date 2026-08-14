import { useState, useEffect, useCallback } from 'react';
import { ResourceAssignment } from '../types/assignment';
import { getResourceAssignments } from '../services/resources';
import { supabase, isSupabaseConfigured } from '../services/supabase';

export function useResourceAssignments(resourceId: string | undefined) {
  const [assignments, setAssignments] = useState<ResourceAssignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!resourceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getResourceAssignments(resourceId);
      setAssignments(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch assignment history');
    } finally {
      setLoading(false);
    }
  }, [resourceId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (!resourceId || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`resource_assignments_${resourceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resource_assignments', filter: `resource_id=eq.${resourceId}` },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resourceId, fetchHistory]);

  return {
    assignments,
    loading,
    error,
    refetch: fetchHistory,
  };
}
