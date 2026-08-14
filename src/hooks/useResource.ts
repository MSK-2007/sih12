import { useState, useEffect, useCallback } from 'react';
import { Resource, ResourceStatus, UpdateResourceInput } from '../types/resource';
import { getResourceById, updateResource, updateResourceStatus, updateResourceLocation } from '../services/resources';
import { supabase, isSupabaseConfigured } from '../services/supabase';

export function useResource(id: string | undefined) {
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadResource = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getResourceById(id);
      if (data) {
        setResource(data);
      } else {
        setError('Resource unit not found');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load resource details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadResource();
  }, [loadResource]);

  // Realtime subscription for single resource changes
  useEffect(() => {
    if (!id || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`resource_detail_${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'resources', filter: `id=eq.${id}` },
        () => {
          loadResource();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadResource]);

  const editResource = async (input: UpdateResourceInput) => {
    if (!id) return false;
    const updated = await updateResource(id, input);
    if (updated) {
      setResource(updated);
      return true;
    }
    return false;
  };

  const changeStatus = async (newStatus: ResourceStatus) => {
    if (!id) return false;
    const result = await updateResourceStatus(id, newStatus);
    if (result.success && result.resource) {
      setResource(result.resource);
      return true;
    }
    if (result.error) {
      setError(result.error);
    }
    return false;
  };

  const setLocation = async (lat: number, lng: number) => {
    if (!id) return false;
    const updated = await updateResourceLocation(id, lat, lng);
    if (updated) {
      setResource(updated);
      return true;
    }
    return false;
  };

  return {
    resource,
    loading,
    error,
    refetch: loadResource,
    editResource,
    changeStatus,
    setLocation,
  };
}
