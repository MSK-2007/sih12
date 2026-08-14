import { useState, useCallback, useEffect } from 'react';
import {
  OverviewMetrics,
  ResponseMetrics,
  ResourceMetrics,
  AllocationMetrics,
  ReallocationMetrics,
  IncidentMetrics,
  BaselineComparison,
  SimulationAnalytics,
  AnalyticsFilter,
} from '../types/analytics';
import {
  getOverviewMetrics,
  getResponseMetrics,
  getResourceMetrics,
  getAllocationMetrics,
  getReallocationMetrics,
  getIncidentMetrics,
  getBaselineComparison,
  getSimulationAnalytics,
} from '../services/analytics';

interface AnalyticsState {
  overview: OverviewMetrics | null;
  response: ResponseMetrics | null;
  resources: ResourceMetrics | null;
  allocation: AllocationMetrics | null;
  reallocation: ReallocationMetrics | null;
  incidents: IncidentMetrics | null;
  baselineComparison: BaselineComparison | null;
  simulationAnalytics: SimulationAnalytics | null;
  loading: boolean;
  error: string | null;
}

export function useAnalytics(filter: AnalyticsFilter) {
  const [state, setState] = useState<AnalyticsState>({
    overview: null,
    response: null,
    resources: null,
    allocation: null,
    reallocation: null,
    incidents: null,
    baselineComparison: null,
    simulationAnalytics: null,
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [
        overview,
        response,
        resources,
        allocation,
        reallocation,
        incidents,
        baselineComparison,
        simulationAnalytics,
      ] = await Promise.all([
        getOverviewMetrics(filter),
        getResponseMetrics(filter),
        getResourceMetrics(filter),
        getAllocationMetrics(filter),
        getReallocationMetrics(filter),
        getIncidentMetrics(filter),
        getBaselineComparison(filter),
        getSimulationAnalytics(),
      ]);

      setState({
        overview,
        response,
        resources,
        allocation,
        reallocation,
        incidents,
        baselineComparison,
        simulationAnalytics,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || 'Failed to load analytics data.',
      }));
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    ...state,
    refresh: load,
  };
}
