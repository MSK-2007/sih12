import React from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, CheckCircle2, Zap } from 'lucide-react';

interface Props {
  onTrigger: (type: string) => void;
  disabled?: boolean;
}

export const ManualEventPanel: React.FC<Props> = ({ onTrigger, disabled = false }) => {
  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
            MANUAL EVENT INJECTION
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500 uppercase">Live Injection</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => onTrigger('CREATE_CRITICAL_INCIDENT')}
          disabled={disabled}
          className="p-2.5 rounded-lg bg-red-950/30 hover:bg-red-900/50 border border-red-500/40 text-red-300 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow disabled:opacity-50"
        >
          <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
          + Critical Incident
        </button>

        <button
          onClick={() => onTrigger('CREATE_INCIDENT')}
          disabled={disabled}
          className="p-2.5 rounded-lg bg-amber-950/30 hover:bg-amber-900/50 border border-amber-500/40 text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow disabled:opacity-50"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          + Standard Emergency
        </button>

        <button
          onClick={() => onTrigger('RESOURCE_OFFLINE')}
          disabled={disabled}
          className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow disabled:opacity-50"
        >
          <AlertCircle className="w-4 h-4 text-orange-400" />
          Unit Offline (AMB-01)
        </button>

        <button
          onClick={() => onTrigger('RESOLVE_INCIDENT')}
          disabled={disabled}
          className="p-2.5 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/50 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Resolve Emergency
        </button>
      </div>
    </div>
  );
};
