import React, { useState } from 'react';
import { Incident } from '../../types/incident';
import { useAllocation } from '../../hooks/useAllocation';
import { RecommendationCard } from './RecommendationCard';
import { DispatchConfirmationModal } from './DispatchConfirmationModal';
import { ShieldAlert, Zap, Loader, CheckCircle2, AlertCircle, Radio } from 'lucide-react';

interface Props {
  incident: Incident;
  onStatusRefresh?: () => void;
}

export const ResourceRecommendations: React.FC<Props> = ({ incident, onStatusRefresh }) => {
  const { allocation, loading, dispatching, error, analyzeAllocation, confirmDispatch } = useAllocation(incident.id);

  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [dispatchSuccessMessage, setDispatchSuccessMessage] = useState<string | null>(null);

  const handleToggleSelect = (resourceId: string) => {
    setSelectedResourceIds((prev) =>
      prev.includes(resourceId) ? prev.filter((id) => id !== resourceId) : [...prev, resourceId]
    );
  };

  const handleRunAnalysis = async () => {
    setDispatchSuccessMessage(null);
    const res = await analyzeAllocation();
    if (res && res.recommendations.length > 0) {
      // Pre-select top rank recommendation by default
      setSelectedResourceIds([res.recommendations[0].resourceId]);
    }
  };

  const handleConfirmDispatch = async () => {
    const result = await confirmDispatch(selectedResourceIds);
    if (result.success) {
      setDispatchSuccessMessage(result.message);
      setShowConfirmModal(false);
      setSelectedResourceIds([]);
      if (onStatusRefresh) onStatusRefresh();
    }
  };

  const selectedRecommendations = allocation
    ? allocation.recommendations.filter((r) => selectedResourceIds.includes(r.resourceId))
    : [];

  return (
    <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            Resource Allocation Engine
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Suitability scoring algorithm (0–100) evaluating capability, travel ETA, distance, and workload.
          </p>
        </div>

        <button
          onClick={handleRunAnalysis}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition disabled:opacity-60 shrink-0 shadow-lg"
        >
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {allocation ? 'Recalculate Allocation' : 'Analyze Resources'}
        </button>
      </div>

      {dispatchSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {dispatchSuccessMessage}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 text-red-400 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span>{error}</span>
            <button onClick={handleRunAnalysis} className="block text-[11px] underline mt-1 text-red-300">
              Recalculate Recommendations
            </button>
          </div>
        </div>
      )}

      {/* Analysis Output */}
      {allocation && (
        <div className="space-y-4">
          {/* Allocation Overview Bar */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">Allocation Status:</span>
                <span className={`text-xs px-2.5 py-0.5 rounded font-mono font-bold ${
                  allocation.status === 'READY_FOR_OPERATOR_REVIEW' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                  allocation.status === 'PARTIAL_RECOMMENDATION' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                  'bg-red-500/15 text-red-400 border border-red-500/30'
                }`}>
                  {allocation.status.replace(/_/g, ' ')}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Calculated: {new Date(allocation.calculatedAt).toLocaleTimeString()}
              </span>
            </div>

            <p className="text-xs text-slate-300 font-medium">{allocation.summaryMessage}</p>

            {/* Required Units List */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-800/60">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider self-center mr-1">Required:</span>
              {allocation.requiredResources.map((req) => (
                <span key={req.type} className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono flex items-center gap-1">
                  <Radio className="w-3 h-3 text-cyan-400" />
                  {req.quantity} {req.type.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Recommendations List */}
          {allocation.recommendations.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Ranked Suitable Resources ({allocation.recommendations.length})
                </h3>
                {selectedResourceIds.length > 0 && (
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition flex items-center gap-2 shadow-lg"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Review & Dispatch Selected ({selectedResourceIds.length})
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {allocation.recommendations.map((rec) => (
                  <RecommendationCard
                    key={rec.resourceId}
                    recommendation={rec}
                    isSelected={selectedResourceIds.includes(rec.resourceId)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-slate-800 space-y-2">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
              <p className="text-sm text-slate-300 font-medium">No suitable available resources found in fleet pool.</p>
              <p className="text-xs text-slate-500">Units may currently be BUSY, ASSIGNED, or OFFLINE.</p>
            </div>
          )}
        </div>
      )}

      {!allocation && !loading && (
        <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
          <p className="text-xs text-slate-400">
            Click <strong className="text-white">Analyze Resources</strong> to calculate suitability scores for available fleet units based on capability, ETA, and travel distance.
          </p>
        </div>
      )}

      {/* Operator Review & Confirmation Modal */}
      {showConfirmModal && (
        <DispatchConfirmationModal
          incident={incident}
          selectedRecommendations={selectedRecommendations}
          dispatching={dispatching}
          error={error}
          onConfirm={handleConfirmDispatch}
          onClose={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
};
