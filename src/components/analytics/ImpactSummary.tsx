import React from 'react';
import { BaselineComparison, OverviewMetrics } from '../../types/analytics';
import { Zap, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';

interface Props {
  overview: OverviewMetrics | null;
  comparison: BaselineComparison | null;
  loading: boolean;
}

function ImpactStat({
  label,
  value,
  direction,
  color,
}: {
  label: string;
  value: string;
  direction: 'up' | 'down' | 'neutral';
  color: string;
}) {
  return (
    <div className="text-center p-4 rounded-xl bg-slate-900/60 border border-slate-800">
      <div className={`text-3xl font-black font-mono ${color} flex items-center justify-center gap-1`}>
        {direction === 'down' ? <TrendingDown className="w-6 h-6" /> : direction === 'up' ? <TrendingUp className="w-6 h-6" /> : null}
        {value}
      </div>
      <div className="text-xs text-slate-400 font-medium mt-1">{label}</div>
    </div>
  );
}

export const ImpactSummary: React.FC<Props> = ({ overview, comparison, loading }) => {
  if (loading) return <div className="glass-panel p-6 rounded-xl border border-slate-800 animate-pulse h-48" />;
  if (!comparison || !comparison.hasEnoughData) {
    return (
      <div className="glass-panel p-6 rounded-xl border border-slate-800 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-300">Insufficient Data for Impact Summary</p>
          <p className="text-xs text-slate-400 mt-1">
            Run a simulation scenario and dispatch resources to generate a meaningful impact analysis.
          </p>
        </div>
      </div>
    );
  }

  const rtRow = comparison.rows.find((r) => r.metric === 'Avg Response Time');
  const utilRow = comparison.rows.find((r) => r.metric === 'Resource Utilization');
  const unassignedRow = comparison.rows.find((r) => r.metric === 'Unassigned Incidents');
  const criticalRow = comparison.rows.find((r) => r.metric === 'Critical Response Time');

  return (
    <div className="glass-panel p-5 rounded-xl border border-emerald-500/30 bg-emerald-950/10 space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
          <Zap className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-sm font-black text-emerald-300 uppercase tracking-wider">ResQAI Impact Summary</h2>
          <p className="text-[10px] text-slate-500">In this prototype simulation — not real-world guarantees</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ImpactStat
          label="Avg Response Time"
          value={rtRow?.improvementPercent != null ? `↓ ${rtRow.improvementPercent.toFixed(1)}%` : '—'}
          direction={rtRow?.improvementPercent != null && rtRow.improvementPercent > 0 ? 'down' : 'neutral'}
          color={rtRow?.improvementPercent != null && rtRow.improvementPercent > 0 ? 'text-emerald-400' : 'text-slate-400'}
        />
        <ImpactStat
          label="Resource Utilization"
          value={utilRow?.improvementPercent != null ? `↑ ${utilRow.improvementPercent.toFixed(1)}%` : '—'}
          direction={utilRow?.improvementPercent != null && utilRow.improvementPercent > 0 ? 'up' : 'neutral'}
          color={utilRow?.improvementPercent != null && utilRow.improvementPercent > 0 ? 'text-blue-400' : 'text-slate-400'}
        />
        <ImpactStat
          label="Unassigned Incidents"
          value={unassignedRow?.improvementPercent != null ? `↓ ${unassignedRow.improvementPercent.toFixed(1)}%` : '—'}
          direction={unassignedRow?.improvementPercent != null && unassignedRow.improvementPercent > 0 ? 'down' : 'neutral'}
          color={unassignedRow?.improvementPercent != null && unassignedRow.improvementPercent > 0 ? 'text-emerald-400' : 'text-slate-400'}
        />
        <ImpactStat
          label="Critical Response"
          value={criticalRow?.improvementPercent != null ? `↓ ${criticalRow.improvementPercent.toFixed(1)}%` : '—'}
          direction={criticalRow?.improvementPercent != null && criticalRow.improvementPercent > 0 ? 'down' : 'neutral'}
          color={criticalRow?.improvementPercent != null && criticalRow.improvementPercent > 0 ? 'text-red-400' : 'text-slate-400'}
        />
      </div>

      <div className="text-sm text-slate-300 italic border-t border-slate-800 pt-4 leading-relaxed">
        {comparison.impactSummary}
      </div>

      {overview && (
        <div className="grid grid-cols-3 gap-3 text-center border-t border-slate-800 pt-4">
          <div>
            <div className="text-xl font-black font-mono text-white">{overview.totalIncidents}</div>
            <div className="text-[10px] text-slate-500">Total Incidents</div>
          </div>
          <div>
            <div className="text-xl font-black font-mono text-red-400">{overview.criticalIncidents}</div>
            <div className="text-[10px] text-slate-500">Critical</div>
          </div>
          <div>
            <div className="text-xl font-black font-mono text-emerald-400">{overview.resolvedIncidents}</div>
            <div className="text-[10px] text-slate-500">Resolved</div>
          </div>
        </div>
      )}
    </div>
  );
};
