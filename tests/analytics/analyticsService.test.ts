import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/services/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {},
}));

import {
  getOverviewMetrics,
  getResponseMetrics,
  getResourceMetrics,
  getAllocationMetrics,
  getReallocationMetrics,
  getIncidentMetrics,
  getBaselineComparison,
  getSimulationAnalytics,
} from '../../src/services/analytics';
import { simulationEngine } from '../../src/simulation/SimulationEngine';
import { SIMULATION_SCENARIOS } from '../../src/simulation/SimulationPresets';

describe('Analytics Service Integration Tests (Actual App Modules)', () => {
  it('should compute overview, resource, incident, and baseline analytics from operational data', async () => {
    const filter = { preset: 'ALL_TIME' as const };

    const [overview, response, resources, allocation, reallocation, incidents, baseline] = await Promise.all([
      getOverviewMetrics(filter),
      getResponseMetrics(filter),
      getResourceMetrics(filter),
      getAllocationMetrics(filter),
      getReallocationMetrics(filter),
      getIncidentMetrics(filter),
      getBaselineComparison(filter),
    ]);

    expect(overview.totalIncidents).toBeGreaterThan(0);
    expect(resources.total).toBeGreaterThan(0);
    expect(resources.byType.length).toBe(4);
    expect(incidents.total).toBe(overview.totalIncidents);
    expect(response.byPriority.length).toBe(4);
    expect(allocation.unassignedCount).toBeGreaterThanOrEqual(0);
    expect(reallocation.totalRecommendations).toBeGreaterThanOrEqual(0);
    expect(baseline.rows.length).toBe(5);
    expect(baseline.impactSummary.length).toBeGreaterThan(0);
  });

  it('should handle empty date filter windows gracefully without NaN or zero-division errors', async () => {
    const emptyFilter = {
      preset: 'CUSTOM' as const,
      from: '2099-01-01T00:00:00.000Z',
      to: '2099-01-02T00:00:00.000Z',
    };

    const overview = await getOverviewMetrics(emptyFilter);
    const incidents = await getIncidentMetrics(emptyFilter);
    const baseline = await getBaselineComparison(emptyFilter);

    expect(overview.totalIncidents).toBe(0);
    expect(overview.avgResponseMinutes).toBeNull();
    expect(incidents.resolutionRatePercent).toBeNull();
    expect(baseline.hasEnoughData).toBe(false);
  });

  it('should report simulation analytics state before and after scenario initialization', async () => {
    await simulationEngine.resetSimulation();
    const emptySim = await getSimulationAnalytics();
    expect(emptySim.hasData).toBe(false);

    simulationEngine.initializeRun(SIMULATION_SCENARIOS[0]);
    const activeSim = await getSimulationAnalytics();
    expect(activeSim.hasData).toBe(true);
    expect(activeSim.currentRun?.scenarioName).toBe(SIMULATION_SCENARIOS[0].name);

    await simulationEngine.resetSimulation();
  });
});
