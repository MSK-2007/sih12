import React from 'react';
import { SimulationRunStatus } from '../../types/simulation';
import { Clock, Zap } from 'lucide-react';

interface Props {
  currentTime: string;
  status: SimulationRunStatus;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export const SimulationClockCard: React.FC<Props> = ({
  currentTime,
  status,
  speed,
  onSpeedChange,
}) => {
  const statusColor =
    status === 'RUNNING'
      ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40'
      : status === 'PAUSED'
      ? 'text-amber-400 bg-amber-950/60 border-amber-500/40'
      : status === 'COMPLETED'
      ? 'text-blue-400 bg-blue-950/60 border-blue-500/40'
      : 'text-slate-400 bg-slate-900 border-slate-700';

  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Clock & Status */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-purple-950/40 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold shadow-lg">
          <Clock className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Simulated Time</span>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-3xl font-black text-white tracking-tight">{currentTime}</span>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold border uppercase font-mono ${statusColor}`}>
              ● {status}
            </span>
          </div>
        </div>
      </div>

      {/* Speed Multipliers */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-amber-400" /> Speed:
        </span>
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono font-bold">
          {[1, 2, 5, 10].map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2.5 py-1 rounded transition ${
                speed === s
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
