import React from 'react';
import { ResponseMetrics } from '../../types/analytics';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface Props {
  metrics: ResponseMetrics | null;
  loading: boolean;
}

export const ResponseTrendChart: React.FC<Props> = ({ metrics: m, loading }) => {
  if (loading) return <div className="glass-panel p-4 rounded-xl border border-slate-800 animate-pulse h-56" />;
  if (!m || m.trend.length < 2) {
    return (
      <div className="glass-panel p-6 rounded-xl border border-slate-800 text-center">
        <p className="text-xs text-slate-500">
          {m?.trend.length === 0
            ? 'No response time trend data available. Dispatch resources to incidents to generate trend data.'
            : 'Need at least 2 data points for trend chart.'}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-800">
      <div className="text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-4">
        Response Time Trend (minutes)
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={m.trend} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            unit=" min"
          />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(v: number) => [`${v} min`, 'Avg Response']}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
          <Line
            type="monotone"
            dataKey="avgMinutes"
            name="Avg Response (min)"
            stroke="#38bdf8"
            strokeWidth={2}
            dot={{ fill: '#38bdf8', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
