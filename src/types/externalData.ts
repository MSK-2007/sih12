export type DataSourceType =
  | 'REAL_TIME'
  | 'HISTORICAL'
  | 'SIMULATED'
  | 'MANUAL'
  | 'EXTERNAL_ALERT';

export type WeatherWarningLevel = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

export interface WeatherObservation {
  id: string;
  source: string;
  locationName: string;
  latitude: number;
  longitude: number;
  temperature: number;       // Celsius
  humidity: number;          // %
  rainfall: number;          // mm/hr
  windSpeed: number;         // km/h
  weatherCondition: string;  // e.g. "Heavy Rain", "Thunderstorm", "Clear"
  warningLevel: WeatherWarningLevel;
  observedAt: string;
  receivedAt: string;
  isStale?: boolean;
}

export type AlertSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type AlertType =
  | 'HEAVY_RAIN'
  | 'FLOOD'
  | 'CYCLONE'
  | 'HEATWAVE'
  | 'FIRE_HAZARD'
  | 'THUNDERSTORM'
  | 'SEVERE_WEATHER';

export interface EnvironmentalAlert {
  id: string;
  source: string;               // 'IMD', 'IMD_NOWCAST', 'NDMA'
  sourceAlertId?: string;       // Unique ID from IMD for deduplication
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  affectedArea: string;
  region?: string;              // District / State e.g. "Bengaluru Urban, Karnataka"
  startsAt: string;
  expiresAt?: string;
  issuedAt?: string;            // When IMD officially issued the warning
  receivedAt?: string;          // When ResQAI ingested it
  status?: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  sourceUrl?: string;
  rawData?: Record<string, any>; // Full original IMD payload
  createdAt: string;
  updatedAt: string;
}

export interface ExternalIngestionLog {
  id: string;
  provider: string;
  endpoint: string;
  receivedAt: string;
  observedAt?: string;
  dataVersion?: string;
  recordsIngested: number;
  processingStatus: 'SUCCESS' | 'PARTIAL' | 'FAILURE';
  errorMessage?: string;
}

/**
 * Calculates an environmental risk score (0-100) from active alerts
 * near an incident. Used as IMD contextual input to the Priority Engine.
 */
export function calculateEnvironmentalRiskScore(
  incidentLat: number,
  incidentLon: number,
  activeAlerts: EnvironmentalAlert[],
  radiusKm: number = 30
): { score: number; relevantAlerts: EnvironmentalAlert[] } {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371; // Earth radius km

  const relevantAlerts = activeAlerts.filter((alert) => {
    const dLat = toRad(alert.latitude - incidentLat);
    const dLon = toRad(alert.longitude - incidentLon);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(incidentLat)) * Math.cos(toRad(alert.latitude)) * Math.sin(dLon / 2) ** 2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return distance <= radiusKm;
  });

  if (relevantAlerts.length === 0) return { score: 0, relevantAlerts: [] };

  const severityScores: Record<AlertSeverity, number> = {
    CRITICAL: 100,
    HIGH: 75,
    MODERATE: 50,
    LOW: 25,
  };

  const maxScore = Math.max(...relevantAlerts.map((a) => severityScores[a.severity] ?? 25));
  return { score: maxScore, relevantAlerts };
}
