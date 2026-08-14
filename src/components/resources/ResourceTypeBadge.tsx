import React from 'react';
import { ResourceType, getResourceTypeLabel } from '../../types/resource';
import { Truck, Flame, Shield, LifeBuoy } from 'lucide-react';

interface Props {
  type: ResourceType;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const TYPE_CONFIG: Record<ResourceType, { icon: React.ComponentType<{ className?: string }>; colorClass: string }> = {
  AMBULANCE: { icon: Truck, colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  FIRE_UNIT: { icon: Flame, colorClass: 'text-red-400 bg-red-500/10 border-red-500/20' },
  POLICE_UNIT: { icon: Shield, colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  RESCUE_TEAM: { icon: LifeBuoy, colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
};

export const ResourceTypeBadge: React.FC<Props> = ({ type, showIcon = true, size = 'md' }) => {
  const config = TYPE_CONFIG[type] || { icon: Truck, colorClass: 'text-slate-300 bg-slate-800' };
  const Icon = config.icon;
  const label = getResourceTypeLabel(type);

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1 font-medium',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  }[size];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border font-sans ${config.colorClass} ${sizeClasses}`}>
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      <span>{label}</span>
    </span>
  );
};
