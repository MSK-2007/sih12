import React from 'react';
import { IncidentMetrics as IncidentMetricsType } from '../../types/analytics';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Radio, Clock, AlertCircle } from 'lucide-react';

interface Props {
  metrics: IncidentMetricsType | null;
  loading: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#f59e0b',
  LOW: '#3b82f6',
};

const STATUS_LABELS: Record<string, string> = {
  REPORTED: 'Reported',
  ANALYSING: 'Analysing',
  PRIORITIZED: 'Prioritized',
  AWAITING_DISPATCH: 'Awaiting Dispatch',
  DISPATCHED: 'Dispatched',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

const fmt = (v: number | null, suffix = '') => (v == null ? '—' : `${v}${suffix}`);

export const IncidentAnalytics: React.FC<Props> = ({ metrics: m, loading }) => {
  if (loading) return <div className="glass-panel p-6 rounded-xl border border-slate-800 animate-pulse h-56" />;
  if (!m || m.total === 0) {
    return (
      <div className="glass-panel p-8 rounded-xl border border-slate-800 text-center">
        <Radio className="w-8 h-8 text-slate-700 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No incident data available for the selected period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-3 rounded-lg border border-slate-800 text-center">
          <div className="text-[10px] font-bold uppercase text-slate-500">Total</div>
          <div className="text-2xl font-black text-white font-mono mt-1">{m.total}</div>
        </div>
        <div className="glass-panel p-3 rounded-lg border border-slate-800 text-center">
          <div className="text-[10px] font-bold uppercase text-slate-500">Resolution Rate</div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{fmt(m.resolutionRatePercent, '%')}</div>
        </div>
        <div className="glass-panel p-3 rounded-lg border border-slate-800 text-center">
          <div className="text-[10px] font-bold uppercase text-slate-500">Avg Wait</div>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">{fmt(m.avgWaitMinutes, ' min')}</div>
          <div className="text-[10px] text-slate-600">creation → assigned</div>
        </div>
        <div className="glass-panel p-3 rounded-lg border border-slate-800 text-center">
          <div className="text-[10px] font-bold uppercase text-slate-500">Avg Resolution</div>
          <div className="text-2xl font-black text-blue-400 font-mono mt-1">{fmt(m.avgResolutionMinutes, ' min')}</div>
          <div className="text-[10px] text-slate-600">creation → resolved</div>
        </div>
      </div>

      {/* By Type + By Priority side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Incident Type Bar Chart */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-3">Incidents by Type</div>
          {m.byType.length === 0 ? (
            <p className="text-xs text-slate-500">No data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={m.byType} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  dataKey="label"
                  type="category"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number, _: string, entry: any) => [`${v} (${entry.payload.percent}%)`, 'Incidents']}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="#38bdf8" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By Priority */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-3">Incidents by Priority</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={m.byPriority} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="priority" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                formatter={(v: number, _: string, entry: any) => [`${v} (${entry.payload.percent}%)`, 'Incidents']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {m.byPriority.map((entry) => (
                  <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] || '#64748b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Incident Status Table */}
      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-800 text-xs font-extrabold uppercase tracking-wider text-slate-300">
          Incidents by Status
        </div>
        <div className="divide-y divide-slate-800">
          {m.byStatus.map((row) => (
            <div key={row.status} className="px-4 py-2.5 flex items-center gap-4">
              <span className="text-xs text-slate-300 w-36 shrink-0">{STATUS_LABELS[row.status] || row.status}</span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${row.percent}%` }}
                />
              </div>
              <span className="font-mono text-xs text-slate-400 w-10 text-right">{row.count}</span>
              <span className="font-mono text-xs text-slate-600 w-10 text-right">{row.percent}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Wait & Unassigned */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" /> Wait Time Analysis
          </div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between"><span className="text-slate-400">Avg Wait</span><span className="text-white">{fmt(m.avgWaitMinutes, ' min')}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Critical Wait</span><span className="text-red-400">{fmt(m.criticalWaitMinutes, ' min')}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Longest Wait</span><span className="text-orange-400">{fmt(m.longestWaitMinutes, ' min')}</span></div>
          </div>
          <div className="text-[10px] text-slate-600 mt-1">Wait = incident.createdAt → first assignment.recommendedAt</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-400" /> Unassigned Incidents
          </div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between"><span className="text-slate-400">Total Unassigned</span><span className={m.unassignedCount > 0 ? 'text-orange-400' : 'text-emerald-400'}>{m.unassignedCount}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Critical Unassigned</span><span className={m.criticalUnassignedCount > 0 ? 'text-red-400' : 'text-emerald-400'}>{m.criticalUnassignedCount}</span></div>
          </div>
          <div className="text-[10px] text-slate-600 mt-1">Unassigned = REPORTED / ANALYSING / PRIORITIZED / AWAITING_DISPATCH status</div>
        </div>
      </div>
    </div>
  );
};
