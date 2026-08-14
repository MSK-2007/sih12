import { useState, useCallback } from 'react';
import { AllocationAnalysis } from '../engines/allocationEngine';
import { analyzeAllocation, confirmDispatch } from '../services/allocation';

export function useAllocation(incidentId: string | undefined) {
  const [allocation, setAllocation] = useState<AllocationAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [dispatching, setDispatching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async () => {
    if (!incidentId) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeAllocation(incidentId);
      setAllocation(res);
      return res;
    } catch (err: any) {
      const msg = err?.message || 'Failed to run resource allocation analysis';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  const dispatchResources = useCallback(
    async (resourceIds: string[]) => {
      if (!incidentId) return { success: false, message: 'Missing incident ID' };
      setDispatching(true);
      setError(null);
      try {
        const result = await confirmDispatch(incidentId, resourceIds);
        if (!result.success) {
          setError(result.message);
        } else {
          // Refresh analysis state
          await runAnalysis();
        }
        return result;
      } catch (err: any) {
        const msg = err?.message || 'Dispatch confirmation failed';
        setError(msg);
        return { success: false, message: msg };
      } finally {
        setDispatching(false);
      }
    },
    [incidentId, runAnalysis]
  );

  const clearAllocation = useCallback(() => {
    setAllocation(null);
    setError(null);
  }, []);

  return {
    allocation,
    loading,
    dispatching,
    error,
    analyzeAllocation: runAnalysis,
    confirmDispatch: dispatchResources,
    clearAllocation,
  };
}
