import React from 'react';
import { ResourceStatus } from '../../types/resource';

interface Props {
  status: ResourceStatus;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_CONFIG: Record<ResourceStatus, { label: string; className: string }> = {
  AVAILABLE: { label: 'AVAILABLE', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-bold' },
  ASSIGNED: { label: 'ASSIGNED', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  BUSY: { label: 'BUSY', className: 'bg-red-500/20 text-red-400 border-red-500/30 font-bold animate-pulse' },
  OFFLINE: { label: 'OFFLINE', className: 'bg-slate-900 text-slate-500 border-slate-800' },
};

export const ResourceStatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const config = STATUS_CONFIG[status] || { label: status, className: 'bg-slate-800 text-slate-300' };

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 font-mono',
    md: 'text-xs px-2.5 py-1 font-mono font-semibold',
    lg: 'text-sm px-3.5 py-1.5 font-mono font-bold',
  }[size];

  return (
    <span className={`inline-flex items-center rounded-md border tracking-wider uppercase ${config.className} ${sizeClasses}`}>
      {config.label}
    </span>
  );
};
