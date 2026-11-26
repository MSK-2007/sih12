import { Activity, RefreshCw, Clock, Database, Cpu, Flame, CloudRain, Radio } from 'lucide-react';
import { ProviderHealth, SystemHealthStatus } from '../../services/providerHealthService';

interface ProviderHealthPanelProps {
  health: SystemHealthStatus;
  geminiStats: { count: number; lastAnalyzedAt: string | null };
  isChecking: boolean;
  onRefresh: () => void;
}

function formatAge(timestamp: string | null): string {
  if (!timestamp) return 'Never';
  const ageMs = Date.now() - new Date(timestamp).getTime();
  const ageSec = Math.floor(ageMs / 1000);
  const ageMin = Math.floor(ageSec / 60);
  const ageHr = Math.floor(ageMin / 60);

  if (ageSec < 60) return `${ageSec}s ago`;
  if (ageMin < 60) return `${ageMin}m ago`;
  return `${ageHr}h ago`;
}

function getStatusConfig(status: ProviderHealth['status']) {
  switch (status) {
    case 'ONLINE':
      return { dot: 'bg-emerald-400 animate-pulse', label: 'ONLINE', labelClass: 'text-emerald-400', bg: 'border-emerald-500/20 bg-emerald-500/5' };
    case 'DEGRADED':
      return { dot: 'bg-yellow-400 animate-pulse', label: 'DEGRADED', labelClass: 'text-yellow-400', bg: 'border-yellow-500/20 bg-yellow-500/5' };
    case 'STALE':
      return { dot: 'bg-orange-400', label: 'STALE', labelClass: 'text-orange-400', bg: 'border-orange-500/20 bg-orange-500/5' };
    case 'OFFLINE':
      return { dot: 'bg-red-500', label: 'OFFLINE', labelClass: 'text-red-400', bg: 'border-red-500/20 bg-red-500/5' };
    default:
      return { dot: 'bg-slate-500', label: 'UNKNOWN', labelClass: 'text-slate-400', bg: 'border-slate-700 bg-slate-900' };
  }
}

function getProviderIcon(key: string) {
  switch (key) {
    case 'imd': return <CloudRain className="w-4 h-4 text-blue-400" />;
    case 'usgs': return <Radio className="w-4 h-4 text-orange-400" />;
    case 'nasa_firms': return <Flame className="w-4 h-4 text-red-400" />;
    case 'gemini': return <Cpu className="w-4 h-4 text-purple-400" />;
    case 'supabase_realtime': return <Database className="w-4 h-4 text-emerald-400" />;
    default: return <Activity className="w-4 h-4 text-slate-400" />;
  }
}

function ProviderRow({ provider }: { provider: ProviderHealth }) {
  const cfg = getStatusConfig(provider.status);
  return (
    <div className={`flex items-center justify-between px-3 py-2.5 rounded border ${cfg.bg} transition-all`}>
      <div className="flex items-center gap-2.5 min-w-0">
        {getProviderIcon(provider.providerKey)}
        <span className="font-space text-[11px] font-bold uppercase text-white truncate">{provider.providerName}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {provider.lastSuccessfulUpdate && (
          <span className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 font-mono">
            <Clock className="w-3 h-3" />
            {formatAge(provider.lastSuccessfulUpdate)}
          </span>
        )}
        {provider.responseTimeMs && (
          <span className="hidden md:block text-[10px] text-slate-500 font-mono">{provider.responseTimeMs}ms</span>
        )}
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          <span className={`font-space text-[10px] font-bold ${cfg.labelClass}`}>{cfg.label}</span>
        </div>
      </div>
    </div>
  );
}

export function ProviderHealthPanel({ health, geminiStats, isChecking, onRefresh }: ProviderHealthPanelProps) {
  const overallCfg = {
    OPERATIONAL: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/40', dot: 'bg-emerald-400 animate-pulse' },
    DEGRADED: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/40', dot: 'bg-yellow-400 animate-pulse' },
    OFFLINE: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/40', dot: 'bg-red-500' },
    UNKNOWN: { color: 'text-slate-400', bg: 'bg-slate-700 border-slate-600', dot: 'bg-slate-500' },
  }[health.overallStatus] || { color: 'text-slate-400', bg: 'bg-slate-700 border-slate-600', dot: 'bg-slate-500' };

  return (
    <div className="glass-panel border-2 border-black p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#FF4D00]" />
          <span className="font-archivo text-sm uppercase text-white font-bold tracking-tight">SYSTEM HEALTH</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${overallCfg.bg}`}>
            <div className={`w-2 h-2 rounded-full ${overallCfg.dot}`} />
            <span className={`font-space text-[10px] font-bold ${overallCfg.color}`}>{health.overallStatus}</span>
          </div>
          <button
            onClick={onRefresh}
            disabled={isChecking}
            title="Run health check"
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Data Sources */}
      <div>
        <p className="font-space text-[9px] uppercase text-slate-500 font-bold mb-2 tracking-widest">DATA SOURCES</p>
        <div className="space-y-1.5">
          {health.providers.length === 0 ? (
            <div className="text-slate-500 font-space text-[10px] text-center py-3">
              {isChecking ? 'Checking providers...' : 'No health data — run check'}
            </div>
          ) : (
            health.providers.map(provider => (
              <ProviderRow key={provider.providerKey} provider={provider} />
            ))
          )}
        </div>
      </div>

      {/* Gemini AI Stats */}
      <div className="border-t border-white/10 pt-3">
        <p className="font-space text-[9px] uppercase text-slate-500 font-bold mb-2 tracking-widest">AI INTELLIGENCE</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-space text-[11px] text-white font-bold">GEMINI AI</span>
          </div>
          <div className="text-right">
            <div className="font-space text-[10px] text-purple-300">{geminiStats.count} analyses today</div>
            {geminiStats.lastAnalyzedAt && (
              <div className="font-space text-[9px] text-slate-500">
                Last: {formatAge(geminiStats.lastAnalyzedAt)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Last Checked */}
      {health.lastChecked && (
        <div className="text-[9px] text-slate-600 font-mono text-right">
          Last checked: {new Date(health.lastChecked).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
