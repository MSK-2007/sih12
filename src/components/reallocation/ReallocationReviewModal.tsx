import React, { useState } from 'react';
import { ReallocationRecommendation } from '../../engines/reallocationEngine';
import { AllocationComparisonPanel } from './AllocationComparisonPanel';
import { ShieldCheck, AlertTriangle, X, ChevronDown, ChevronUp, Loader, Zap } from 'lucide-react';

interface Props {
  recommendation: ReallocationRecommendation;
  confirming: boolean;
  error: string | null;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
  onClose: () => void;
}

export const ReallocationReviewModal: React.FC<Props> = ({
  recommendation,
  confirming,
  error,
  onConfirm,
  onReject,
  onClose,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const isRecommended = recommendation.status === 'REALLOCATION_RECOMMENDED';

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0c121e] border border-amber-500/30 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Dynamic Reallocation Recommendation
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Banner */}
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
            isRecommended
              ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
              : 'bg-slate-900 border-slate-700 text-slate-300'
          }`}
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-white block mb-0.5">
              {recommendation.status.replace(/_/g, ' ')}
            </strong>
            {recommendation.summaryMessage}
          </div>
        </div>

        {/* Trigger Incident Overview */}
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Trigger Incident</span>
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-slate-100 text-sm">{recommendation.triggerIncidentNumber}</span>
            <span
              className={`px-2.5 py-1 rounded font-bold text-xs border ${
                recommendation.triggerPriorityLevel === 'CRITICAL'
                  ? 'text-red-400 border-red-500/30 bg-red-950/20'
                  : 'text-orange-400 border-orange-500/30 bg-orange-950/20'
              }`}
            >
              {recommendation.triggerPriorityLevel} PRIORITY
            </span>
          </div>
        </div>

        {/* System Quality Summary */}
        <div className="grid grid-cols-3 gap-3 text-xs text-center">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase">Quality (Before)</span>
            <span className="font-mono text-2xl font-extrabold text-slate-300">{recommendation.currentQuality}</span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
            <span className="text-[10px] text-slate-500 block uppercase">Improvement</span>
            <span className={`font-mono text-2xl font-extrabold ${recommendation.improvement > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
              {recommendation.improvement > 0 ? '+' : ''}{recommendation.improvement}
            </span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase">Quality (After)</span>
            <span className={`font-mono text-2xl font-extrabold ${recommendation.improvement > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
              {recommendation.proposedQuality}
            </span>
          </div>
        </div>

        {/* Gemini AI Contextual Explanation */}
        {recommendation.geminiSummary && (
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-xs space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider text-[11px]">
              <Zap className="w-3.5 h-3.5" />
              Gemini AI Decision Support Analysis
            </div>
            <p className="text-slate-200 font-medium">{recommendation.geminiSummary.summary}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                <span className="text-slate-500 font-bold block">REASON</span>
                <span className="text-slate-300">{recommendation.geminiSummary.reason}</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                <span className="text-amber-400 font-bold block">POTENTIAL RISK</span>
                <span className="text-slate-300">{recommendation.geminiSummary.risk}</span>
              </div>
            </div>
            <div className="bg-emerald-950/20 p-2 rounded border border-emerald-500/30 text-emerald-300 text-[11px]">
              <strong className="block font-bold">RECOMMENDED OPERATOR ACTION:</strong>
              {recommendation.geminiSummary.operator_action}
            </div>
          </div>
        )}

        {/* Explanation */}
        <div className="p-4 rounded-xl bg-amber-950/10 border border-amber-500/20 text-xs text-slate-200 leading-relaxed">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1.5">Deterministic Engine Rationale</span>
          {recommendation.explanation}
        </div>

        {/* Review Details Accordion */}
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between p-3.5 bg-slate-900/60 hover:bg-slate-900 text-xs font-semibold text-slate-300 transition"
          >
            <span>VIEW DETAILS (Global Allocation Matrix & Comparison)</span>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showDetails && (
            <div className="p-4 border-t border-slate-800">
              <AllocationComparisonPanel recommendation={recommendation} />

              {/* Affected Incidents */}
              {recommendation.affectedIncidents.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Affected Incidents</h5>
                  {recommendation.affectedIncidents.map((ai) => (
                    <div key={ai.incidentId} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
                      <span className="text-slate-200 font-bold">{ai.incidentNumber}</span>
                      <div className="flex items-center gap-3 text-slate-400">
                        <span>ETA Before: {ai.oldEta === 99 ? 'None' : `${ai.oldEta}m`}</span>
                        <span className="text-amber-400">→</span>
                        <span className="text-emerald-400">After: {ai.newEta === 0 ? 'Reassigned' : `${ai.newEta}m`}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Affected Resources */}
              {recommendation.affectedResources.length > 0 && (
                <div className="mt-3 space-y-2">
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Affected Resources</h5>
                  {recommendation.affectedResources.map((ar) => (
                    <div key={ar.resourceId} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
                      <span className="text-amber-400 font-bold">{ar.resourceCode}</span>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span>{ar.fromIncidentId ? 'Released from prior incident' : 'Free unit'}</span>
                        <span className="text-emerald-400">→ dispatched to {recommendation.triggerIncidentNumber}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/40 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Operator Safety Notice */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-400 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-white">Human operator confirmation required.</strong> Confirming will atomically reassign resource status and update incident dispatches. Rejecting preserves current assignments.
          </span>
        </div>

        {/* Reject Reason (optional) */}
        {isRecommended && (
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Optional: Rejection reason (for audit record)..."
            rows={2}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-none"
          />
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Close
          </button>
          {isRecommended && (
            <>
              <button
                onClick={() => onReject(recommendation.id)}
                className="px-4 py-2 rounded-lg bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 text-xs font-semibold transition uppercase tracking-wider"
              >
                REJECT
              </button>
              <button
                onClick={() => onConfirm(recommendation.id)}
                disabled={confirming}
                className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg disabled:opacity-50 uppercase tracking-wider"
              >
                {confirming && <Loader className="w-4 h-4 animate-spin" />}
                ACCEPT REALLOCATION
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
