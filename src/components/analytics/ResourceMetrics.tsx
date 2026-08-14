import React from 'react';
import { ResourceMetrics as ResourceMetricsType } from '../../types/analytics';
import { Truck } from 'lucide-react';

interface Props {
  metrics: ResourceMetricsType | null;
  loading: boolean;
}



const TYPE_ACCENT: Record<string, string> = {
  AMBULANCE: 'border-red-500/30',
  FIRE_UNIT: 'border-orange-500/30',
  POLICE_UNIT: 'border-blue-500/30',
  RESCUE_TEAM: 'border-purple-500/30',
};

const fmt = (v: number | null, suffix = '') => (v == null ? '—' : `${v}${suffix}`);

export const ResourceMetrics: React.FC<Props> = ({ metrics: m, loading }) => {
  if (loading) return <div className="glass-panel p-6 rounded-xl border border-slate-800 animate-pulse h-56" />;
  if (!m) return null;

  return (
    <div className="space-y-4">
      {/* Fleet Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: m.total, color: 'text-white' },
          { label: 'Available', value: m.available, color: 'text-emerald-400' },
          { label: 'Assigned', value: m.assigned, color: 'text-amber-400' },
          { label: 'Busy', value: m.busy, color: 'text-orange-400' },
          { label: 'Offline', value: m.offline, color: 'text-slate-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-panel p-3 rounded-lg border border-slate-800 text-center">
            <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
            <div className={`text-2xl font-black font-mono mt-1 ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Overall Utilization Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Overall Utilization</span>
          <span className="text-sm font-black font-mono text-blue-400">{fmt(m.overallUtilizationPercent, '%')}</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${m.overallUtilizationPercent ?? 0}%` }}
          />
        </div>
        <div className="text-[10px] text-slate-600 mt-1">
          Definition: (ASSIGNED + BUSY) / total active resources × 100 (assignment-based proxy)
        </div>
      </div>

      {/* By Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {m.byType.map((bt) => (
          <div key={bt.resourceType} className={`glass-panel p-4 rounded-xl border ${TYPE_ACCENT[bt.resourceType] || 'border-slate-800'}`}>
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-200">{bt.label}</span>
            </div>
            <div className="text-2xl font-black font-mono text-blue-400 mb-2">
              {fmt(bt.utilizationPercent, '%')}
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${bt.utilizationPercent ?? 0}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
              <span className="text-emerald-400">Avail: {bt.available}</span>
              <span className="text-amber-400">Assgn: {bt.assigned}</span>
              <span className="text-orange-400">Busy: {bt.busy}</span>
              <span className="text-slate-500">Offln: {bt.offline}</span>
            </div>
            <div className="text-[10px] text-slate-600 mt-1">total: {bt.total}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
