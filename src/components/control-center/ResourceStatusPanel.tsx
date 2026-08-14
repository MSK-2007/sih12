import React from 'react';
import { ResourceTypeStatusSummary } from '../../services/controlCenter';
import { Truck } from 'lucide-react';

interface Props {
  summaries: ResourceTypeStatusSummary[];
}

export const ResourceStatusPanel: React.FC<Props> = ({ summaries }) => {
  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
            FLEET READINESS & AVAILABILITY
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-500 uppercase">Operational Status</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {summaries.map((s) => {
          return (
            <div key={s.type} className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">{s.label}</span>
                <span className="text-[10px] font-mono font-bold text-emerald-400">{s.available} free</span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full" style={{ width: `${(s.available / (s.total || 1)) * 100}%` }} title="Available" />
                <div className="bg-amber-500 h-full" style={{ width: `${(s.assigned / (s.total || 1)) * 100}%` }} title="Assigned" />
                <div className="bg-orange-500 h-full" style={{ width: `${(s.busy / (s.total || 1)) * 100}%` }} title="Busy" />
                <div className="bg-slate-600 h-full" style={{ width: `${(s.offline / (s.total || 1)) * 100}%` }} title="Offline" />
              </div>

              <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-mono pt-1">
                <div className="bg-slate-950/60 p-1 rounded border border-slate-800">
                  <span className="text-emerald-400 font-bold block">{s.available}</span>
                  <span className="text-slate-500 text-[9px]">AVL</span>
                </div>
                <div className="bg-slate-950/60 p-1 rounded border border-slate-800">
                  <span className="text-amber-400 font-bold block">{s.assigned}</span>
                  <span className="text-slate-500 text-[9px]">ASG</span>
                </div>
                <div className="bg-slate-950/60 p-1 rounded border border-slate-800">
                  <span className="text-orange-400 font-bold block">{s.busy}</span>
                  <span className="text-slate-500 text-[9px]">BUSY</span>
                </div>
                <div className="bg-slate-950/60 p-1 rounded border border-slate-800">
                  <span className="text-slate-400 font-bold block">{s.offline}</span>
                  <span className="text-slate-500 text-[9px]">OFF</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
