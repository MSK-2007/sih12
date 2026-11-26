import React, { useState, useCallback } from 'react';
import { ReallocationRecommendation } from '../../engines/reallocationEngine';
import { ReallocationAlertBanner } from './ReallocationAlertBanner';
import { useReallocationRealtime } from '../../hooks/useReallocationRealtime';
import { useAuth } from '../../context/AuthContext';

interface Props {
  children: React.ReactNode;
}

/**
 * Global wrapper that monitors realtime events and surfaces reallocation alerts.
 * Mount once near the top of the component tree (inside Router).
 */
export const ReallocationMonitor: React.FC<Props> = ({ children }) => {
  const { user, session, profile } = useAuth();
  const isAuthenticated = Boolean(user && session && profile);
  const [pendingRecommendation, setPendingRecommendation] = useState<ReallocationRecommendation | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const handleReallocationNeeded = useCallback((rec: ReallocationRecommendation) => {
    if (dismissed === rec.id) return; // Don't re-surface the same recommendation
    setPendingRecommendation(rec);
  }, [dismissed]);

  const handleDismiss = useCallback(() => {
    if (pendingRecommendation) {
      setDismissed(pendingRecommendation.id);
    }
    setPendingRecommendation(null);
  }, [pendingRecommendation]);

  useReallocationRealtime(handleReallocationNeeded, isAuthenticated);

  return (
    <>
      {pendingRecommendation && (
        <ReallocationAlertBanner
          recommendation={pendingRecommendation}
          onDismiss={handleDismiss}
        />
      )}
      {children}
    </>
  );
};
