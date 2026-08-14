import React from 'react';
import { ResourceMetrics } from '../../types/analytics';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';

interface Props {
  metrics: ResourceMetrics | null;
  loading: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  AMBULANCE: '#ef4444',
  FIRE_UNIT: '#f97316',
  POLICE_UNIT: '#3b82f6',
  RESCUE_TEAM: '#a855f7',
};

export const ResourceUtilizationChart: React.FC<Props> = ({ metrics: m, loading }) => {
  if (loading) return <div className="glass-panel p-4 rounded-xl border border-slate-800 animate-pulse h-48" />;
  if (!m || m.byType.every((bt) => bt.utilizationPercent == null)) {
    return (
      <div className="glass-panel p-6 rounded-xl border border-slate-800 text-center">
        <p className="text-xs text-slate-500">No utilization data available.</p>
      </div>
    );
  }

  const data = m.byType
    .filter((bt) => bt.total > 0)
    .map((bt) => ({
      name: bt.label,
      type: bt.resourceType,
      utilization: bt.utilizationPercent ?? 0,
      available: bt.available,
      assigned: bt.assigned + bt.busy,
    }));

  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-800">
      <div className="text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-4">
        Resource Utilization by Type (%)
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
            formatter={(v: number, _name: string) => [`${v}%`, 'Utilization']}
          />
          <Bar dataKey="utilization" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="utilization" position="top" style={{ fill: '#94a3b8', fontSize: 10 }} formatter={(v: number) => `${v}%`} />
            {data.map((entry) => (
              <Cell key={entry.type} fill={TYPE_COLORS[entry.type] || '#64748b'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
