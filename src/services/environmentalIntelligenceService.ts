import { supabase, isSupabaseConfigured } from './supabase';
import { Incident } from '../types/incident';
import { EnvironmentalAlert } from '../types/externalData';
import { ExternalEvent } from '../types/externalEvents';
import { getActiveEnvironmentalAlerts } from './environmentalAlertsService';
import { getLatestEarthquakes } from './earthquakeService';
import { getLatestFireEvents } from './fireService';
import { calculateHaversineDistanceKm } from './routing';

export interface MatchedEnvironmentalEvent {
  id: string;
  source: 'IMD' | 'USGS' | 'NASA_FIRMS' | string;
  eventType: 'WEATHER' | 'EARTHQUAKE' | 'FIRE' | string;
  title: string;
  severity: string;
  distanceKm: number;
  occurredAt: string;
  latitude: number;
  longitude: number;
  details?: Record<string, any>;
  aiSummary?: string;
}

export interface EnvironmentalIntelligenceReport {
  incidentId: string;
  compositeRiskScore: number; // 0 - 100
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  primaryHazard: string;
  matchedEventsCount: number;
  matchedEvents: MatchedEnvironmentalEvent[];
  operationalImpactNotes: string[];
  suggestedPriorityBoost: number; // 0 - 15 points
  evaluatedAt: string;
}

/**
 * High-performance Haversine distance calculator
 */
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return calculateHaversineDistanceKm(
    { latitude: lat1, longitude: lon1 },
    { latitude: lat2, longitude: lon2 }
  );
}

/**
 * Severity weight mapping to 0-100 scale
 */
const SEVERITY_SCORES: Record<string, number> = {
  CRITICAL: 100,
  RED: 100,
  HIGH: 75,
  ORANGE: 75,
  MODERATE: 50,
  YELLOW: 50,
  LOW: 25,
  GREEN: 10,
  INFORMATIONAL: 10,
};

export function evaluateEnvironmentalProximityRisks(
  incident: Pick<Incident, 'id' | 'latitude' | 'longitude'>,
  externalEvents: ExternalEvent[],
  alerts: EnvironmentalAlert[],
  searchRadiusKm: number = 50
): EnvironmentalIntelligenceReport {
  const matchedEvents: MatchedEnvironmentalEvent[] = [];

  for (const alert of alerts) {
    const dist = getDistance(incident.latitude, incident.longitude, alert.latitude, alert.longitude);
    if (dist <= searchRadiusKm) {
      matchedEvents.push({
        id: alert.id,
        source: alert.source || 'IMD',
        eventType: alert.alertType || 'WEATHER',
        title: alert.title,
        severity: alert.severity,
        distanceKm: dist,
        occurredAt: alert.startsAt || alert.createdAt,
        latitude: alert.latitude,
        longitude: alert.longitude,
        details: {
          affectedArea: alert.affectedArea,
          description: alert.description,
        },
      });
    }
  }

  for (const ev of externalEvents) {
    const dist = getDistance(incident.latitude, incident.longitude, ev.latitude, ev.longitude);
    if (dist <= searchRadiusKm) {
      matchedEvents.push({
        id: ev.id,
        source: ev.source || 'USGS',
        eventType: ev.eventType || (ev.source === 'NASA_FIRMS' ? 'FIRE' : 'EARTHQUAKE'),
        title: ev.title,
        severity: ev.severity,
        distanceKm: dist,
        occurredAt: ev.occurredAt,
        latitude: ev.latitude,
        longitude: ev.longitude,
        details: {
          magnitude: ev.magnitude,
          status: ev.status,
        },
      });
    }
  }

  matchedEvents.sort((a, b) => a.distanceKm - b.distanceKm);

  if (matchedEvents.length === 0) {
    return {
      incidentId: incident.id,
      compositeRiskScore: 0,
      riskLevel: 'LOW',
      primaryHazard: `None (No active environmental hazards within ${searchRadiusKm}km)`,
      matchedEventsCount: 0,
      matchedEvents: [],
      operationalImpactNotes: ['No adverse weather or seismic events detected in operational radius.'],
      suggestedPriorityBoost: 0,
      evaluatedAt: new Date().toISOString(),
    };
  }

  let maxBaseScore = 0;
  let primaryHazard = 'Environmental Alert';
  const operationalImpactNotes: string[] = [];

  matchedEvents.forEach((ev) => {
    const sevScore = SEVERITY_SCORES[ev.severity.toUpperCase()] || 30;
    const proximityMultiplier = Math.max(0.2, 1.0 - ev.distanceKm / searchRadiusKm);
    const effectiveScore = sevScore * proximityMultiplier;

    if (effectiveScore > maxBaseScore) {
      maxBaseScore = effectiveScore;
      primaryHazard = `${ev.title} (${ev.distanceKm.toFixed(1)} km away)`;
    }

    if (ev.eventType.includes('RAIN') || ev.eventType.includes('FLOOD') || ev.eventType.includes('WEATHER')) {
      operationalImpactNotes.push(
        `Weather Hazard [${ev.severity}]: ${ev.title} located ${ev.distanceKm.toFixed(1)}km from incident. Risk of reduced visibility and road transit delays.`
      );
    } else if (ev.eventType === 'FIRE') {
      operationalImpactNotes.push(
        `Active Fire Detection [${ev.severity}]: NASA FIRMS detected thermal anomaly ${ev.distanceKm.toFixed(1)}km away. Monitor smoke plume impact on emergency corridors.`
      );
    } else if (ev.eventType === 'EARTHQUAKE') {
      operationalImpactNotes.push(
        `Seismic Tremor [${ev.severity}]: USGS earthquake reported ${ev.distanceKm.toFixed(1)}km away. Potential structural hazard and road debris.`
      );
    }
  });

  const compositeRiskScore = Math.min(100, Math.round(maxBaseScore));
  const suggestedPriorityBoost = Math.min(15, Math.round(compositeRiskScore * 0.15));

  let riskLevel: EnvironmentalIntelligenceReport['riskLevel'] = 'LOW';
  if (compositeRiskScore >= 75) riskLevel = 'CRITICAL';
  else if (compositeRiskScore >= 50) riskLevel = 'HIGH';
  else if (compositeRiskScore >= 25) riskLevel = 'MODERATE';

  return {
    incidentId: incident.id,
    compositeRiskScore,
    riskLevel,
    primaryHazard,
    matchedEventsCount: matchedEvents.length,
    matchedEvents,
    operationalImpactNotes,
    suggestedPriorityBoost,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Unified Environmental & External Event Intelligence Pipeline Service.
 * Evaluates real-time proximity and operational relevance of USGS, NASA FIRMS, and IMD data
 * relative to active incidents in ResQAI.
 */
export async function evaluateIncidentEnvironmentalContext(
  incident: Incident,
  searchRadiusKm: number = 50
): Promise<EnvironmentalIntelligenceReport> {
  let alerts: EnvironmentalAlert[] = [];
  const externalEvents: ExternalEvent[] = [];

  try {
    alerts = await getActiveEnvironmentalAlerts();
  } catch (err) {
    console.warn('[EnvironmentalIntelligence] IMD alert fetch failed:', err);
  }

  try {
    const eqResult = await getLatestEarthquakes();
    if (Array.isArray(eqResult.events)) {
      externalEvents.push(...eqResult.events);
    }
  } catch (err) {
    console.warn('[EnvironmentalIntelligence] USGS earthquake fetch failed:', err);
  }

  try {
    const fireResult = await getLatestFireEvents();
    if (Array.isArray(fireResult.events)) {
      externalEvents.push(...fireResult.events);
    }
  } catch (err) {
    console.warn('[EnvironmentalIntelligence] NASA FIRMS fire fetch failed:', err);
  }

  const report = evaluateEnvironmentalProximityRisks(incident, externalEvents, alerts, searchRadiusKm);

  if (isSupabaseConfigured && report.matchedEvents.length > 0) {
    try {
      const eventIds = report.matchedEvents.map((e) => e.id);
      const { data: aiRows } = await supabase
        .from('incident_ai_analysis')
        .select('external_event_id, situation_summary, reasoning_summary')
        .in('external_event_id', eventIds);

      if (aiRows && aiRows.length > 0) {
        const aiMap = new Map(aiRows.map((r) => [r.external_event_id, r.situation_summary || r.reasoning_summary]));
        report.matchedEvents.forEach((ev) => {
          if (aiMap.has(ev.id)) {
            ev.aiSummary = aiMap.get(ev.id);
          }
        });
      }
    } catch {
      // ignore optional AI summary enrichment failure
    }
  }

  return report;
}
