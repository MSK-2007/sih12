import React from 'react';
import { AllocationMetrics as AllocationMetricsType } from '../../types/analytics';
import { Target, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface Props {
  metrics: AllocationMetricsType | null;
  loading: boolean;
}

const fmt = (v: number | null, suffix = '') => (v == null ? '—' : `${v}${suffix}`);

export const AllocationMetrics: React.FC<Props> = ({ metrics: m, loading }) => {
  if (loading) return <div className="glass-panel p-6 rounded-xl border border-slate-800 animate-pulse h-40" />;
  if (!m) return null;

  const scoreColor =
    m.avgAllocationScore == null ? 'text-slate-400'
    : m.avgAllocationScore >= 75 ? 'text-emerald-400'
    : m.avgAllocationScore >= 50 ? 'text-amber-400'
    : 'text-red-400';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Success Rate</div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{fmt(m.successRatePercent, '%')}</div>
          <div className="text-[10px] text-slate-600">incidents with dispatch</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1"><Target className="w-3 h-3 text-blue-400" /> Avg Score</div>
          <div className={`text-2xl font-black font-mono mt-1 ${scoreColor}`}>{fmt(m.avgAllocationScore, '/100')}</div>
          <div className="text-[10px] text-slate-600">{fmt(m.lowestAllocationScore)} – {fmt(m.highestAllocationScore)} range</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3 text-amber-400" /> Avg ETA</div>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">{fmt(m.avgEtaMinutes, ' min')}</div>
          <div className="text-[10px] text-slate-600">dispatched assignments</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1"><AlertCircle className="w-3 h-3 text-orange-400" /> Unassigned</div>
          <div className={`text-2xl font-black font-mono mt-1 ${m.unassignedCount > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>{m.unassignedCount}</div>
          <div className="text-[10px] text-slate-600">awaiting resource</div>
        </div>
      </div>

      {/* Allocation quality score visual */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Allocation Quality Score</span>
          <span className={`text-sm font-black font-mono ${scoreColor}`}>{fmt(m.avgAllocationScore, '/100')}</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              m.avgAllocationScore == null ? 'w-0 bg-slate-700'
              : m.avgAllocationScore >= 75 ? 'bg-emerald-500'
              : m.avgAllocationScore >= 50 ? 'bg-amber-500'
              : 'bg-red-500'
            }`}
            style={{ width: `${m.avgAllocationScore ?? 0}%` }}
          />
        </div>
        <div className="text-[10px] text-slate-600 mt-1">
          Score from Phase 8 Allocation Engine. Considers ETA, capability match, resource load, and distance.
        </div>
      </div>

      {/* Capability match */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Capability Match Rate</span>
          <span className="text-sm font-black font-mono text-purple-400">{fmt(m.capabilityMatchRatePercent, '%')}</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-purple-500" style={{ width: `${m.capabilityMatchRatePercent ?? 0}%` }} />
        </div>
        <div className="text-[10px] text-slate-600 mt-1">Assignments with score ≥ 60/100 (proxy for capability match)</div>
      </div>
    </div>
  );
};
