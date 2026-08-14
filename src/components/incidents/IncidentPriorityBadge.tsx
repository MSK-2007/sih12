import React from 'react';
import { PriorityLevel } from '../../types/incident';
import { AlertTriangle, ShieldAlert, AlertCircle, Info } from 'lucide-react';

interface Props {
  level: PriorityLevel;
  score?: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  CRITICAL: {
    label: 'CRITICAL',
    className: 'bg-red-500/20 text-red-400 border-red-500/40 shadow-red-900/40 pulse-critical',
    icon: ShieldAlert,
  },
  HIGH: {
    label: 'HIGH',
    className: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    icon: AlertTriangle,
  },
  MEDIUM: {
    label: 'MEDIUM',
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    icon: AlertCircle,
  },
  LOW: {
    label: 'LOW',
    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    icon: Info,
  },
};

export const IncidentPriorityBadge: React.FC<Props> = ({ level, score, showScore = true, size = 'md' }) => {
  const config = PRIORITY_CONFIG[level] || PRIORITY_CONFIG.MEDIUM;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 font-mono',
    md: 'text-xs px-2.5 py-1 font-mono font-semibold',
    lg: 'text-sm px-3.5 py-1.5 font-mono font-bold',
  }[size];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border tracking-wider font-mono uppercase ${config.className} ${sizeClasses}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
      {showScore && score !== undefined && (
        <span className="ml-1 opacity-90 font-bold border-l border-current/30 pl-1.5">
          {score.toFixed(0)}
        </span>
      )}
    </span>
  );
};
