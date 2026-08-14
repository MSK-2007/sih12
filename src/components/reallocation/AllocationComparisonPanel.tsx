import React from 'react';
import { ReallocationRecommendation, ReallocationAssignmentItem } from '../../engines/reallocationEngine';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  recommendation: ReallocationRecommendation;
}

function AllocationRow({ item, isNew }: { item: ReallocationAssignmentItem; isNew?: boolean }) {
  const priority = item.priorityLevel;
  const priorityColor =
    priority === 'CRITICAL'
      ? 'text-red-400 border-red-500/30 bg-red-950/20'
      : priority === 'HIGH'
      ? 'text-orange-400 border-orange-500/30 bg-orange-950/20'
      : priority === 'MEDIUM'
      ? 'text-yellow-400 border-yellow-500/30 bg-yellow-950/20'
      : 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border text-xs ${
        item.isReassigned
          ? 'border-amber-500/40 bg-amber-950/15'
          : isNew
          ? 'border-emerald-500/40 bg-emerald-950/15'
          : 'border-slate-800 bg-slate-900/60'
      }`}
    >
      <div className="flex items-center gap-2 font-mono">
        <span className="font-bold text-slate-100">{item.incidentNumber}</span>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${priorityColor}`}>
          {item.priorityLevel}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <ArrowRight className="w-3 h-3 text-slate-600" />
        <span className={`font-mono font-bold ${item.isReassigned ? 'text-amber-400' : 'text-emerald-400'}`}>
          {item.resourceCode}
        </span>
        <span className="text-slate-500 font-mono">{item.etaMinutes}m</span>
      </div>
    </div>
  );
}

export const AllocationComparisonPanel: React.FC<Props> = ({ recommendation }) => {
  const improvementDelta = recommendation.improvement;
  const isImproved = improvementDelta > 0;
  const isNeutral = improvementDelta === 0;

  // Find new items in proposed that weren't in current
  const newItems = recommendation.proposedAllocation.filter(
    (p) => !recommendation.currentAllocation.some((c) => c.resourceId === p.resourceId && c.incidentId === p.incidentId)
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Current Allocation */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-500 block" />
          Current Allocation
        </h4>
        <div className="space-y-1.5">
          {recommendation.currentAllocation.length > 0 ? (
            recommendation.currentAllocation.map((item) => (
              <AllocationRow key={`curr-${item.resourceId}-${item.incidentId}`} item={item} />
            ))
          ) : (
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 text-xs text-slate-500 text-center">
              No active allocations
            </div>
          )}
          {/* Show unserved trigger incident in current state */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-red-500/30 bg-red-950/15 text-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="font-bold text-slate-100">{recommendation.triggerIncidentNumber}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border text-red-400 border-red-500/30 bg-red-950/20">
                {recommendation.triggerPriorityLevel}
              </span>
            </div>
            <span className="text-red-400 font-semibold">No unit</span>
          </div>
        </div>
      </div>

      {/* Proposed Allocation */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 block" />
          Proposed Allocation
        </h4>
        <div className="space-y-1.5">
          {recommendation.proposedAllocation.map((item) => {
            const isNew = newItems.some((n) => n.resourceId === item.resourceId && n.incidentId === item.incidentId);
            return (
              <AllocationRow
                key={`prop-${item.resourceId}-${item.incidentId}`}
                item={item}
                isNew={isNew}
              />
            );
          })}
        </div>
      </div>

      {/* System Quality Delta */}
      <div className="sm:col-span-2 p-4 rounded-xl border border-slate-800 bg-slate-900/80 flex items-center justify-between gap-4">
        <div className="text-center">
          <span className="text-[10px] text-slate-500 block uppercase tracking-wider">System Quality (Before)</span>
          <span className="font-mono text-2xl font-extrabold text-slate-300">{recommendation.currentQuality}</span>
        </div>

        <div className="flex-1 flex items-center justify-center gap-2">
          <div className="h-0.5 flex-1 bg-slate-800" />
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-extrabold border ${
              isImproved
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20'
                : isNeutral
                ? 'text-slate-400 border-slate-700 bg-slate-900'
                : 'text-red-400 border-red-500/30 bg-red-950/20'
            }`}
          >
            {isImproved ? (
              <TrendingUp className="w-4 h-4" />
            ) : isNeutral ? (
              <Minus className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {isImproved ? '+' : ''}{improvementDelta} pts
          </div>
          <div className="h-0.5 flex-1 bg-slate-800" />
        </div>

        <div className="text-center">
          <span className="text-[10px] text-slate-500 block uppercase tracking-wider">System Quality (After)</span>
          <span className={`font-mono text-2xl font-extrabold ${isImproved ? 'text-emerald-400' : 'text-slate-300'}`}>
            {recommendation.proposedQuality}
          </span>
        </div>
      </div>
    </div>
  );
};
