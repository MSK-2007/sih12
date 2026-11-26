import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { simulationEngine } from '../../simulation/SimulationEngine';
import {
  BackendConnectionState,
  getBackendConnectionState,
  subscribeBackendConnection,
} from '../../services/supabase';

interface Props {
  onResetDemo?: () => void;
}

export const DemoBanner: React.FC<Props> = ({ onResetDemo }) => {
  const isRunning = simulationEngine.getActiveRun()?.status === 'RUNNING';
  const [backendState, setBackendState] = useState<BackendConnectionState>(() =>
    getBackendConnectionState()
  );

  useEffect(() => {
    return subscribeBackendConnection(setBackendState);
  }, []);

  const handleReset = async () => {
    await simulationEngine.resetSimulation();
    if (onResetDemo) onResetDemo();
    window.location.reload();
  };

  const isLive = backendState.mode === 'LIVE';
  const isOfflineError = backendState.mode === 'OFFLINE';

  return (
    <div
      className={`${
        isLive
          ? 'bg-emerald-500 text-black'
          : isOfflineError
          ? 'bg-amber-500 text-black'
          : 'bg-[#FF4D00] text-black'
      } border-b-2 border-black px-6 py-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-space tracking-tight`}
    >
      <div className="flex items-center gap-2 font-bold uppercase">
        {isLive ? (
          <Wifi className="w-4 h-4 shrink-0 text-black" />
        ) : isOfflineError ? (
          <WifiOff className="w-4 h-4 shrink-0 text-black" />
        ) : (
          <AlertTriangle className="w-4 h-4 shrink-0 text-black fill-black animate-pulse" />
        )}

        <span className="font-archivo text-sm">
          {isLive
            ? 'LIVE SUPABASE CONNECTED:'
            : isOfflineError
            ? 'BACKEND OFFLINE (FALLBACK CACHE):'
            : 'SIMULATION MODE:'}
        </span>

        <span className="hidden md:inline">
          {isLive
            ? `OPERATING ON LIVE DATABASE (${backendState.host}).`
            : isOfflineError
            ? `UNABLE TO REACH ${backendState.host}. SHOWING LOCAL FALLBACK STATE.`
            : 'ALL EMERGENCY DATA SHOWN IS SIMULATED FOR PLATFORM EVALUATION.'}
        </span>

        {isRunning && (
          <span className="ml-2 px-2.5 py-0.5 rounded-full bg-black text-[#FF4D00] font-mono text-[10px] font-bold">
            ACTIVE SIMULATION SCENARIO
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black text-white hover:bg-white hover:text-black text-[11px] font-bold uppercase transition border border-black"
          title="Safely reset simulated demo state without affecting database schema or users"
        >
          <RefreshCw className="w-3 h-3" />
          RESET DEMO DATA
        </button>
      </div>
    </div>
  );
};
