import React from 'react';
import { SimulationAnalytics as SimulationAnalyticsType } from '../../types/analytics';
import { Play, CheckCircle2, AlertTriangle, Activity, Clock, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  analytics: SimulationAnalyticsType | null;
  loading: boolean;
}

const fmt = (v: number | null, suffix = '') => (v == null ? '—' : `${v}${suffix}`);

export const SimulationAnalytics: React.FC<Props> = ({ analytics: a, loading }) => {
  const navigate = useNavigate();

  if (loading) return <div className="glass-panel p-6 rounded-xl border border-slate-800 animate-pulse h-40" />;
  if (!a || !a.hasData || !a.currentRun) {
    return (
      <div className="glass-panel p-8 rounded-xl border border-slate-800 text-center space-y-3">
        <Play className="w-8 h-8 text-slate-700 mx-auto" />
        <p className="text-sm text-slate-500">No active simulation run data.</p>
        <p className="text-xs text-slate-600">Go to the Simulation page to run a scenario first.</p>
        <button
          onClick={() => navigate('/simulation')}
          className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold hover:bg-amber-500/30 transition"
        >
          Open Simulation →
        </button>
      </div>
    );
  }

  const run = a.currentRun;
  const completionPct = run.totalEvents > 0 ? Math.round((run.completedEvents / run.totalEvents) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Scenario Header */}
      <div className="glass-panel p-4 rounded-xl border border-amber-500/30 bg-amber-950/10 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Active Simulation Run</div>
          <div className="text-lg font-black text-white mt-0.5">{run.scenarioName}</div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">ID: {run.runId}</div>
        </div>
        <button
          onClick={() => navigate('/simulation')}
          className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold hover:bg-amber-500/30 transition flex items-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5" /> Go to Simulation
        </button>
      </div>

      {/* Event Completion */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Scenario Completion</span>
          <span className="text-sm font-black font-mono text-blue-400">{run.completedEvents}/{run.totalEvents} events ({completionPct}%)</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${completionPct}%` }} />
        </div>
      </div>

      {/* Simulation Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-3 rounded-lg border border-slate-800 text-center">
          <div className="text-[10px] font-bold uppercase text-slate-500 flex items-center justify-center gap-1"><Activity className="w-3 h-3 text-cyan-400" /> Total Incidents</div>
          <div className="text-2xl font-black text-white font-mono mt-1">{run.totalIncidents}</div>
        </div>
        <div className="glass-panel p-3 rounded-lg border border-red-500/20 text-center">
          <div className="text-[10px] font-bold uppercase text-red-400 flex items-center justify-center gap-1"><AlertTriangle className="w-3 h-3" /> Critical</div>
          <div className="text-2xl font-black text-red-400 font-mono mt-1">{run.criticalIncidents}</div>
        </div>
        <div className="glass-panel p-3 rounded-lg border border-emerald-500/20 text-center">
          <div className="text-[10px] font-bold uppercase text-emerald-400 flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3" /> Resolved</div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{run.resolvedIncidents}</div>
        </div>
        <div className="glass-panel p-3 rounded-lg border border-orange-500/20 text-center">
          <div className="text-[10px] font-bold uppercase text-orange-400">Unassigned</div>
          <div className="text-2xl font-black text-orange-400 font-mono mt-1">{run.unassignedCount}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="glass-panel p-3 rounded-lg border border-slate-800 text-center">
          <div className="text-[10px] font-bold uppercase text-amber-400 flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> Avg ETA</div>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">{fmt(run.avgEtaMinutes, ' min')}</div>
        </div>
        <div className="glass-panel p-3 rounded-lg border border-slate-800 text-center">
          <div className="text-[10px] font-bold uppercase text-blue-400 flex items-center justify-center gap-1"><Truck className="w-3 h-3" /> Utilization</div>
          <div className="text-2xl font-black text-blue-400 font-mono mt-1">{fmt(run.resourceUtilizationPercent, '%')}</div>
        </div>
        <div className="glass-panel p-3 rounded-lg border border-slate-800 text-center">
          <div className="text-[10px] font-bold uppercase text-purple-400">Reallocations</div>
          <div className="text-2xl font-black text-purple-400 font-mono mt-1">{run.reallocationCount}</div>
        </div>
      </div>
    </div>
  );
};
