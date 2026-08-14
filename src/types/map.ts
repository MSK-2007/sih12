import { EmergencyType, PriorityLevel } from './incident';
import { ResourceType, ResourceStatus } from './resource';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  geometry: [number, number][]; // LatLng coordinate tuples for Leaflet Polyline
  provider: 'OSRM' | 'HAVERSINE_ESTIMATE';
  calculatedAt: string;
}

export interface MapFilterState {
  showIncidents: boolean;
  showResources: boolean;
  showHospitals: boolean;
  incidentPriority: Record<PriorityLevel, boolean>;
  incidentType: Record<EmergencyType | 'ALL', boolean>;
  resourceType: Record<ResourceType | 'ALL', boolean>;
  resourceStatus: Record<ResourceStatus | 'ALL', boolean>;
}

export type SelectedEntityType = 'incident' | 'resource' | 'hospital';

export interface SelectedEntity {
  type: SelectedEntityType;
  id: string;
  data: any;
}

export const DEFAULT_MAP_FILTERS: MapFilterState = {
  showIncidents: true,
  showResources: true,
  showHospitals: true,
  incidentPriority: {
    CRITICAL: true,
    HIGH: true,
    MEDIUM: true,
    LOW: true,
  },
  incidentType: {
    ALL: true,
    ROAD_ACCIDENT: true,
    FIRE: true,
    MEDICAL: true,
    FLOOD: true,
    BUILDING_COLLAPSE: true,
    NATURAL_DISASTER: true,
    INDUSTRIAL_ACCIDENT: true,
    OTHER: true,
  },
  resourceType: {
    ALL: true,
    AMBULANCE: true,
    FIRE_UNIT: true,
    POLICE_UNIT: true,
    RESCUE_TEAM: true,
  },
  resourceStatus: {
    ALL: true,
    AVAILABLE: true,
    ASSIGNED: true,
    BUSY: true,
    OFFLINE: true,
  },
};
