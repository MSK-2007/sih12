import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import {
  getDashboardMetrics,
  getResourceTypeSummary,
  getActiveResponses,
  getOperatorAttentionItems,
  getSystemServiceStatus,
  DashboardMetrics,
  ResourceTypeStatusSummary,
  ActiveResponseItem,
  OperatorAttentionItem,
  SystemServiceStatus,
} from '../services/controlCenter';
import { getIncidents } from '../services/incidents';
import { getResources } from '../services/resources';
import { Incident, PriorityLevel } from '../types/incident';
import { Resource } from '../types/resource';

export function useControlCenter() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [typeSummaries, setTypeSummaries] = useState<ResourceTypeStatusSummary[]>([]);
  const [activeResponses, setActiveResponses] = useState<ActiveResponseItem[]>([]);
  const [attentionItems, setAttentionItems] = useState<OperatorAttentionItem[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemServiceStatus | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | 'ALL'>('ALL');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('ALL');

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [m, incList, resList, summaries, responses, attention, sys] = await Promise.all([
        getDashboardMetrics(),
        getIncidents(),
        getResources(),
        getResourceTypeSummary(),
        getActiveResponses(),
        getOperatorAttentionItems(),
        getSystemServiceStatus(),
      ]);

      setMetrics(m);
      setIncidents(incList);
      setResources(resList);
      setTypeSummaries(summaries);
      setActiveResponses(responses);
      setAttentionItems(attention);
      setSystemStatus(sys);
    } catch (err: any) {
      console.error('[useControlCenter] Load error:', err);
      setError('Unable to load emergency operational data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    if (!isSupabaseConfigured) return;

    // Realtime subscriptions for auto-refresh on database mutations
    const channel = supabase
      .channel('control-center-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_assignments' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Derived filtered active incidents
  const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED');

  const filteredIncidents = activeIncidents.filter((inc) => {
    if (priorityFilter !== 'ALL' && inc.priorityLevel !== priorityFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = inc.incidentNumber.toLowerCase().includes(q);
      const matchTitle = inc.title.toLowerCase().includes(q);
      const matchAddress = inc.address.toLowerCase().includes(q);
      const matchType = inc.emergencyType.toLowerCase().includes(q);
      if (!matchNum && !matchTitle && !matchAddress && !matchType) return false;
    }

    return true;
  });

  const criticalIncidents = activeIncidents
    .filter((i) => i.priorityLevel === 'CRITICAL')
    .sort((a, b) => b.priorityScore - a.priorityScore);

  return {
    metrics,
    incidents: filteredIncidents,
    allActiveIncidents: activeIncidents,
    criticalIncidents,
    resources,
    typeSummaries,
    activeResponses,
    attentionItems,
    systemStatus,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    resourceTypeFilter,
    setResourceTypeFilter,
    refresh: loadData,
  };
}
