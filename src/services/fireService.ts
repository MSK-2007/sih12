import { supabase, isSupabaseConfigured } from './supabase';
import { ExternalEvent, EarthquakeIngestionResult, EarthquakeSeverity } from '../types/externalEvents';

/**
 * Prototype Severity Classifier for NASA FIRMS Active Fire events.
 */
export function classifyFireSeverity(frp: number, confidence: string | number): EarthquakeSeverity {
  const confStr = String(confidence).toLowerCase();
  const isHighConf = confStr === 'h' || confStr === 'high' || Number(confidence) >= 80;

  if (frp >= 50 || (frp >= 30 && isHighConf)) return 'CRITICAL';
  if (frp >= 20 || isHighConf) return 'HIGH';
  if (frp >= 5.0 || confStr === 'n' || confStr === 'nominal' || Number(confidence) >= 50) return 'MODERATE';
  if (frp >= 1.0) return 'LOW';
  return 'INFORMATIONAL';
}

export interface FireIngestionResult extends EarthquakeIngestionResult {
  operationalRegion?: string;
}

/**
 * Ingests and fetches live NASA FIRMS active fire events.
 */
export async function getLatestFireEvents(bbox: string = '74,11,79,16'): Promise<FireIngestionResult> {
  if (isSupabaseConfigured) {
    try {
      // 1. Invoke Supabase Edge Function ingest-fire-events
      const { data, error } = await supabase.functions.invoke('ingest-fire-events', {
        body: { bbox },
      });

      if (!error && data?.success) {
        // Query DB for inserted events
        const { data: dbRows } = await supabase
          .from('external_events')
          .select('*')
          .eq('source', 'NASA_FIRMS')
          .order('occurred_at', { ascending: false })
          .limit(50);

        if (dbRows && dbRows.length > 0) {
          const events: ExternalEvent[] = dbRows.map(mapDbRowToExternalEvent);
          return {
            success: true,
            events,
            provider: 'NASA FIRMS VIIRS Active Fire Data',
            status: 'ONLINE',
            operationalRegion: data.operationalRegion || bbox,
          };
        }
      } else if (data?.status === 'UNAVAILABLE' || data?.error) {
        console.warn('[FireService] NASA FIRMS Edge Function returned status notice:', data?.error);
      }
    } catch (err) {
      console.warn('[FireService] Edge Function invocation error, checking database cache:', err);
    }

    // 2. Database Fallback Query from external_events table
    try {
      const { data: dbRows, error: dbErr } = await supabase
        .from('external_events')
        .select('*')
        .eq('source', 'NASA_FIRMS')
        .order('occurred_at', { ascending: false })
        .limit(50);

      if (!dbErr && dbRows && dbRows.length > 0) {
        const events: ExternalEvent[] = dbRows.map(mapDbRowToExternalEvent);
        return {
          success: true,
          events,
          provider: 'NASA FIRMS Data (Database Cache)',
          status: 'CACHED',
          operationalRegion: bbox,
        };
      }
    } catch (dbErr) {
      console.warn('[FireService] DB Query failed:', dbErr);
    }
  }

  return {
    success: false,
    events: [],
    provider: 'NASA FIRMS Active Fire Data',
    status: 'OFFLINE',
    errorMessage: 'FIRMS_MAP_KEY secret is not configured in Supabase Edge Function secrets.',
    operationalRegion: bbox,
  };
}

/**
 * Subscribes to Supabase Realtime changes specifically for NASA FIRMS fire events.
 */
export function subscribeToFireEventsRealtime(onNewFireEvent: (event: ExternalEvent) => void) {
  if (!isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel('public:external_events:nasa_firms')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'external_events', filter: 'source=eq.NASA_FIRMS' },
      (payload) => {
        const row = payload.new;
        if (row) {
          onNewFireEvent(mapDbRowToExternalEvent(row));
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

function mapDbRowToExternalEvent(r: any): ExternalEvent {
  return {
    id: r.id,
    source: r.source || 'NASA_FIRMS',
    sourceEventId: r.source_event_id,
    eventType: r.event_type || 'FIRE',
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    magnitude: Number(r.magnitude || 0.0), // Fire Radiative Power (MW)
    title: r.title,
    severity: r.severity || 'MODERATE',
    occurredAt: r.occurred_at,
    receivedAt: r.received_at,
    status: r.status,
    rawData: r.raw_data,
  };
}
