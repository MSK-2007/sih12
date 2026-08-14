import React from 'react';
import { Resource } from '../../types/resource';
import { Incident } from '../../types/incident';
import { CheckCircle2, ShieldCheck, MapPin, Clock } from 'lucide-react';

interface Props {
  incident: Incident;
  recommendedResource: Resource;
  score: number;
  etaMinutes: number;
  distanceKm: number;
}

export const AllocationExplanationCard: React.FC<Props> = ({
  incident,
  recommendedResource,
  score,
  etaMinutes,
  distanceKm,
}) => {
  return (
    <div className="glass-panel p-5 rounded-xl border border-blue-500/30 bg-blue-950/10 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-400" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">WHY THIS RESOURCE?</h3>
        </div>
        <div className="px-2.5 py-1 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300 font-mono font-bold text-xs">
          Match Score: {score}/100
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] text-slate-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Capability</div>
          <div className="text-emerald-400 font-bold mt-1">MATCHED ✓</div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] text-slate-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Availability</div>
          <div className="text-emerald-400 font-bold mt-1">AVAILABLE ✓</div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3 text-amber-400" /> Estimated ETA</div>
          <div className="text-amber-400 font-bold mt-1">{etaMinutes} min</div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3 text-cyan-400" /> Distance</div>
          <div className="text-cyan-400 font-bold mt-1">{distanceKm} km</div>
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-slate-300 bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Decision Support Logic</div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-bold">•</span>
          <span>Resource <strong>{recommendedResource.resourceCode}</strong> ({recommendedResource.name || 'Emergency Unit'}) has requested capabilities.</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-bold">•</span>
          <span>Shortest projected response route ({distanceKm} km, {etaMinutes} min).</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-bold">•</span>
          <span>Prioritized for {incident.priorityLevel} emergency ({incident.incidentNumber}).</span>
        </div>
      </div>
    </div>
  );
};
