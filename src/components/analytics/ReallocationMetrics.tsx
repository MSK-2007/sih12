import React from 'react';
import { ReallocationMetrics as ReallocationMetricsType } from '../../types/analytics';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  metrics: ReallocationMetricsType | null;
  loading: boolean;
}

const fmt = (v: number | null, suffix = '') => (v == null ? '—' : `${v}${suffix}`);

export const ReallocationMetrics: React.FC<Props> = ({ metrics: m, loading }) => {
  if (loading) return <div className="glass-panel p-6 rounded-xl border border-slate-800 animate-pulse h-56" />;
  if (!m) return null;

  const pieData = [
    { name: 'Approved', value: m.approved, color: '#22c55e' },
    { name: 'Rejected', value: m.rejected, color: '#ef4444' },
    { name: 'Pending', value: m.expired, color: '#64748b' },
  ].filter((d) => d.value > 0);

  const hasEtaData = m.avgEtaBefore != null && m.avgEtaAfter != null;

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1"><RefreshCw className="w-3 h-3 text-purple-400" /> Total Recommendations</div>
          <div className="text-2xl font-black text-white font-mono mt-1">{m.totalRecommendations}</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-emerald-500/20">
          <div className="text-[10px] font-bold uppercase text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{m.approved}</div>
          <div className="text-[10px] text-slate-600">{m.successful} successful</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-red-500/20">
          <div className="text-[10px] font-bold uppercase text-red-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</div>
          <div className="text-2xl font-black text-red-400 font-mono mt-1">{m.rejected}</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Success Rate</div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{fmt(m.successRatePercent, '%')}</div>
          <div className="text-[10px] text-slate-600">successful / approved</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart */}
        {pieData.length > 0 ? (
          <div className="glass-panel p-4 rounded-xl border border-slate-800">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-2">
              Recommendation Outcomes
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="glass-panel p-6 rounded-xl border border-slate-800 flex items-center justify-center text-xs text-slate-500">
            No reallocation data available.
          </div>
        )}

        {/* ETA Before/After */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-300">ETA Impact of Reallocation</div>
          {hasEtaData ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Avg ETA Before</span>
                <span className="font-mono font-bold text-slate-300">{fmt(m.avgEtaBefore, ' min')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Avg ETA After</span>
                <span className="font-mono font-bold text-emerald-400">{fmt(m.avgEtaAfter, ' min')}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                <span className="text-xs font-bold text-slate-300">ETA Improvement</span>
                <span className={`font-mono font-black text-sm ${(m.etaImprovementPercent ?? 0) > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {m.etaImprovementPercent != null && m.etaImprovementPercent > 0 ? `↓ ${m.etaImprovementPercent}%` : fmt(m.etaImprovementPercent, '%')}
                </span>
              </div>
              <div className="text-[10px] text-slate-600">
                Prototype: Before = RECOMMENDED assignments, After = DISPATCHED/ACCEPTED.
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-500">Insufficient ETA data for before/after comparison.</p>
          )}
        </div>
      </div>

      {/* Success definition note */}
      <div className="text-[10px] text-slate-600 px-1">
        ℹ Reallocation success definition: an approved assignment with allocation score ≥ 60/100 (proxy for quality improvement). See docs/analytics-definitions.md.
      </div>
    </div>
  );
};
