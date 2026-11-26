import { Activity, RefreshCw, Cpu, Database, Wifi, Clock, AlertTriangle } from 'lucide-react';
import { useLiveStatus } from '../hooks/useLiveStatus';
import { ProviderHealthPanel } from '../components/common/ProviderHealthPanel';
import { AiEventTimeline } from '../components/common/AiEventTimeline';
import { KineticPageHeader } from '../components/kinetic/KineticPageHeader';

function MetricCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: any; color: string }) {
  return (
    <div className="glass-panel border-2 border-black p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="font-space text-[9px] text-slate-500 uppercase tracking-widest">{label}</span>
      </div>
      <p className="font-archivo text-2xl text-white font-bold">{value}</p>
      {sub && <p className="font-space text-[10px] text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export function SystemHealthPage() {
  const { health, geminiStats, isChecking, lastChecked, runManualCheck, getProviderByKey } = useLiveStatus();

  const onlineCount = health.providers.filter(p => p.status === 'ONLINE').length;
  const totalProviders = health.providers.length;

  const geminiProvider = getProviderByKey('gemini');

  const realtimeProvider = getProviderByKey('supabase_realtime');

  return (
    <div className="space-y-5 px-4 md:px-8 py-6 pb-12 animate-fade-in">
      <KineticPageHeader
        title="SYSTEM HEALTH"
        subtitle="REAL-TIME PROVIDER STATUS — DATA INTEGRITY — AI INTELLIGENCE"
        marqueeText="LIVE SYSTEM OBSERVABILITY"
        icon={<Activity className="w-6 h-6" />}
        actions={
          <button
            onClick={runManualCheck}
            disabled={isChecking}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-black border-2 border-black text-white font-space text-[11px] font-bold uppercase hover:bg-[#FF4D00] hover:text-black transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'CHECKING...' : 'RUN HEALTH CHECK'}
          </button>
        }
      />

      {/* Overall Status Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="SYSTEM STATUS"
          value={health.overallStatus}
          sub={`${onlineCount}/${totalProviders} providers online`}
          icon={Activity}
          color={health.overallStatus === 'OPERATIONAL' ? 'text-emerald-400' : health.overallStatus === 'DEGRADED' ? 'text-yellow-400' : 'text-red-400'}
        />
        <MetricCard
          label="GEMINI AI"
          value={geminiProvider?.status || 'UNKNOWN'}
          sub={geminiStats.lastAnalyzedAt ? `Last: ${new Date(geminiStats.lastAnalyzedAt).toLocaleTimeString()}` : 'No analysis yet'}
          icon={Cpu}
          color="text-purple-400"
        />
        <MetricCard
          label="ANALYSES TODAY"
          value={geminiStats.count}
          sub="AI decision-support assessments"
          icon={Cpu}
          color="text-blue-400"
        />
        <MetricCard
          label="REALTIME"
          value={realtimeProvider?.status || 'UNKNOWN'}
          sub="Supabase live connection"
          icon={Wifi}
          color="text-emerald-400"
        />
      </div>

      {/* Provider Health + AI Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-5">
          <ProviderHealthPanel
            health={health}
            geminiStats={geminiStats}
            isChecking={isChecking}
            onRefresh={runManualCheck}
          />

          {/* Detailed Provider Cards */}
          <div className="glass-panel border-2 border-black p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-[#FF4D00]" />
              <span className="font-archivo text-sm uppercase text-white font-bold tracking-tight">PROVIDER DETAILS</span>
            </div>

            {health.providers.map(provider => (
              <div key={provider.providerKey} className="border border-white/10 rounded p-3 space-y-2 bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <span className="font-space text-[11px] text-white font-bold uppercase">{provider.providerName}</span>
                  <span className={`font-space text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    provider.status === 'ONLINE' ? 'text-emerald-400 bg-emerald-500/10' :
                    provider.status === 'DEGRADED' ? 'text-yellow-400 bg-yellow-500/10' :
                    provider.status === 'STALE' ? 'text-orange-400 bg-orange-500/10' :
                    provider.status === 'OFFLINE' ? 'text-red-400 bg-red-500/10' :
                    'text-slate-400 bg-slate-700'
                  }`}>
                    {provider.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    <span className="font-space text-[9px] text-slate-600 uppercase">Last Success</span>
                    <p className="font-mono text-[10px] text-slate-300">
                      {provider.lastSuccessfulUpdate ? new Date(provider.lastSuccessfulUpdate).toLocaleTimeString() : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="font-space text-[9px] text-slate-600 uppercase">Last Attempt</span>
                    <p className="font-mono text-[10px] text-slate-300">
                      {provider.lastAttempt ? new Date(provider.lastAttempt).toLocaleTimeString() : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="font-space text-[9px] text-slate-600 uppercase">Response</span>
                    <p className="font-mono text-[10px] text-slate-300">
                      {provider.responseTimeMs ? `${provider.responseTimeMs}ms` : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="font-space text-[9px] text-slate-600 uppercase">Records</span>
                    <p className="font-mono text-[10px] text-slate-300">{provider.recordsLastFetch || 0}</p>
                  </div>
                </div>

                {provider.lastError && (
                  <div className="flex items-start gap-1.5 mt-1.5 bg-red-900/10 border border-red-500/10 rounded p-2">
                    <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="font-inter text-[10px] text-red-300 line-clamp-2">{provider.lastError}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI Event Timeline */}
        <AiEventTimeline limit={40} />
      </div>

      {/* Last Checked */}
      {lastChecked && (
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-600 font-mono">
          <Clock className="w-3 h-3" />
          <span>Last health check: {new Date(lastChecked).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

export default SystemHealthPage;
