import React, { useState } from 'react';
import { ResourceStatus, ALLOWED_RESOURCE_STATUS_TRANSITIONS, validateResourceStatusTransition } from '../../types/resource';
import { CheckCircle2, Clock, Flame, Power, AlertCircle } from 'lucide-react';

interface Props {
  resourceId: string;
  currentStatus: ResourceStatus;
  onStatusChange: (newStatus: ResourceStatus) => Promise<boolean>;
}

const STATUS_META: Record<ResourceStatus, { icon: React.ComponentType<{ className?: string }>; label: string; className: string }> = {
  AVAILABLE: { icon: CheckCircle2, label: 'Available', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' },
  ASSIGNED: { icon: Clock, label: 'Assigned', className: 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' },
  BUSY: { icon: Flame, label: 'Busy', className: 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20' },
  OFFLINE: { icon: Power, label: 'Offline', className: 'bg-slate-900 text-slate-500 border-slate-700 hover:bg-slate-800' },
};

export const ResourceStatusControl: React.FC<Props> = ({ currentStatus, onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowedTargets = ALLOWED_RESOURCE_STATUS_TRANSITIONS[currentStatus] || [];

  const handleClick = async (targetStatus: ResourceStatus) => {
    const check = validateResourceStatusTransition(currentStatus, targetStatus);
    if (!check.valid) {
      setError(check.reason || 'Invalid status transition');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ok = await onStatusChange(targetStatus);
      if (!ok) setError('Failed to update status. Please try again.');
    } catch (err: any) {
      setError(err?.message || 'Status update error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status Control</span>
        <span className="font-mono text-xs text-slate-300">
          Current: <strong className="text-white">{currentStatus}</strong>
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {allowedTargets.length > 0 ? (
          allowedTargets.map((targetStatus) => {
            const meta = STATUS_META[targetStatus];
            const Icon = meta.icon;
            return (
              <button
                key={targetStatus}
                onClick={() => handleClick(targetStatus)}
                disabled={loading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition disabled:opacity-50 ${meta.className}`}
              >
                <Icon className="w-3.5 h-3.5" />
                Set {meta.label}
              </button>
            );
          })
        ) : (
          <span className="text-xs text-slate-500 italic">No status transitions available.</span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
};
