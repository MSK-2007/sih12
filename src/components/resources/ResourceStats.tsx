import React from 'react';
import { Resource } from '../../types/resource';
import { Truck, CheckCircle2, Clock, Flame, Power } from 'lucide-react';

interface Props {
  resources: Resource[];
}

export const ResourceStats: React.FC<Props> = ({ resources }) => {
  const total = resources.length;
  const available = resources.filter((r) => r.status === 'AVAILABLE').length;
  const assigned = resources.filter((r) => r.status === 'ASSIGNED').length;
  const busy = resources.filter((r) => r.status === 'BUSY').length;
  const offline = resources.filter((r) => r.status === 'OFFLINE').length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {/* Total Resources */}
      <div className="glass-panel p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Total Fleet</span>
          <p className="text-2xl font-bold text-white mt-0.5">{total}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
          <Truck className="w-4 h-4" />
        </div>
      </div>

      {/* Available */}
      <div className="glass-panel p-3.5 rounded-xl border border-emerald-900/40 bg-emerald-950/10 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider block">Available</span>
          <p className="text-2xl font-bold text-emerald-400 mt-0.5">{available}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
        </div>
      </div>

      {/* Assigned */}
      <div className="glass-panel p-3.5 rounded-xl border border-amber-900/40 bg-amber-950/10 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-amber-400 uppercase tracking-wider block">Assigned</span>
          <p className="text-2xl font-bold text-amber-400 mt-0.5">{assigned}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <Clock className="w-4 h-4" />
        </div>
      </div>

      {/* Busy */}
      <div className="glass-panel p-3.5 rounded-xl border border-red-900/40 bg-red-950/10 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-red-400 uppercase tracking-wider block">Busy</span>
          <p className="text-2xl font-bold text-red-400 mt-0.5">{busy}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <Flame className="w-4 h-4" />
        </div>
      </div>

      {/* Offline */}
      <div className="glass-panel p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Offline</span>
          <p className="text-2xl font-bold text-slate-400 mt-0.5">{offline}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
          <Power className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
