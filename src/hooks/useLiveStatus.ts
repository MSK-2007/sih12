import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getProviderHealth,
  runHealthCheck,
  runEventPipeline,
  subscribeToProviderHealth,
  getGeminiAnalysisStats,
  SystemHealthStatus,
  ProviderHealth,
} from '../services/providerHealthService';
import { isSupabaseConfigured } from '../services/supabase';
import { useOperationalLocation } from '../context/OperationalLocationContext';

const HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const EVENT_PIPELINE_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export interface LiveStatusState {
  health: SystemHealthStatus;
  geminiStats: { count: number; lastAnalyzedAt: string | null };
  isChecking: boolean;
  lastChecked: string | null;
  runManualCheck: () => Promise<void>;
  getProviderByKey: (key: string) => ProviderHealth | undefined;
}

/**
 * useLiveStatus hook
 * 
 * Manages continuous provider health monitoring:
 * - Fetches initial health state from DB
 * - Subscribes to Realtime updates (provider_health table)
 * - Runs scheduled health checks via Edge Function
 * - Triggers event processing pipeline periodically
 * - Exposes per-provider health including STALE detection
 */
export function useLiveStatus(enabled: boolean = true): LiveStatusState {
  const [health, setHealth] = useState<SystemHealthStatus>({
    overallStatus: 'UNKNOWN',
    providers: [],
    lastChecked: null,
  });
  const [geminiStats, setGeminiStats] = useState({ count: 0, lastAnalyzedAt: null as string | null });
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const { location } = useOperationalLocation();
  const healthCheckTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pipelineTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // ── Load initial health from DB ──────────────────────────────────────────
  const loadHealth = useCallback(async () => {
    try {
      const [h, stats] = await Promise.all([
        getProviderHealth(),
        getGeminiAnalysisStats(),
      ]);
      if (isMountedRef.current) {
        setHealth(h);
        setGeminiStats(stats);
        setLastChecked(new Date().toISOString());
      }
    } catch (err) {
      console.warn('[useLiveStatus] Load health error:', err);
    }
  }, []);

  // ── Run full health check via Edge Function ──────────────────────────────
  const runManualCheck = useCallback(async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      await runHealthCheck(
        ['imd', 'usgs', 'nasa_firms', 'gemini'],
        {
          latitude: location.latitude,
          longitude: location.longitude,
          district: location.district,
          state: location.state,
        }
      );
      await loadHealth();
    } finally {
      if (isMountedRef.current) setIsChecking(false);
    }
  }, [isChecking, location, loadHealth]);

  // ── Scheduled health check (every 5 minutes) ────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    isMountedRef.current = true;
    loadHealth();

    // Run initial health check after 2s to avoid blocking page load
    const initialCheckTimeout = setTimeout(() => {
      if (isMountedRef.current) runManualCheck();
    }, 2000);

    // Schedule recurring health checks
    healthCheckTimerRef.current = setInterval(() => {
      if (isMountedRef.current) runManualCheck();
    }, HEALTH_CHECK_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      clearTimeout(initialCheckTimeout);
      if (healthCheckTimerRef.current) clearInterval(healthCheckTimerRef.current);
    };
  }, [enabled, loadHealth, runManualCheck]);

  // ── Scheduled event pipeline (every 2 minutes) ──────────────────────────
  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) return;

    const runPipeline = async () => {
      try {
        await runEventPipeline();
        // Refresh Gemini stats after pipeline runs
        const stats = await getGeminiAnalysisStats();
        if (isMountedRef.current) setGeminiStats(stats);
      } catch (err) {
        console.warn('[useLiveStatus] Event pipeline error:', err);
      }
    };

    // Run after initial delay
    const pipelineTimeout = setTimeout(runPipeline, 5000);

    pipelineTimerRef.current = setInterval(runPipeline, EVENT_PIPELINE_INTERVAL_MS);

    return () => {
      clearTimeout(pipelineTimeout);
      if (pipelineTimerRef.current) clearInterval(pipelineTimerRef.current);
    };
  }, [enabled]);

  // ── Supabase Realtime subscription for provider health ──────────────────
  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) return;
    const unsubscribe = subscribeToProviderHealth((updatedProvider) => {
      if (!isMountedRef.current) return;
      setHealth(prev => {
        const providers = prev.providers.map(p =>
          p.providerKey === updatedProvider.providerKey ? updatedProvider : p
        );
        // If this is a new provider, add it
        if (!providers.find(p => p.providerKey === updatedProvider.providerKey)) {
          providers.push(updatedProvider);
        }

        const online = providers.filter(p => p.status === 'ONLINE').length;
        const offline = providers.filter(p => p.status === 'OFFLINE').length;
        const total = providers.length;

        const overallStatus: SystemHealthStatus['overallStatus'] =
          offline === total ? 'OFFLINE'
            : online === total ? 'OPERATIONAL'
            : providers.some(p => p.status === 'ONLINE') ? 'DEGRADED'
            : 'UNKNOWN';

        return { ...prev, providers, overallStatus };
      });
    });

    return unsubscribe;
  }, []);

  // ── Re-run health check when location changes ────────────────────────────
  useEffect(() => {
    runManualCheck();
  }, [location.latitude, location.longitude]);

  const getProviderByKey = useCallback((key: string) => {
    return health.providers.find(p => p.providerKey === key);
  }, [health.providers]);

  return {
    health,
    geminiStats,
    isChecking,
    lastChecked,
    runManualCheck,
    getProviderByKey,
  };
}
