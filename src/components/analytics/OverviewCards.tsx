import React from 'react';
import { OverviewMetrics } from '../../types/analytics';
import { Radio, AlertTriangle, Clock, Activity, RefreshCw, AlertCircle } from 'lucide-react';

interface Props {
  metrics: OverviewMetrics | null;
  loading: boolean;
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col gap-1 min-w-0">
      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${color}`}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="text-2xl font-black text-white font-mono leading-tight">{value}</div>
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </div>
  );
}

export const OverviewCards: React.FC<Props> = ({ metrics: m, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-panel p-4 rounded-xl border border-slate-800 animate-pulse h-20" />
        ))}
      </div>
    );
  }

  const fmt = (v: number | null, suffix = '') =>
    v == null ? '—' : `${v}${suffix}`;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <KpiCard
        label="Total Incidents"
        value={m?.totalIncidents ?? '—'}
        icon={Radio}
        color="text-cyan-400"
        sub={`${m?.resolvedIncidents ?? 0} resolved`}
      />
      <KpiCard
        label="Critical"
        value={m?.criticalIncidents ?? '—'}
        icon={AlertTriangle}
        color="text-red-400"
        sub={`${m?.highIncidents ?? 0} high`}
      />
      <KpiCard
        label="Avg Response"
        value={fmt(m?.avgResponseMinutes ?? null, ' min')}
        icon={Clock}
        color="text-amber-400"
        sub="time to first dispatch"
      />
      <KpiCard
        label="Utilization"
        value={fmt(m?.resourceUtilizationPercent ?? null, '%')}
        icon={Activity}
        color="text-blue-400"
        sub="assignment-based"
      />
      <KpiCard
        label="Realloc Success"
        value={fmt(m?.reallocationSuccessRate ?? null, '%')}
        icon={RefreshCw}
        color="text-purple-400"
        sub="accepted / total"
      />
      <KpiCard
        label="Unassigned"
        value={m?.unassignedIncidents ?? '—'}
        icon={AlertCircle}
        color={m?.unassignedIncidents ? 'text-orange-400' : 'text-emerald-400'}
        sub={m?.totalResources ? `of ${m.totalResources} resources` : undefined}
      />
    </div>
  );
};
