import React from 'react';
import { SimulationRunStatus } from '../../types/simulation';
import { Play, Pause, StepForward, RotateCcw, Square } from 'lucide-react';

interface Props {
  status: SimulationRunStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStep: () => void;
  onReset: () => void;
  onStop: () => void;
}

export const SimulationControls: React.FC<Props> = ({
  status,
  onStart,
  onPause,
  onResume,
  onStep,
  onReset,
  onStop,
}) => {
  const isRunning = status === 'RUNNING';
  const isPaused = status === 'PAUSED';

  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
          SIMULATION EXECUTION CONTROLS
        </h3>
        <span className="text-[10px] font-mono text-slate-500 uppercase">Scenario Control Panel</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!isRunning && !isPaused ? (
          <button
            onClick={onStart}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition flex items-center gap-2 shadow-lg"
          >
            <Play className="w-4 h-4 fill-current" />
            START SIMULATION
          </button>
        ) : isRunning ? (
          <button
            onClick={onPause}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs transition flex items-center gap-2 shadow-lg"
          >
            <Pause className="w-4 h-4 fill-current" />
            PAUSE
          </button>
        ) : (
          <button
            onClick={onResume}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition flex items-center gap-2 shadow-lg"
          >
            <Play className="w-4 h-4 fill-current" />
            RESUME
          </button>
        )}

        <button
          onClick={onStep}
          disabled={isRunning}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 rounded-lg font-bold text-xs transition flex items-center gap-1.5"
          title="Advance simulation by 1 event step"
        >
          <StepForward className="w-4 h-4" />
          STEP
        </button>

        <button
          onClick={onStop}
          disabled={status === 'IDLE' || status === 'STOPPED'}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 border border-slate-700 rounded-lg font-bold text-xs transition flex items-center gap-1.5"
        >
          <Square className="w-4 h-4 fill-current text-red-400" />
          STOP
        </button>

        <button
          onClick={onReset}
          className="px-3.5 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 rounded-lg font-bold text-xs transition flex items-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" />
          RESET SIMULATION
        </button>
      </div>
    </div>
  );
};
