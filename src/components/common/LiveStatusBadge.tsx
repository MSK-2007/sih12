
import { Wifi, WifiOff, AlertTriangle, Bot } from 'lucide-react';

interface LiveStatusBadgeProps {
  overallStatus: 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';
  geminiOnline: boolean;
  isSimulation?: boolean;
  onClick?: () => void;
}

const STATUS_CONFIG = {
  OPERATIONAL: {
    label: 'LIVE',
    icon: Wifi,
    dotClass: 'bg-emerald-400 animate-pulse',
    textClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60',
  },
  DEGRADED: {
    label: 'DEGRADED',
    icon: AlertTriangle,
    dotClass: 'bg-yellow-400 animate-pulse',
    textClass: 'text-yellow-400',
    bgClass: 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/60',
  },
  OFFLINE: {
    label: 'OFFLINE',
    icon: WifiOff,
    dotClass: 'bg-red-500',
    textClass: 'text-red-400',
    bgClass: 'bg-red-500/10 border-red-500/30 hover:border-red-500/60',
  },
  UNKNOWN: {
    label: 'CONNECTING',
    icon: Wifi,
    dotClass: 'bg-slate-500 animate-pulse',
    textClass: 'text-slate-400',
    bgClass: 'bg-slate-700/50 border-slate-600 hover:border-slate-500',
  },
};

/**
 * Persistent live status badge displayed in the header.
 * Shows actual system state: LIVE / DEGRADED / OFFLINE / CONNECTING.
 * Never shows "LIVE" unless the system has a valid active connection.
 */
export function LiveStatusBadge({ overallStatus, geminiOnline, isSimulation = false, onClick }: LiveStatusBadgeProps) {
  const cfg = isSimulation
    ? {
        label: 'SIMULATION',
        icon: Bot,
        dotClass: 'bg-purple-400 animate-pulse',
        textClass: 'text-purple-400',
        bgClass: 'bg-purple-500/10 border-purple-500/30 hover:border-purple-500/60',
      }
    : STATUS_CONFIG[overallStatus] || STATUS_CONFIG.UNKNOWN;

  const Icon = cfg.icon;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all cursor-pointer ${cfg.bgClass}`}
      title={`System Status: ${cfg.label}${geminiOnline ? ' | Gemini AI Online' : ''}`}
    >
      <div className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
      <Icon className={`w-3 h-3 ${cfg.textClass}`} />
      <span className={`font-space text-[10px] font-bold uppercase ${cfg.textClass}`}>{cfg.label}</span>
      {!isSimulation && geminiOnline && (
        <span className="w-1 h-1 rounded-full bg-purple-400 ml-0.5" title="Gemini AI Online" />
      )}
    </button>
  );
}
