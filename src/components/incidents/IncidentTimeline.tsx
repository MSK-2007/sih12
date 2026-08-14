import React from 'react';
import { IncidentUpdate } from '../../types/incident';
import { IncidentStatusBadge } from './IncidentStatusBadge';
import { Clock, MessageSquare, CheckCircle2 } from 'lucide-react';

interface Props {
  updates: IncidentUpdate[];
  loading?: boolean;
}

export const IncidentTimeline: React.FC<Props> = ({ updates, loading }) => {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <div className="h-4 bg-slate-800 rounded w-1/3 animate-pulse" />
        <div className="h-12 bg-slate-800/60 rounded animate-pulse" />
        <div className="h-12 bg-slate-800/60 rounded animate-pulse" />
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500 text-xs">
        No update logs recorded for this incident yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative border-l border-slate-800 ml-3 pl-6 space-y-6">
        {updates.map((entry, index) => {
          const formattedTime = new Date(entry.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          const formattedDate = new Date(entry.createdAt).toLocaleDateString();

          return (
            <div key={entry.id} className="relative group">
              {/* Dot Icon on Timeline Line */}
              <div className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:border-red-500 transition">
                {index === 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>

              {/* Log Entry Box */}
              <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <IncidentStatusBadge status={entry.status} size="sm" />
                  <span className="text-[11px] font-mono text-slate-500">
                    {formattedDate} • {formattedTime}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-200 mt-1">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{entry.message}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
