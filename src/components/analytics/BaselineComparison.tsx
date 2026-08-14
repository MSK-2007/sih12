import React from 'react';
import { BaselineComparison as BaselineComparisonType } from '../../types/analytics';
import { TrendingDown, TrendingUp, Minus, AlertCircle } from 'lucide-react';

interface Props {
  comparison: BaselineComparisonType | null;
  loading: boolean;
}

const fmt = (v: number | null, suffix = '') => (v == null ? 'N/A' : `${v}${suffix}`);

function ImprovementBadge({ pct, lowerIsBetter }: { pct: number | null; lowerIsBetter: boolean }) {
  if (pct == null) return <span className="text-slate-500 text-xs font-mono">N/A</span>;
  const better = lowerIsBetter ? pct > 0 : pct > 0;
  if (pct === 0) return <span className="flex items-center gap-1 text-slate-400 text-xs font-bold"><Minus className="w-3 h-3" /> 0%</span>;
  return better ? (
    <span className="flex items-center gap-1 text-emerald-400 text-xs font-black">
      <TrendingDown className="w-3 h-3" /> ↓ {Math.abs(pct)}%
    </span>
  ) : (
    <span className="flex items-center gap-1 text-red-400 text-xs font-black">
      <TrendingUp className="w-3 h-3" /> ↑ {Math.abs(pct)}%
    </span>
  );
}

export const BaselineComparison: React.FC<Props> = ({ comparison: c, loading }) => {
  if (loading) return <div className="glass-panel p-6 rounded-xl border border-slate-800 animate-pulse h-56" />;
  if (!c) return null;

  return (
    <div className="space-y-4">
      {/* Prototype Disclaimer */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-300">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong>Prototype Approximation:</strong> Baseline = RECOMMENDED assignments (unoptimized nearest-unit suggestion). ResQAI = ACCEPTED/DISPATCHED assignments (operator-confirmed optimized dispatch). A true A/B experiment would require a parallel baseline simulation run with the same resource set and incident sequence. See <code>docs/analytics-definitions.md</code>.
        </div>
      </div>

      {!c.hasEnoughData && (
        <div className="glass-panel p-6 rounded-xl border border-slate-800 text-center text-sm text-slate-500">
          Insufficient data for baseline comparison. Run a simulation or dispatch resources to generate data.
        </div>
      )}

      {/* Comparison Table */}
      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-800 text-xs font-extrabold uppercase tracking-wider text-slate-300">
          Baseline vs ResQAI Performance Comparison
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-bold uppercase text-slate-500">
                <th className="px-4 py-2 text-left">Metric</th>
                <th className="px-4 py-2 text-right">Baseline</th>
                <th className="px-4 py-2 text-right text-blue-400">ResQAI</th>
                <th className="px-4 py-2 text-right">Improvement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {c.rows.map((row) => (
                <tr key={row.metric} className="hover:bg-slate-900/50 transition">
                  <td className="px-4 py-3 font-medium text-slate-300">{row.metric}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-400">
                    {fmt(row.baseline, row.unit)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-blue-400">
                    {fmt(row.resqai, row.unit)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ImprovementBadge pct={row.improvementPercent} lowerIsBetter={row.lowerIsBetter} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* WHY RESQAI Hero section */}
      {c.hasEnoughData && (
        <div className="glass-panel p-5 rounded-xl border border-blue-500/30 bg-blue-950/10">
          <div className="text-xs font-black uppercase tracking-widest text-blue-400 mb-4">
            WHY RESQAI? — Simulated Impact
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {c.rows.filter((r) => r.improvementPercent != null && r.improvementPercent !== 0).map((row) => (
              <div key={row.metric} className="text-center space-y-1">
                <div className="text-2xl font-black font-mono text-emerald-400">
                  {row.lowerIsBetter && (row.improvementPercent ?? 0) > 0 ? '↓' : '↑'} {Math.abs(row.improvementPercent ?? 0)}%
                </div>
                <div className="text-[11px] text-slate-300 font-medium">{row.metric}</div>
                <div className="text-[10px] text-slate-500">
                  {fmt(row.baseline, row.unit)} → {fmt(row.resqai, row.unit)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto-generated impact summary */}
      <div className="glass-panel p-4 rounded-xl border border-slate-700 bg-slate-900/60 text-sm text-slate-300 italic leading-relaxed">
        <span className="text-slate-500 not-italic text-[10px] font-bold uppercase block mb-1">Auto-generated Impact Summary</span>
        {c.impactSummary}
      </div>

      <div className="text-[10px] text-slate-600 px-1">
        ℹ This comparison is generated from actual calculated metrics. Values shown are from the prototype ResQAI system and should not be cited as real-world emergency-service guarantees.
      </div>
    </div>
  );
};
