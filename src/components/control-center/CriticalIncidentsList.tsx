import React from 'react';
import { Incident } from '../../types/incident';
import { AlertTriangle, Users, MapPin, ArrowRight } from 'lucide-react';

interface Props {
  incidents: Incident[];
  onOpenIncident: (id: string) => void;
}

export const CriticalIncidentsList: React.FC<Props> = ({ incidents, onOpenIncident }) => {
  return (
    <div className="glass-panel p-4 rounded-xl border border-red-500/30 bg-red-950/10 space-y-3">
      <div className="flex items-center justify-between border-b border-red-500/20 pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-red-400">
            CRITICAL EMERGENCIES ({incidents.length})
          </h2>
        </div>
        <span className="text-[10px] font-mono text-red-300 font-bold uppercase">Highest Priority</span>
      </div>

      {incidents.length === 0 ? (
        <div className="p-4 text-center text-xs text-slate-400 font-medium">
          ✓ No active CRITICAL incidents requiring immediate dispatch.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {incidents.map((inc) => {
            const isUnassigned = inc.status === 'REPORTED' || inc.status === 'ANALYSING' || inc.status === 'PRIORITIZED' || inc.status === 'AWAITING_DISPATCH';
            return (
              <div
                key={inc.id}
                className={`p-3 rounded-lg border flex items-center justify-between gap-3 text-xs transition ${
                  isUnassigned
                    ? 'bg-red-950/30 border-red-500/50 ring-1 ring-red-500/30'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-100">{inc.incidentNumber}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-red-500/20 text-red-400 border border-red-500/40 font-mono">
                      {inc.priorityScore}/100
                    </span>
                    <span className="text-slate-400 text-[11px] font-semibold truncate">
                      {inc.emergencyType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-slate-200 font-medium line-clamp-1">{inc.title}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" /> {inc.address}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-500" /> {inc.peopleAffected} affected
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      isUnassigned
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    {isUnassigned ? 'UNASSIGNED' : inc.status}
                  </span>

                  <button
                    onClick={() => onOpenIncident(inc.id)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold text-[11px] border border-slate-700 transition flex items-center gap-1"
                  >
                    Open
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
