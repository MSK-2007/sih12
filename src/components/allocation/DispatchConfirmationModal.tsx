import React from 'react';
import { Incident } from '../../types/incident';
import { AllocationRecommendation } from '../../engines/allocationEngine';
import { ShieldCheck, AlertTriangle, Loader, X } from 'lucide-react';

interface Props {
  incident: Incident;
  selectedRecommendations: AllocationRecommendation[];
  dispatching: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export const DispatchConfirmationModal: React.FC<Props> = ({
  incident,
  selectedRecommendations,
  dispatching,
  error,
  onConfirm,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0c121e] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-tight">Operator Dispatch Confirmation</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Alert */}
        <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Human Operator Confirmation Required:</strong> Confirming dispatch will transition resource status to <strong className="text-white">ASSIGNED</strong> and set incident status to <strong className="text-white">DISPATCHED</strong>.
          </div>
        </div>

        {/* Target Incident Overview */}
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1 text-xs">
          <span className="text-[10px] font-semibold uppercase text-slate-500 block">Target Emergency Incident</span>
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-slate-100">{incident.incidentNumber}</span>
            <span className="font-bold text-red-400">{incident.priorityLevel} PRIORITY</span>
          </div>
          <p className="text-slate-300 font-medium line-clamp-1">{incident.title}</p>
        </div>

        {/* Selected Units List */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Selected Response Units ({selectedRecommendations.length})
          </span>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {selectedRecommendations.map((rec) => (
              <div key={rec.resourceId} className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                <div>
                  <span className="font-mono font-bold text-emerald-400">{rec.resourceCode}</span>
                  <span className="text-slate-400 ml-2">({rec.resourceType.replace(/_/g, ' ')})</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-cyan-400">ETA: {rec.etaMinutes}m</span>
                  <span className="text-amber-400 font-bold">{rec.allocationScore}/100</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/40 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={dispatching || selectedRecommendations.length === 0}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg disabled:opacity-50"
          >
            {dispatching && <Loader className="w-4 h-4 animate-spin" />}
            Confirm & Dispatch Units
          </button>
        </div>
      </div>
    </div>
  );
};
