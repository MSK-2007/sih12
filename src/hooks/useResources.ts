import { useState, useEffect, useCallback } from 'react';
import { Resource, ResourceFilters } from '../types/resource';
import { getResources } from '../services/resources';
import { supabase, isSupabaseConfigured } from '../services/supabase';

export function useResources(initialFilters?: ResourceFilters) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [filters, setFilters] = useState<ResourceFilters>(initialFilters || {
    searchQuery: '',
    resourceType: 'ALL',
    status: 'ALL',
    departmentId: 'ALL',
    sortBy: 'status',
    sortOrder: 'asc',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getResources(filters);
      setResources(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch resources list');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Realtime subscription for resource changes
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('realtime_resources_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resources' },
        () => {
          fetchList();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchList]);

  const updateFilters = (newFilters: Partial<ResourceFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return {
    resources,
    filters,
    loading,
    error,
    refetch: fetchList,
    updateFilters,
  };
}
