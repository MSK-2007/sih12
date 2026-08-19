import { supabase, isSupabaseConfigured } from './supabase';
import { EnvironmentalAlert } from '../types/externalData';
import { createIncident } from './incidents';

const MOCK_ENVIRONMENTAL_ALERTS: EnvironmentalAlert[] = [
  {
    id: 'env-alert-101',
    source: 'IMD_NOWCAST_SERVICE',
    alertType: 'HEAVY_RAIN',
    severity: 'HIGH',
    title: 'IMD Heavy Rainfall & Urban Flash Flood Warning',
    description: 'Persistent monsoonal storm activity causing 42 mm/hr waterlogging near Hebbal and Silk Board flyover corridors.',
    latitude: 13.0358,
    longitude: 77.597,
    affectedArea: 'North Bengaluru Transit Corridor',
    startsAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    sourceUrl: 'https://mausam.imd.gov.in',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'env-alert-102',
    source: 'DISASTER_MANAGEMENT_AUTHORITY',
    alertType: 'FLOOD',
    severity: 'CRITICAL',
    title: 'Low-Lying Inundation Hazard',
    description: 'Underpass inundation reported. Ambulances advised to use outer ring elevated flyover bypass.',
    latitude: 12.9172,
    longitude: 77.6228,
    affectedArea: 'Silk Board Underpass Sector',
    startsAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    sourceUrl: 'https://ndma.gov.in',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Fetches active environmental alerts with server fallback.
 */
export async function getActiveEnvironmentalAlerts(): Promise<EnvironmentalAlert[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke('ingest-alerts', {
        body: { latitude: 12.9716, longitude: 77.5946 },
      });

      if (!error && data?.success && Array.isArray(data.alerts)) {
        return data.alerts.map((a: any, idx: number) => ({
          id: a.id || `alert-${idx}-${Date.now()}`,
          source: a.source || 'IMD_NOWCAST',
          alertType: a.alert_type || 'HEAVY_RAIN',
          severity: a.severity || 'HIGH',
          title: a.title,
          description: a.description,
          latitude: a.latitude,
          longitude: a.longitude,
          affectedArea: a.affected_area || 'Metropolitan Area',
          startsAt: a.starts_at,
          expiresAt: a.expires_at,
          sourceUrl: a.source_url,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }
    } catch (err) {
      console.warn('[AlertsService] Server ingestion error, using local alerts:', err);
    }
  }

  return MOCK_ENVIRONMENTAL_ALERTS;
}

/**
 * Converts an external environmental alert into a ResQAI Incident tagged with source_type = EXTERNAL_ALERT.
 */
export async function convertAlertToIncident(alert: EnvironmentalAlert) {
  const incident = await createIncident({
    emergencyType: alert.alertType === 'FLOOD' ? 'FLOOD' : 'NATURAL_DISASTER',
    title: `[EXTERNAL ALERT] ${alert.title}`,
    description: `${alert.description} (Source: ${alert.source} — ${alert.affectedArea})`,
    address: alert.affectedArea,
    latitude: alert.latitude,
    longitude: alert.longitude,
    peopleAffected: alert.severity === 'CRITICAL' ? 15 : 5,
    injuryLevel: alert.severity === 'CRITICAL' ? 'MODERATE' : 'MINOR',
    sourceType: 'EXTERNAL_ALERT',
  });

  return incident;
}
