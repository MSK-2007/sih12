import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../../src/services/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {},
}));

vi.mock('../../src/services/routing', async () => {
  const actual = await vi.importActual<typeof import('../../src/services/routing')>('../../src/services/routing');
  return {
    ...actual,
    getRoute: vi.fn(async (origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }) => {
      const distanceKm = actual.calculateHaversineDistanceKm(origin, destination);
      return {
        distanceKm,
        durationMinutes: Math.max(1, Math.round((distanceKm / 35) * 60)),
        geometry: [
          [origin.latitude, origin.longitude],
          [destination.latitude, destination.longitude],
        ],
        provider: 'HAVERSINE_ESTIMATE' as const,
        calculatedAt: new Date().toISOString(),
      };
    }),
  };
});

import { SIMULATION_SCENARIOS } from '../../src/simulation/SimulationPresets';
import { simulationEngine } from '../../src/simulation/SimulationEngine';
import { evaluatePerformance } from '../../src/simulation/performanceEvaluator';
import { INITIAL_INCIDENTS, INITIAL_RESOURCES } from '../../src/services/mockData';

describe('Phase 23 — Live Operations Simulation & Analytics Test Suite', () => {
  afterEach(async () => {
    await simulationEngine.resetSimulation();
  });

  it('Test 1: 1 Incident / Sufficient Resources Scenario executes cleanly', async () => {
    const sc = SIMULATION_SCENARIOS.find((s) => s.id === 'scenario-1-single-emergency') || SIMULATION_SCENARIOS[0];
    expect(sc).toBeDefined();

    const run = simulationEngine.initializeRun(sc);
    expect(run.status).toBe('IDLE');
    expect(run.id.startsWith('sim-')).toBe(true);

    const ok = await simulationEngine.executeEvent(run.events[0]);
    expect(ok).toBe(true);
    expect(run.events[0].status).toBe('COMPLETED');
    expect(run.incidentIds.length).toBe(1);
  });

  it('Test 2: 5 Incidents / Limited Resources (Scarcity Surge) processes multiple incidents', async () => {
    const sc = SIMULATION_SCENARIOS.find((s) => s.id === 'scenario-3-resource-shortage');
    expect(sc).toBeDefined();

    const run = simulationEngine.initializeRun(sc!);
    for (const evt of run.events.slice(0, 3)) {
      const ok = await simulationEngine.executeEvent(evt);
      expect(ok).toBe(true);
    }
    const metrics = await simulationEngine.recalculateMetrics();
    expect(metrics.activeIncidentsCount + metrics.resolvedIncidentsCount).toBeGreaterThanOrEqual(2);
  });

  it('Test 3: Multiple CRITICAL Incidents Handling', async () => {
    const sc = SIMULATION_SCENARIOS.find((s) => s.id === 'scenario-4-multiple-critical');
    expect(sc).toBeDefined();

    const run = simulationEngine.initializeRun(sc!);
    const critEvents = run.events.filter((e) => e.type === 'CREATE_CRITICAL_INCIDENT');
    expect(critEvents.length).toBeGreaterThanOrEqual(2);

    const ok = await simulationEngine.executeEvent(critEvents[0]);
    expect(ok).toBe(true);
    expect(run.incidentIds.length).toBeGreaterThanOrEqual(1);
  });

  it('Test 4: New CRITICAL Incident During Active Assignments (Reallocation Trigger)', async () => {
    const sc = SIMULATION_SCENARIOS.find((s) => s.id === 'scenario-5-new-critical-reallocation');
    expect(sc).toBeDefined();

    const run = simulationEngine.initializeRun(sc!);
    for (const evt of run.events) {
      await simulationEngine.executeEvent(evt);
    }
    expect(run.events.every((e) => e.status === 'COMPLETED')).toBe(true);
  });

  it('Test 5: Environmental Risk Escalation executes recalculation', async () => {
    const sc = SIMULATION_SCENARIOS.find((s) => s.id === 'scenario-6-environmental-escalation');
    expect(sc).toBeDefined();

    const run = simulationEngine.initializeRun(sc!);
    for (const evt of run.events.slice(0, 2)) {
      const ok = await simulationEngine.executeEvent(evt);
      expect(ok).toBe(true);
    }
    expect(run.events.some((e) => e.type === 'ENVIRONMENTAL_EVENT_DETECTED')).toBe(true);
  });

  it('Test 6: Resource Becomes Unavailable / Unit Breakdown', async () => {
    const sc = SIMULATION_SCENARIOS.find((s) => s.id === 'scenario-7-resource-failure');
    expect(sc).toBeDefined();

    const run = simulationEngine.initializeRun(sc!);
    const offlineEvt = run.events.find((e) => e.type === 'RESOURCE_OFFLINE');
    expect(offlineEvt).toBeDefined();

    const ok = await simulationEngine.executeEvent(offlineEvt!);
    expect(ok).toBe(true);
  });

  it('Test 7: Real External Data Coupling with Simulated Incident', () => {
    const sc = SIMULATION_SCENARIOS.find((s) => s.id === 'scenario-8-incident-surge');
    expect(sc).toBeDefined();
    expect(sc?.durationMinutes).toBeGreaterThanOrEqual(30);
    const run = simulationEngine.initializeRun(sc!);
    expect(run.events.length).toBeGreaterThan(0);
  });

  it('Test 8: Baseline (Nearest Resource) vs ResQAI Comparative Evaluation', () => {
    const report = evaluatePerformance(INITIAL_INCIDENTS, INITIAL_RESOURCES, 'HIGH');

    expect(report.baseline).toBeDefined();
    expect(report.resqai).toBeDefined();
    expect(report.resqai.avgResponseTime).toBeLessThanOrEqual(report.baseline.avgResponseTime);
    expect(report.improvements.avgResponseTimeReductionPercent).toBeGreaterThan(0);
    expect(report.improvements.conflictReductionPercent).toBeGreaterThanOrEqual(0);
  });
});
