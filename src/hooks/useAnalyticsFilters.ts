import { useState, useCallback } from 'react';
import { AnalyticsFilter, DateRangePreset } from '../types/analytics';

const DEFAULT_FILTER: AnalyticsFilter = {
  preset: 'LAST_7_DAYS',
  priority: 'ALL',
  incidentType: 'ALL',
  resourceType: 'ALL',
};

export function useAnalyticsFilters() {
  const [filter, setFilter] = useState<AnalyticsFilter>(DEFAULT_FILTER);

  const setDateRange = useCallback((preset: DateRangePreset, from?: string, to?: string) => {
    setFilter((prev) => ({ ...prev, preset, from, to, simulationRunId: undefined }));
  }, []);

  const setSimulationRunId = useCallback((id: string | undefined) => {
    setFilter((prev) => ({ ...prev, simulationRunId: id, preset: 'SIMULATION_RUN' }));
  }, []);

  const setPriority = useCallback((priority: AnalyticsFilter['priority']) => {
    setFilter((prev) => ({ ...prev, priority }));
  }, []);

  const setIncidentType = useCallback((incidentType: AnalyticsFilter['incidentType']) => {
    setFilter((prev) => ({ ...prev, incidentType }));
  }, []);

  const setResourceType = useCallback((resourceType: AnalyticsFilter['resourceType']) => {
    setFilter((prev) => ({ ...prev, resourceType }));
  }, []);

  const reset = useCallback(() => {
    setFilter(DEFAULT_FILTER);
  }, []);

  return {
    filter,
    setDateRange,
    setSimulationRunId,
    setPriority,
    setIncidentType,
    setResourceType,
    reset,
  };
}
