import React from 'react';
import { ResourceAssignment } from '../../types/assignment';
import { Clock, CheckCircle2, AlertCircle, Loader } from 'lucide-react';

interface Props {
  assignments: ResourceAssignment[];
  loading?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  DISPATCHED: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  ACCEPTED: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  RECOMMENDED: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  REJECTED: 'text-red-400 bg-red-500/10 border-red-500/30',
  CANCELLED: 'text-slate-400 bg-slate-800 border-slate-700',
};

export const ResourceAssignmentHistory: React.FC<Props> = ({ assignments, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 justify-center text-slate-400 text-sm">
        <Loader className="w-4 h-4 animate-spin" />
        Loading assignment history...
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="py-8 text-center">
        <AlertCircle className="w-8 h-8 text-slate-700 mx-auto mb-2" />
        <p className="text-slate-500 text-sm">No assignment history found for this resource unit.</p>
      </div>
    );
  }

  const current = assignments.find(
    (a) => a.assignmentStatus === 'DISPATCHED' || a.assignmentStatus === 'ACCEPTED' || a.assignmentStatus === 'RECOMMENDED'
  );
  const history = assignments.filter((a) => a !== current);

  return (
    <div className="space-y-3">
      {/* Current Assignment */}
      {current && (
        <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-950/10 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Current Assignment</span>
            <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-semibold ${STATUS_COLORS[current.assignmentStatus] || ''}`}>
              {current.assignmentStatus}
            </span>
          </div>
          <p className="text-xs font-bold text-white font-mono">{current.incidentId.slice(0, 8).toUpperCase()}</p>
          {current.recommendationReason && (
            <p className="text-[11px] text-slate-400 leading-relaxed">{current.recommendationReason}</p>
          )}
          <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1 font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Assigned: {new Date(current.createdAt).toLocaleTimeString()}
            </span>
            {current.distanceKm && (
              <span>Dist: {current.distanceKm.toFixed(1)} km</span>
            )}
            {current.estimatedResponseMinutes && (
              <span>ETA: {current.estimatedResponseMinutes} min</span>
            )}
          </div>
        </div>
      )}

      {/* Historical Dispatches */}
      <div className="space-y-2">
        {history.map((assignment) => (
          <div key={assignment.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-mono font-bold text-slate-200">
                  {assignment.incidentId.slice(0, 12).toUpperCase()}
                </p>
                {assignment.completedAt && (
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Completed: {new Date(assignment.completedAt).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded border font-mono shrink-0 ${STATUS_COLORS[assignment.assignmentStatus] || 'text-slate-400 bg-slate-800 border-slate-700'}`}>
              {assignment.assignmentStatus}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
