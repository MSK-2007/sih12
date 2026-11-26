import { supabase, isSupabaseConfigured } from './supabase';

export interface ProviderHealth {
  providerKey: string;
  providerName: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'STALE' | 'UNKNOWN';
  lastSuccessfulUpdate: string | null;
  lastAttempt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  consecutiveFailures: number;
  recordsLastFetch: number;
  responseTimeMs: number | null;
  endpoint: string | null;
  updatedAt: string;
}

export interface SystemHealthStatus {
  overallStatus: 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';
  providers: ProviderHealth[];
  lastChecked: string | null;
}

function mapRowToHealth(r: any): ProviderHealth {
  return {
    providerKey: r.provider_key,
    providerName: r.provider_name,
    status: computeStaleness(r),
    lastSuccessfulUpdate: r.last_successful_update,
    lastAttempt: r.last_attempt,
    lastError: r.last_error,
    lastErrorAt: r.last_error_at,
    consecutiveFailures: r.consecutive_failures || 0,
    recordsLastFetch: r.records_last_fetch || 0,
    responseTimeMs: r.response_time_ms,
    endpoint: r.endpoint,
    updatedAt: r.updated_at,
  };
}

/** 
 * Compute effective staleness status.
 * A provider marked ONLINE but not updated in >15 min is STALE.
 */
function computeStaleness(r: any): ProviderHealth['status'] {
  if (r.status === 'OFFLINE' || r.status === 'UNKNOWN') return r.status;

  const lastUpdate = r.last_successful_update;
  if (!lastUpdate) return r.status === 'ONLINE' ? 'STALE' : r.status;

  const ageMinutes = (Date.now() - new Date(lastUpdate).getTime()) / 60000;

  // Different stale thresholds per provider type
  const staleThresholds: Record<string, number> = {
    usgs: 10,         // USGS: stale if >10 min
    imd: 15,          // IMD: stale if >15 min
    nasa_firms: 20,   // FIRMS: stale if >20 min
    gemini: 30,       // Gemini: stale if >30 min (it's on-demand)
    supabase_realtime: 5, // Realtime: stale if >5 min
  };

  const threshold = staleThresholds[r.provider_key] || 15;
  if (ageMinutes > threshold) return 'STALE';

  return r.status as ProviderHealth['status'];
}

/**
 * Fetch current provider health from DB.
 */
export async function getProviderHealth(): Promise<SystemHealthStatus> {
  if (!isSupabaseConfigured) {
    return {
      overallStatus: 'UNKNOWN',
      providers: [],
      lastChecked: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from('provider_health')
      .select('*')
      .order('provider_key');

    if (error || !data) throw error;

    const providers = data.map(mapRowToHealth);
    const online = providers.filter(p => p.status === 'ONLINE').length;
    const offline = providers.filter(p => p.status === 'OFFLINE').length;
    const total = providers.length;

    const overallStatus: SystemHealthStatus['overallStatus'] =
      offline === total ? 'OFFLINE'
        : online === total ? 'OPERATIONAL'
        : providers.some(p => p.status === 'ONLINE') ? 'DEGRADED'
        : 'UNKNOWN';

    return {
      overallStatus,
      providers,
      lastChecked: new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[ProviderHealthService] DB query failed:', err);
    return { overallStatus: 'UNKNOWN', providers: [], lastChecked: null };
  }
}

/**
 * Trigger a provider health check via Edge Function.
 * Returns updated health status.
 */
export async function runHealthCheck(
  providers: string[] = ['imd', 'usgs', 'nasa_firms', 'gemini'],
  locationOptions?: { latitude?: number; longitude?: number; district?: string; state?: string }
): Promise<{ success: boolean; overallStatus: string; results: any[] }> {
  if (!isSupabaseConfigured) {
    return { success: false, overallStatus: 'UNKNOWN', results: [] };
  }

  try {
    const { data, error } = await supabase.functions.invoke('monitor-data-providers', {
      body: {
        providers,
        latitude: locationOptions?.latitude,
        longitude: locationOptions?.longitude,
        district: locationOptions?.district,
        state: locationOptions?.state,
      },
    });

    if (error) throw error;
    return {
      success: data?.success ?? false,
      overallStatus: data?.overallStatus ?? 'UNKNOWN',
      results: data?.providers ?? [],
    };
  } catch (err: any) {
    console.warn('[ProviderHealthService] Health check failed:', err?.message);
    return { success: false, overallStatus: 'OFFLINE', results: [] };
  }
}

/**
 * Trigger the event-driven processing pipeline.
 */
export async function runEventPipeline(): Promise<{ success: boolean; eventsProcessed: number; geminiAnalysesTriggered: number }> {
  if (!isSupabaseConfigured) return { success: false, eventsProcessed: 0, geminiAnalysesTriggered: 0 };

  try {
    const { data, error } = await supabase.functions.invoke('process-live-events', { body: {} });
    if (error) throw error;
    return {
      success: data?.success ?? false,
      eventsProcessed: data?.eventsProcessed ?? 0,
      geminiAnalysesTriggered: data?.geminiAnalysesTriggered ?? 0,
    };
  } catch (err: any) {
    console.warn('[ProviderHealthService] Event pipeline failed:', err?.message);
    return { success: false, eventsProcessed: 0, geminiAnalysesTriggered: 0 };
  }
}

/**
 * Subscribe to real-time provider health updates.
 */
export function subscribeToProviderHealth(onUpdate: (provider: ProviderHealth) => void): () => void {
  if (!isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel('public:provider_health')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'provider_health' },
      (payload) => {
        if (payload.new) {
          onUpdate(mapRowToHealth(payload.new));
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Get recent AI event timeline entries.
 */
export async function getAiEventTimeline(options?: {
  incidentId?: string;
  limit?: number;
  since?: string;
}): Promise<any[]> {
  if (!isSupabaseConfigured) return [];

  try {
    let q = supabase
      .from('ai_event_timeline')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(options?.limit || 50);

    if (options?.incidentId) q = q.eq('incident_id', options.incidentId);
    if (options?.since) q = q.gte('occurred_at', options.since);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[ProviderHealthService] AI timeline fetch failed:', err);
    return [];
  }
}

/**
 * Subscribe to real-time AI event timeline updates.
 */
export function subscribeToAiTimeline(onEvent: (event: any) => void): () => void {
  if (!isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel('public:ai_event_timeline')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'ai_event_timeline' },
      (payload) => {
        if (payload.new) onEvent(payload.new);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Get the Gemini AI analysis count for today.
 */
export async function getGeminiAnalysisStats(): Promise<{ count: number; lastAnalyzedAt: string | null }> {
  if (!isSupabaseConfigured) return { count: 0, lastAnalyzedAt: null };

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data, count } = await supabase
      .from('incident_ai_analysis')
      .select('created_at', { count: 'exact' })
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    return {
      count: count || 0,
      lastAnalyzedAt: data?.[0]?.created_at || null,
    };
  } catch {
    return { count: 0, lastAnalyzedAt: null };
  }
}
