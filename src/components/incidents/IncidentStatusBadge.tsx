import React from 'react';
import { IncidentStatus } from '../../types/incident';

interface Props {
  status: IncidentStatus;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_CONFIG: Record<IncidentStatus, { label: string; className: string }> = {
  REPORTED: { label: 'REPORTED', className: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  ANALYSING: { label: 'ANALYSING', className: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 animate-pulse' },
  PRIORITIZED: { label: 'PRIORITIZED', className: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  AWAITING_DISPATCH: { label: 'AWAITING DISPATCH', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  DISPATCHED: { label: 'DISPATCHED', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  IN_PROGRESS: { label: 'IN PROGRESS', className: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  RESOLVED: { label: 'RESOLVED', className: 'bg-slate-800 text-slate-300 border-slate-700' },
  CLOSED: { label: 'CLOSED', className: 'bg-slate-900 text-slate-500 border-slate-800' },
};

export const IncidentStatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const config = STATUS_CONFIG[status] || { label: status, className: 'bg-slate-800 text-slate-300' };

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 font-mono font-medium',
    md: 'text-xs px-2.5 py-1 font-mono font-semibold',
    lg: 'text-sm px-3.5 py-1.5 font-mono font-bold',
  }[size];

  return (
    <span className={`inline-flex items-center rounded-md border tracking-wider uppercase ${config.className} ${sizeClasses}`}>
      {config.label}
    </span>
  );
};
