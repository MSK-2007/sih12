import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_MAP_CENTER, DEFAULT_ZOOM, OSM_TILE_URL, OSM_ATTRIBUTION } from '../../config/map';
import { Incident } from '../../types/incident';
import { Resource } from '../../types/resource';
import { Hospital } from '../../types/hospital';
import { MapFilterState, RouteResult, DEFAULT_MAP_FILTERS } from '../../types/map';
import { EnvironmentalAlert } from '../../types/externalData';
import { ExternalEvent } from '../../types/externalEvents';
import { IncidentMarker } from './IncidentMarker';
import { ResourceMarker } from './ResourceMarker';
import { HospitalMarker } from './HospitalMarker';
import { EnvironmentalAlertMarker } from './EnvironmentalAlertMarker';
import { EarthquakeMarker } from './EarthquakeMarker';
import { FireMarker } from './FireMarker';
import { RouteLayer } from './RouteLayer';

interface MapControllerProps {
  center?: [number, number];
  zoom?: number;
}

function MapController({ center, zoom }: MapControllerProps) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || DEFAULT_ZOOM, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

interface Props {
  incidents: Incident[];
  resources: Resource[];
  hospitals?: Hospital[];
  alerts?: EnvironmentalAlert[];
  earthquakes?: ExternalEvent[];
  externalEvents?: ExternalEvent[];
  filters?: MapFilterState;
  selectedIncident?: Incident | null;
  selectedResource?: Resource | null;
  selectedHospital?: Hospital | null;
  route?: RouteResult | null;
  center?: [number, number];
  zoom?: number;
  onSelectIncident?: (incident: Incident) => void;
  onSelectResource?: (resource: Resource) => void;
  onSelectHospital?: (hospital: Hospital) => void;
  onAlertConverted?: () => void;
}

export const EmergencyMap: React.FC<Props> = ({
  incidents,
  resources,
  hospitals = [],
  alerts = [],
  earthquakes = [],
  externalEvents,
  filters = DEFAULT_MAP_FILTERS,
  selectedIncident = null,
  selectedResource = null,
  route = null,
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_ZOOM,
  onSelectIncident = () => {},
  onSelectResource = () => {},
  onSelectHospital = () => {},
  onAlertConverted = () => {},
}) => {
  // Combine earthquakes and externalEvents props
  const allEvents = externalEvents || earthquakes;

  // Filter Incidents
  const filteredIncidents = incidents.filter((i) => {
    if (!filters.showIncidents) return false;
    if (!filters.incidentPriority[i.priorityLevel]) return false;
    if (!filters.incidentType.ALL && !filters.incidentType[i.emergencyType]) return false;
    return true;
  });

  // Filter Resources
  const filteredResources = resources.filter((r) => {
    if (!filters.showResources) return false;
    const type = r.resourceType || r.type || 'AMBULANCE';
    if (!filters.resourceType.ALL && !filters.resourceType[type]) return false;
    if (!filters.resourceStatus.ALL && !filters.resourceStatus[r.status]) return false;
    return true;
  });

  // Filter Hospitals
  const filteredHospitals = hospitals.filter(() => filters.showHospitals);

  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl border border-slate-800 shadow-inner">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%', backgroundColor: '#0f172a' }}
        zoomControl={false}
      >
        <MapController center={center} zoom={zoom} />

        <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />

        {/* Route Polyline Layer */}
        <RouteLayer route={route} />

        {/* Environmental Warning Alerts Overlay Layer */}
        {alerts.map((a) => (
          <EnvironmentalAlertMarker key={a.id} alert={a} onAlertConverted={onAlertConverted} />
        ))}

        {/* Real-time External Data Markers (USGS Earthquakes & NASA FIRMS Active Fires) */}
        {allEvents.map((ev) => {
          if (ev.source === 'NASA_FIRMS' || ev.eventType === 'FIRE') {
            return <FireMarker key={ev.id} event={ev} onEventConverted={onAlertConverted} />;
          }
          return <EarthquakeMarker key={ev.id} event={ev} onEventConverted={onAlertConverted} />;
        })}

        {/* Hospital Markers */}
        {filteredHospitals.map((h) => (
          <HospitalMarker
            key={h.id}
            hospital={h}
            onSelect={onSelectHospital}
          />
        ))}

        {/* Resource Markers */}
        {filteredResources.map((r) => (
          <ResourceMarker
            key={r.id}
            resource={r}
            isSelected={selectedResource?.id === r.id}
            onSelect={onSelectResource}
          />
        ))}

        {/* Incident Markers */}
        {filteredIncidents.map((i) => (
          <IncidentMarker
            key={i.id}
            incident={i}
            isSelected={selectedIncident?.id === i.id}
            onSelect={onSelectIncident}
          />
        ))}
      </MapContainer>
    </div>
  );
};
