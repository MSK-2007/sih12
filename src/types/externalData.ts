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

export interface EnvironmentalAlert {
  id: string;
  source: string;
  alertType: 'HEAVY_RAIN' | 'FLOOD' | 'CYCLONE' | 'HEATWAVE' | 'FIRE_HAZARD' | 'THUNDERSTORM';
  severity: AlertSeverity;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  affectedArea: string;
  startsAt: string;
  expiresAt?: string;
  sourceUrl?: string;
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
