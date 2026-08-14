import { describe, it, expect } from 'vitest';
import { simulationEngine } from '../../src/simulation/SimulationEngine';
import { SIMULATION_SCENARIOS } from '../../src/simulation/SimulationPresets';

describe('Emergency Simulation Engine Tests', () => {
  it('should initialize scenario "Urban Emergency Surge" with preset event queue', () => {
    const surgeScenario = SIMULATION_SCENARIOS.find(s => s.id === 'urban-surge') || SIMULATION_SCENARIOS[0];
    expect(surgeScenario).toBeDefined();
    expect(surgeScenario.events.length).toBeGreaterThan(0);

    const run = simulationEngine.initializeRun(surgeScenario);
    expect(run).toBeDefined();
    expect(run.status).toBe('IDLE');
    expect(run.scenarioId).toBe(surgeScenario.id);
  });

  it('should maintain simulation isolation by assigning "sim-" prefix to simulated run IDs', () => {
    const surgeScenario = SIMULATION_SCENARIOS[0];
    const run = simulationEngine.initializeRun(surgeScenario);

    expect(run.id.startsWith('sim-')).toBe(true);
  });

  it('should allow reset simulation controls safely', async () => {
    const surgeScenario = SIMULATION_SCENARIOS[0];
    simulationEngine.initializeRun(surgeScenario);

    const resetOk = await simulationEngine.resetSimulation();
    expect(resetOk).toBe(true);
  });
});
