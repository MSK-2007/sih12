import React from 'react';
import { DashboardMetrics } from '../../services/controlCenter';
import { Radio, AlertTriangle, CheckCircle2, Truck, Clock, ShieldAlert, Activity } from 'lucide-react';

interface Props {
  metrics: DashboardMetrics | null;
  loading: boolean;
}

export const KpiGrid: React.FC<Props> = ({ metrics, loading }) => {
  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="glass-panel p-4 border border-white/20 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {/* 1. Active Incidents */}
      <div className="glass-panel p-3.5 border border-white/20 space-y-1">
        <span className="font-space text-[10px] font-bold uppercase tracking-tight text-slate-400 flex items-center gap-1">
          <Radio className="w-3.5 h-3.5 text-cyan-400" /> Active Incidents
        </span>
        <div className="flex items-baseline justify-between pt-1">
          <span className="font-archivo text-3xl font-extrabold text-white leading-none">{metrics.activeIncidentsCount}</span>
          <span className="font-space text-[10px] text-slate-500">units</span>
        </div>
      </div>

      {/* 2. Critical Incidents */}
      <div className="glass-panel p-3.5 border-2 border-red-500/50 bg-red-950/20 space-y-1">
        <span className="font-space text-[10px] font-bold uppercase tracking-tight text-red-400 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" /> Critical P1
        </span>
        <div className="flex items-baseline justify-between pt-1">
          <span className="font-archivo text-3xl font-extrabold text-red-400 leading-none">{metrics.criticalIncidentsCount}</span>
          <span className="font-space text-[10px] text-red-300 font-bold">URGENT</span>
        </div>
      </div>

      {/* 3. Available Resources */}
      <div className="glass-panel p-3.5 border border-emerald-500/40 bg-emerald-950/10 space-y-1">
        <span className="font-space text-[10px] font-bold uppercase tracking-tight text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Available Pool
        </span>
        <div className="flex items-baseline justify-between pt-1">
          <span className="font-archivo text-3xl font-extrabold text-emerald-400 leading-none">{metrics.availableResourcesCount}</span>
          <span className="font-space text-[10px] text-slate-400">/{metrics.totalFleetCount}</span>
        </div>
      </div>

      {/* 4. Active Responses */}
      <div className="glass-panel p-3.5 border border-white/20 space-y-1">
        <span className="font-space text-[10px] font-bold uppercase tracking-tight text-[#FF4D00] flex items-center gap-1">
          <Truck className="w-3.5 h-3.5 text-[#FF4D00]" /> Dispatched
        </span>
        <div className="flex items-baseline justify-between pt-1">
          <span className="font-archivo text-3xl font-extrabold text-[#FF4D00] leading-none">{metrics.activeResponsesCount}</span>
          <span className="font-space text-[10px] text-slate-500">en route</span>
        </div>
      </div>

      {/* 5. Unassigned Incidents */}
      <div className="glass-panel p-3.5 border border-white/20 space-y-1">
        <span className="font-space text-[10px] font-bold uppercase tracking-tight text-slate-400 flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5 text-orange-400" /> Unassigned
        </span>
        <div className="flex items-baseline justify-between pt-1">
          <span className={`font-archivo text-3xl font-extrabold leading-none ${metrics.unassignedIncidentsCount > 0 ? 'text-orange-400' : 'text-slate-300'}`}>
            {metrics.unassignedIncidentsCount}
          </span>
          <span className="font-space text-[10px] text-slate-500">pending</span>
        </div>
      </div>

      {/* 6. Fleet Utilization */}
      <div className="glass-panel p-3.5 border border-white/20 space-y-1">
        <span className="font-space text-[10px] font-bold uppercase tracking-tight text-slate-400 flex items-center gap-1">
          <Activity className="w-3.5 h-3.5 text-blue-400" /> Fleet Load
        </span>
        <div className="flex items-baseline justify-between pt-1">
          <span className="font-archivo text-3xl font-extrabold text-blue-400 leading-none">{metrics.resourceUtilizationPercent}%</span>
          <span className="font-space text-[10px] text-slate-500">utilization</span>
        </div>
      </div>

      {/* 7. Average Response ETA */}
      <div className="glass-panel p-3.5 border border-white/20 space-y-1">
        <span className="font-space text-[10px] font-bold uppercase tracking-tight text-slate-400 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-cyan-400" /> Avg ETA
        </span>
        <div className="flex items-baseline justify-between pt-1">
          <span className="font-archivo text-3xl font-extrabold text-cyan-400 leading-none">
            {metrics.averageEtaMinutes !== null ? `${metrics.averageEtaMinutes}m` : 'N/A'}
          </span>
          <span className="font-space text-[10px] text-slate-500">response</span>
        </div>
      </div>
    </div>
  );
};
