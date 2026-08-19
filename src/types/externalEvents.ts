export type EarthquakeSeverity = 'INFORMATIONAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface ExternalEvent {
  id: string;
  source: string;              // 'USGS'
  sourceEventId: string;
  eventType: string;           // 'EARTHQUAKE'
  latitude: number;
  longitude: number;
  magnitude: number;
  title: string;
  severity: EarthquakeSeverity;
  occurredAt: string;
  receivedAt: string;
  status: 'DETECTED' | 'UNDER_REVIEW' | 'CONVERTED_TO_INCIDENT' | 'ARCHIVED';
  rawData?: Record<string, any>;
  createdAt?: string;
}

export interface EarthquakeIngestionResult {
  success: boolean;
  events: ExternalEvent[];
  provider: string;
  status: 'ONLINE' | 'CACHED' | 'OFFLINE';
  errorMessage?: string;
}
