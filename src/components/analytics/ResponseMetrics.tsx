import React from 'react';
import { ResponseMetrics as ResponseMetricsType } from '../../types/analytics';

import { Clock, AlertCircle } from 'lucide-react';

interface Props {
  metrics: ResponseMetricsType | null;
  loading: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'text-red-400 bg-red-950/40 border-red-500/30',
  HIGH: 'text-orange-400 bg-orange-950/30 border-orange-500/30',
  MEDIUM: 'text-amber-400 bg-amber-950/30 border-amber-500/30',
  LOW: 'text-blue-400 bg-blue-950/30 border-blue-500/30',
};

const fmt = (v: number | null, suffix = '') => (v == null ? '—' : `${v}${suffix}`);

export const ResponseMetrics: React.FC<Props> = ({ metrics: m, loading }) => {
  if (loading) return <div className="glass-panel p-6 rounded-xl border border-slate-800 animate-pulse h-40" />;
  if (!m) return null;

  if (m.insufficientData) {
    return (
      <div className="glass-panel p-6 rounded-xl border border-slate-800 flex items-center gap-3 text-slate-400">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-300">Insufficient Response Data</p>
          <p className="text-xs mt-1">Response time requires incidents with accepted/dispatched assignments. Create incidents and dispatch resources to generate data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Avg Response', value: fmt(m.avgResponseMinutes, ' min') },
          { label: 'Median', value: fmt(m.medianResponseMinutes, ' min') },
          { label: 'Fastest', value: fmt(m.fastestResponseMinutes, ' min') },
          { label: 'Slowest', value: fmt(m.slowestResponseMinutes, ' min') },
        ].map(({ label, value }) => (
          <div key={label} className="glass-panel p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {label}
            </div>
            <div className="text-xl font-black text-white font-mono mt-1">{value}</div>
          </div>
        ))}
      </div>

      {/* By Priority Table */}
      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-800 text-xs font-extrabold uppercase tracking-wider text-slate-300">
          Response Time by Priority — with Prototype Targets
        </div>
        <div className="divide-y divide-slate-800">
          {m.byPriority.map((row) => (
            <div key={row.priority} className="px-4 py-3 flex flex-wrap items-center gap-3">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${PRIORITY_COLORS[row.priority]}`}>
                {row.priority}
              </span>

              {/* Visual bar */}
              <div className="flex-1 min-w-32">
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      row.avgMinutes == null ? 'w-0' :
                      row.avgMinutes <= row.targetMinutes ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                    style={{ width: row.avgMinutes == null ? '0%' : `${Math.min(100, (row.avgMinutes / (row.targetMinutes * 2)) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 font-mono text-xs">
                <div>
                  <span className="text-slate-500 text-[10px]">Avg: </span>
                  <span className="text-white font-bold">{fmt(row.avgMinutes, ' min')}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Target: </span>
                  <span className="text-slate-400">{row.targetMinutes} min</span>
                  <span className="ml-0.5 text-[9px] text-slate-600">(prototype)</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Within target: </span>
                  <span className={`font-bold ${row.compliancePercent != null && row.compliancePercent >= 80 ? 'text-emerald-400' : 'text-orange-400'}`}>
                    {fmt(row.compliancePercent, '%')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">n: </span>
                  <span className="text-slate-300">{row.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-2 text-[10px] text-slate-600 border-t border-slate-800">
          ⚠ Prototype targets are not official emergency-service standards. They are configurable reference values for demonstration purposes.
        </div>
      </div>
    </div>
  );
};
