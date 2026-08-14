import { useState, useCallback } from 'react';
import { ReallocationRecommendation } from '../engines/reallocationEngine';
import {
  analyzeDynamicReallocation,
  confirmReallocation,
  rejectReallocation,
  getReallocationHistory,
} from '../services/reallocation';

export function useReallocation() {
  const [analysis, setAnalysis] = useState<ReallocationRecommendation | null>(null);
  const [history, setHistory] = useState<ReallocationRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (triggerIncidentId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeDynamicReallocation(triggerIncidentId);
      setAnalysis(result);
      return result;
    } catch (err: any) {
      setError(err?.message || 'Reallocation analysis failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const confirm = useCallback(
    async (recommendationId: string) => {
      setConfirming(true);
      setError(null);
      try {
        const result = await confirmReallocation(recommendationId);
        if (!result.success) {
          setError(result.message);
        } else {
          setAnalysis(null);
          await loadHistory();
        }
        return result;
      } catch (err: any) {
        const msg = err?.message || 'Failed to confirm reallocation';
        setError(msg);
        return { success: false, message: msg };
      } finally {
        setConfirming(false);
      }
    },
    []
  );

  const reject = useCallback(
    async (recommendationId: string, reason?: string) => {
      setError(null);
      try {
        const result = await rejectReallocation(recommendationId, reason);
        if (result.success) {
          setAnalysis(null);
          await loadHistory();
        }
        return result;
      } catch (err: any) {
        const msg = err?.message || 'Failed to reject reallocation';
        setError(msg);
        return { success: false, message: msg };
      }
    },
    []
  );

  const recalculate = useCallback(
    async (triggerIncidentId?: string) => {
      setAnalysis(null);
      return analyze(triggerIncidentId);
    },
    [analyze]
  );

  const loadHistory = useCallback(async () => {
    try {
      const h = await getReallocationHistory();
      setHistory(h);
    } catch (err) {
      // fail silently
    }
  }, []);

  return {
    analysis,
    history,
    loading,
    confirming,
    error,
    analyze,
    confirm,
    reject,
    recalculate,
    loadHistory,
    clearAnalysis: () => setAnalysis(null),
  };
}
