import { SimulationRun, SimulationScenario, SimulationEvent, SimulationMode } from '../types/simulation';
import { SIMULATION_SCENARIOS } from '../simulation/SimulationPresets';
import { SimulationClock } from '../simulation/SimulationClock';
import { simulationEngine } from '../simulation/SimulationEngine';
import { generateSimulationIncident } from '../simulation/incidentGenerator';

let activeClock: SimulationClock | null = null;
let currentRunState: SimulationRun | null = null;
let listeners: Array<(run: SimulationRun | null) => void> = [];

function notifyListeners() {
  listeners.forEach((l) => l(currentRunState ? { ...currentRunState } : null));
}

export function subscribeSimulationState(callback: (run: SimulationRun | null) => void) {
  listeners.push(callback);
  callback(currentRunState ? { ...currentRunState } : null);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

export function getAvailableScenarios(): SimulationScenario[] {
  return SIMULATION_SCENARIOS;
}

export async function initializeSimulation(
  scenarioId: string = 'urban-surge',
  mode: SimulationMode = 'AUTOMATIC'
): Promise<SimulationRun> {
  const scenario = SIMULATION_SCENARIOS.find((s) => s.id === scenarioId) || SIMULATION_SCENARIOS[1];

  await simulationEngine.resetSimulation();
  currentRunState = simulationEngine.initializeRun(scenario, mode);

  activeClock = new SimulationClock('10:30:00');
  notifyListeners();
  return currentRunState;
}

export async function startSimulation(): Promise<boolean> {
  if (!currentRunState || !activeClock) return false;

  currentRunState.status = 'RUNNING';
  activeClock.start(async (timeStr, elapsedSeconds) => {
    if (!currentRunState) return;

    currentRunState.currentTime = timeStr;
    currentRunState.elapsedSeconds = elapsedSeconds;

    // Check for pending due events based on offset minutes
    const elapsedMins = Math.floor(elapsedSeconds / 60);
    const dueEvents = currentRunState.events.filter(
      (e) => e.status === 'PENDING' && e.offsetMinutes <= elapsedMins
    );

    for (const evt of dueEvents) {
      await simulationEngine.executeEvent(evt);
    }

    // Check if scenario completed
    const allCompleted = currentRunState.events.every((e) => e.status === 'COMPLETED' || e.status === 'FAILED');
    if (allCompleted && dueEvents.length === 0 && elapsedMins >= 25) {
      currentRunState.status = 'COMPLETED';
      activeClock?.pause();
    }

    notifyListeners();
  });

  notifyListeners();
  return true;
}

export function pauseSimulation(): boolean {
  if (!currentRunState || !activeClock) return false;
  currentRunState.status = 'PAUSED';
  activeClock.pause();
  notifyListeners();
  return true;
}

export function resumeSimulation(): boolean {
  if (!currentRunState || !activeClock) return false;
  currentRunState.status = 'RUNNING';
  activeClock.resume();
  notifyListeners();
  return true;
}

export async function stepSimulation(): Promise<boolean> {
  if (!currentRunState) return false;

  const nextPending = currentRunState.events.find((e) => e.status === 'PENDING');
  if (nextPending) {
    await simulationEngine.executeEvent(nextPending);
    notifyListeners();
    return true;
  }
  return false;
}

export function stopSimulation(): boolean {
  if (!currentRunState || !activeClock) return false;
  currentRunState.status = 'STOPPED';
  activeClock.stop();
  notifyListeners();
  return true;
}

export async function resetSimulation(): Promise<boolean> {
  if (activeClock) activeClock.reset();
  await simulationEngine.resetSimulation();
  currentRunState = null;
  notifyListeners();
  return true;
}

export function setSimulationSpeed(speed: number) {
  if (activeClock && currentRunState) {
    currentRunState.speedMultiplier = speed;
    activeClock.setSpeed(speed);
    notifyListeners();
  }
}

export async function triggerManualEvent(type: string, customPayload?: any): Promise<boolean> {
  if (!currentRunState) {
    await initializeSimulation('urban-surge', 'MANUAL');
  }

  if (!currentRunState) return false;

  let payload = customPayload;
  if (!payload) {
    if (type === 'CREATE_CRITICAL_INCIDENT') {
      payload = generateSimulationIncident('BUILDING_COLLAPSE', 0, 20);
    } else if (type === 'CREATE_INCIDENT') {
      payload = generateSimulationIncident('ROAD_ACCIDENT', 1, 4);
    } else if (type === 'RESOURCE_OFFLINE') {
      payload = { resourceCode: 'AMB-01' };
    } else {
      payload = generateSimulationIncident('MEDICAL', 2, 2);
    }
  }

  const newEvt: SimulationEvent = {
    id: `manual-evt-${Date.now()}`,
    simulationRunId: currentRunState.id,
    simulatedTime: currentRunState.currentTime,
    offsetMinutes: Math.floor(currentRunState.elapsedSeconds / 60),
    type: type as any,
    payload,
    status: 'PENDING',
  };

  currentRunState.events.push(newEvt);
  await simulationEngine.executeEvent(newEvt);
  notifyListeners();
  return true;
}
