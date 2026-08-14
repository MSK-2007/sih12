import React from 'react';
import { Play, Sparkles } from 'lucide-react';

interface Props {
  onStartDemo: () => void;
  isRunning: boolean;
}

export const DemoModePanel: React.FC<Props> = ({ onStartDemo, isRunning }) => {
  return (
    <div className="glass-panel p-4 rounded-xl border border-amber-500/40 bg-amber-950/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold shadow-lg">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            HACKATHON DEMO MODE
          </h3>
          <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
            Guided 3-minute scenario demonstrating: Intake → Priority → Allocation → Unit Failure → Reallocation → Operator Confirmation.
          </p>
        </div>
      </div>

      <button
        onClick={onStartDemo}
        disabled={isRunning}
        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs transition flex items-center gap-2 shadow-lg shrink-0 disabled:opacity-50"
      >
        <Play className="w-4 h-4 fill-current" />
        START HACKATHON DEMO
      </button>
    </div>
  );
};
