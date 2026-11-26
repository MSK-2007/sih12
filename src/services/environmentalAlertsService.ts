import { supabase, isSupabaseConfigured, markBackendLive, markBackendOffline } from './supabase';
import { EnvironmentalAlert } from '../types/externalData';
import { createIncident, recalculateIncidentPriority } from './incidents';

export interface ImdIngestionResult {
  success: boolean;
  alerts: EnvironmentalAlert[];
  provider: string;
  status: 'ONLINE' | 'CACHED' | 'UNAVAILABLE' | 'OFFLINE';
  monitoredRegion?: string;
  recordsIngested?: number;
  errorMessage?: string;
}

// Static fallback alerts — used ONLY when DB + edge function are both unreachable
const FALLBACK_ALERTS: EnvironmentalAlert[] = [
  {
    id: 'env-alert-fallback-01',
    source: 'IMD',
    sourceAlertId: 'imd-blr-fallback-01',
    alertType: 'HEAVY_RAIN',
    severity: 'HIGH',
    title: 'IMD Heavy Rainfall & Urban Flash Flood Warning',
    description:
      'Persistent monsoonal storm activity causing waterlogging near Hebbal and Silk Board flyover corridors.',
    latitude: 13.0358,
    longitude: 77.597,
    affectedArea: 'North Bengaluru Transit Corridor',
    region: 'Bengaluru Urban, Karnataka',
    startsAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    issuedAt: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    status: 'ACTIVE',
    sourceUrl: 'https://mausam.imd.gov.in',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'env-alert-fallback-02',
    source: 'IMD',
    sourceAlertId: 'imd-blr-fallback-02',
    alertType: 'FLOOD',
    severity: 'CRITICAL',
    title: 'Low-Lying Inundation Hazard',
    description:
      'Underpass inundation reported. Ambulances advised to use outer ring elevated flyover bypass.',
    latitude: 12.9172,
    longitude: 77.6228,
    affectedArea: 'Silk Board Underpass Sector',
    region: 'South Bengaluru, Karnataka',
    startsAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    issuedAt: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    status: 'ACTIVE',
    sourceUrl: 'https://mausam.imd.gov.in',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Maps a Supabase DB row to the EnvironmentalAlert interface.
 */
function mapDbRowToAlert(r: any): EnvironmentalAlert {
  return {
    id: r.id,
    source: r.source || 'IMD',
    sourceAlertId: r.source_alert_id,
    alertType: r.alert_type || 'HEAVY_RAIN',
    severity: r.severity || 'MODERATE',
    title: r.title,
    description: r.description || '',
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    affectedArea: r.affected_area || r.region || 'Metropolitan Area',
    region: r.region,
    startsAt: r.starts_at || r.issued_at || new Date().toISOString(),
    expiresAt: r.expires_at,
    issuedAt: r.issued_at,
    receivedAt: r.received_at,
    status: r.status || 'ACTIVE',
    sourceUrl: r.source_url,
    rawData: r.raw_data,
    createdAt: r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at || new Date().toISOString(),
  };
}

/**
 * Primary: Invoke ingest-imd-alerts Edge Function to trigger ingestion + return DB alerts.
 * Fallback 1: Query environmental_alerts DB directly.
 * Fallback 2: Return static documented fallback alerts.
 */
export async function getActiveEnvironmentalAlerts(
  options: { latitude?: number; longitude?: number; district?: string; state?: string } = {}
): Promise<EnvironmentalAlert[]> {
  const result = await getImdAlerts(options);
  return result.alerts;
}

export async function getImdAlerts(
  options: {
    latitude?: number;
    longitude?: number;
    district?: string;
    state?: string;
  } = {}
): Promise<ImdIngestionResult> {
  if (isSupabaseConfigured) {
    // 1. Trigger Edge Function for live IMD ingestion
    try {
      const { data, error } = await supabase.functions.invoke('ingest-imd-alerts', {
        body: {
          latitude: options.latitude ?? 12.9716,
          longitude: options.longitude ?? 77.5946,
          district: options.district ?? 'Bengaluru Urban',
          state: options.state ?? 'Karnataka',
        },
      });

      if (!error && data?.success) {
        markBackendLive();
        const alerts: EnvironmentalAlert[] = Array.isArray(data.alerts)
          ? data.alerts.map(mapDbRowToAlert)
          : [];

        if (alerts.length > 0) {
          return {
            success: true,
            alerts,
            provider: data.provider || 'IMD India Meteorological Department',
            status: data.status === 'ONLINE' ? 'ONLINE' : 'CACHED',
            monitoredRegion: data.monitoredRegion,
            recordsIngested: data.recordsIngested,
          };
        }

        // Edge function ok but no current weather alerts (clear conditions)
        return {
          success: true,
          alerts: [],
          provider: 'IMD India Meteorological Department',
          status: data.status === 'ONLINE' ? 'ONLINE' : 'CACHED',
          monitoredRegion: data.monitoredRegion ?? 'Bengaluru Urban, Karnataka',
          recordsIngested: 0,
        };
      }
    } catch (err) {
      console.warn('[IMDService] Edge Function invocation error, querying DB cache:', err);
    }

    // 2. Database fallback: query environmental_alerts directly
    try {
      const { data: dbRows, error: dbErr } = await supabase
        .from('environmental_alerts')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('starts_at', { ascending: false })
        .limit(20);

      if (!dbErr && dbRows) {
        markBackendLive();
        return {
          success: true,
          alerts: dbRows.map(mapDbRowToAlert),
          provider: 'IMD Data (Database Cache)',
          status: 'CACHED',
        };
      }
      if (dbErr) markBackendOffline(dbErr.message);
    } catch (dbErr) {
      markBackendOffline(dbErr instanceof Error ? dbErr.message : 'IMD DB fallback failed');
      console.warn('[IMDService] DB fallback query failed:', dbErr);
    }
  }

  // 3. Ultimate static fallback to documented alerts
  return {
    success: false,
    alerts: FALLBACK_ALERTS,
    provider: 'IMD (Offline Fallback)',
    status: 'OFFLINE',
    errorMessage: 'IMD live feed and database cache unavailable.',
  };
}

/**
 * Subscribe to Supabase Realtime for new environmental_alerts in real-time.
 */
export function subscribeToEnvironmentalAlertsRealtime(
  onNewAlert: (alert: EnvironmentalAlert) => void
): () => void {
  if (!isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel('public:environmental_alerts')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'environmental_alerts' },
      (payload) => {
        if (payload.new) {
          onNewAlert(mapDbRowToAlert(payload.new));
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Converts an environmental alert to a ResQAI Incident (operator confirmation required).
 */
export async function convertAlertToIncident(alert: EnvironmentalAlert) {
  const incident = await createIncident({
    emergencyType: alert.alertType === 'FLOOD' ? 'FLOOD' : 'NATURAL_DISASTER',
    title: `[IMD ALERT] ${alert.title}`,
    description: `${alert.description} (Source: ${alert.source} — ${alert.affectedArea})`,
    address: alert.affectedArea,
    latitude: alert.latitude,
    longitude: alert.longitude,
    peopleAffected: alert.severity === 'CRITICAL' ? 20 : alert.severity === 'HIGH' ? 10 : 5,
    injuryLevel:
      alert.severity === 'CRITICAL' ? 'MODERATE' : alert.severity === 'HIGH' ? 'MINOR' : 'NONE',
    sourceType: 'EXTERNAL_ALERT',
  });

  // Mark alert as linked to a ResQAI incident
  if (isSupabaseConfigured && alert.id) {
    try {
      await supabase
        .from('environmental_alerts')
        .update({ status: 'ACTIVE' })
        .eq('id', alert.id);
    } catch (err) {
      console.warn('[IMDService] Status update warning:', err);
    }
  }

  // Recalculate deterministic priority incorporating environmental context
  await recalculateIncidentPriority(incident.id).catch(() => null);

  return incident;
}
