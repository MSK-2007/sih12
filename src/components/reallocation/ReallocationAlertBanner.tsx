import React, { useState } from 'react';
import { ReallocationRecommendation } from '../../engines/reallocationEngine';
import { ReallocationReviewModal } from './ReallocationReviewModal';
import { useReallocation } from '../../hooks/useReallocation';
import { AlertTriangle, ChevronRight, X } from 'lucide-react';

interface Props {
  recommendation: ReallocationRecommendation;
  onDismiss: () => void;
}

export const ReallocationAlertBanner: React.FC<Props> = ({ recommendation, onDismiss }) => {
  const [showModal, setShowModal] = useState(false);
  const { confirm, reject, confirming, error } = useReallocation();

  const handleConfirm = async (id: string) => {
    const result = await confirm(id);
    if (result.success) {
      setShowModal(false);
      onDismiss();
    }
  };

  const handleReject = async (id: string) => {
    await reject(id);
    setShowModal(false);
    onDismiss();
  };

  return (
    <>
      {/* Sticky Banner */}
      <div className="fixed top-0 left-0 right-0 z-[1500] bg-amber-600/95 backdrop-blur-sm border-b border-amber-500/50 shadow-xl animate-fade-in">
        <div className="max-w-screen-xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-100 shrink-0 animate-pulse" />
            <span className="text-amber-50 text-xs font-bold truncate">
              ⚠ REALLOCATION RECOMMENDED —{' '}
              <span className="font-mono">{recommendation.triggerIncidentNumber}</span>{' '}
              {recommendation.triggerPriorityLevel} requires review. System quality: {recommendation.currentQuality} → {recommendation.proposedQuality} (+{recommendation.improvement} pts)
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/15 hover:bg-white/25 text-amber-50 text-xs font-bold rounded-lg border border-white/20 transition"
            >
              Review Details
              <ChevronRight className="w-3 h-3" />
            </button>
            <button
              onClick={onDismiss}
              className="text-amber-200 hover:text-white p-1 transition"
              title="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add top padding to page when banner visible */}
      <div className="h-10" />

      {/* Review Modal */}
      {showModal && (
        <ReallocationReviewModal
          recommendation={recommendation}
          confirming={confirming}
          error={error}
          onConfirm={handleConfirm}
          onReject={handleReject}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};
