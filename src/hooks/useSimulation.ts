import { useState, useEffect, useCallback } from 'react';
import { SimulationRun, SimulationScenario, SimulationMode } from '../types/simulation';
import {
  subscribeSimulationState,
  getAvailableScenarios,
  initializeSimulation,
  startSimulation,
  pauseSimulation,
  resumeSimulation,
  stepSimulation,
  stopSimulation,
  resetSimulation,
  setSimulationSpeed,
  triggerManualEvent,
} from '../services/simulation';

export function useSimulation() {
  const [runState, setRunState] = useState<SimulationRun | null>(null);
  const [scenarios] = useState<SimulationScenario[]>(getAvailableScenarios());

  useEffect(() => {
    const unsubscribe = subscribeSimulationState((state) => {
      setRunState(state);
    });
    return () => unsubscribe();
  }, []);

  const handleInit = useCallback(async (scenarioId?: string, mode?: SimulationMode) => {
    return await initializeSimulation(scenarioId, mode);
  }, []);

  const handleStart = useCallback(async () => {
    if (!runState) {
      await initializeSimulation('urban-surge', 'AUTOMATIC');
    }
    return await startSimulation();
  }, [runState]);

  const handlePause = useCallback(() => {
    return pauseSimulation();
  }, []);

  const handleResume = useCallback(() => {
    return resumeSimulation();
  }, []);

  const handleStep = useCallback(async () => {
    if (!runState) {
      await initializeSimulation('urban-surge', 'STEP');
    }
    return await stepSimulation();
  }, [runState]);

  const handleStop = useCallback(() => {
    return stopSimulation();
  }, []);

  const handleReset = useCallback(async () => {
    return await resetSimulation();
  }, []);

  const handleSpeed = useCallback((speed: number) => {
    setSimulationSpeed(speed);
  }, []);

  const handleTriggerManual = useCallback(async (type: string, payload?: any) => {
    return await triggerManualEvent(type, payload);
  }, []);

  return {
    runState,
    scenarios,
    status: runState?.status || 'IDLE',
    currentTime: runState?.currentTime || '10:30:00',
    metrics: runState?.metrics || null,
    events: runState?.events || [],
    speed: runState?.speedMultiplier || 1,
    initialize: handleInit,
    start: handleStart,
    pause: handlePause,
    resume: handleResume,
    step: handleStep,
    stop: handleStop,
    reset: handleReset,
    setSpeed: handleSpeed,
    triggerManual: handleTriggerManual,
  };
}
