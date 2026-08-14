import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Resource } from '../../types/resource';
import { Incident } from '../../types/incident';
import { Hospital } from '../../types/hospital';
import { calculateRoute, RouteResult } from '../../services/routingService';
import { OSM_TILE_URL, OSM_ATTRIBUTION } from '../../config/map';
import { Navigation, MapPin, Hospital as HospitalIcon, Compass, ArrowUpRight, CornerUpRight } from 'lucide-react';

// Custom icons for Leaflet driver HUD
const driverUnitIcon = L.divIcon({
  className: 'driver-unit-marker',
  html: `<div style="background-color:#FF4D00; width:34px; height:34px; border-radius:50%; border:3px solid #000; display:flex; align-items:center; justify-content:center; box-shadow:0 0 15px #FF4D00;"><span style="color:#000; font-weight:bold; font-size:11px;">10-8</span></div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const incidentTargetIcon = L.divIcon({
  className: 'incident-target-marker',
  html: `<div style="background-color:#EF4444; width:34px; height:34px; border-radius:50%; border:3px solid #FFF; display:flex; align-items:center; justify-content:center; box-shadow:0 0 18px #EF4444;" class="animate-ping"><span style="color:#FFF; font-weight:bold; font-size:12px;">SOS</span></div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const hospitalTargetIcon = L.divIcon({
  className: 'hospital-target-marker',
  html: `<div style="background-color:#3B82F6; width:30px; height:30px; border-radius:6px; border:2px solid #FFF; display:flex; align-items:center; justify-content:center; box-shadow:0 0 12px #3B82F6;"><span style="color:#FFF; font-weight:bold; font-size:12px;">H</span></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 15, { duration: 1 });
  }, [center, map]);
  return null;
}

interface Props {
  resource: Resource;
  incident: Incident | null;
  nearestHospital: Hospital | null;
}

export const DriverNavigationHUD: React.FC<Props> = ({
  resource,
  incident,
  nearestHospital,
}) => {
  const [route, setRoute] = useState<RouteResult | null>(null);

  const unitCenter: [number, number] = [resource.latitude, resource.longitude];
  const targetIncidentCenter: [number, number] | null = incident
    ? [incident.latitude, incident.longitude]
    : null;
  const hospitalCenter: [number, number] | null = nearestHospital
    ? [nearestHospital.latitude, nearestHospital.longitude]
    : null;

  useEffect(() => {
    if (incident) {
      calculateRoute(
        resource.latitude,
        resource.longitude,
        incident.latitude,
        incident.longitude
      ).then(setRoute);
    } else {
      setRoute(null);
    }
  }, [resource.latitude, resource.longitude, incident]);

  // Generate simulated turn-by-turn guidance steps
  const getTurnByTurnSteps = () => {
    if (!incident || !route) return [];
    return [
      { instruction: `Depart base location in ${resource.resourceCode}`, distance: '0.0 km', icon: Navigation },
      { instruction: `Emergency Siren priority route: Turn onto Main Arterial Corridor`, distance: `${(route.distanceKm * 0.3).toFixed(1)} km`, icon: CornerUpRight },
      { instruction: `Proceed clear through traffic intersections towards ${incident.address}`, distance: `${(route.distanceKm * 0.7).toFixed(1)} km`, icon: ArrowUpRight },
      { instruction: `Arrive at scene: ${incident.title}`, distance: `${route.distanceKm.toFixed(1)} km`, icon: MapPin },
    ];
  };

  const steps = getTurnByTurnSteps();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Map HUD Canvas */}
      <div className="lg:col-span-2 glass-panel border-2 border-white/20 rounded-xl overflow-hidden h-[420px] relative bg-black">
        {/* Top HUD Badge */}
        <div className="absolute top-3 left-3 z-[1000] bg-black/90 border border-white/20 p-2.5 rounded-lg flex items-center gap-3 backdrop-blur-md">
          <div className="w-3 h-3 rounded-full bg-[#FF4D00] animate-ping" />
          <div className="font-space text-xs">
            <div className="text-[#FF4D00] font-bold uppercase">LIVE DRIVER GPS HUD</div>
            <div className="text-white text-[11px]">
              {resource.latitude.toFixed(4)} N, {resource.longitude.toFixed(4)} E
            </div>
          </div>
        </div>

        {/* Route Info Overlay */}
        {route && (
          <div className="absolute top-3 right-3 z-[1000] bg-black/90 border border-[#FF4D00] p-2.5 rounded-lg flex items-center gap-3 backdrop-blur-md font-space text-xs">
            <div>
              <div className="text-slate-400 text-[10px] uppercase">DISTANCE</div>
              <div className="text-white font-bold">{route.distanceKm} KM</div>
            </div>
            <div className="h-6 w-px bg-white/20" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase">ETA</div>
              <div className="text-[#FF4D00] font-bold">{route.etaMinutes} MIN</div>
            </div>
          </div>
        )}

        <MapContainer
          center={unitCenter}
          zoom={14}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <MapRecenter center={unitCenter} />
          <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />

          {/* Unit Position Marker */}
          <Marker position={unitCenter} icon={driverUnitIcon}>
            <Popup>
              <div className="font-space text-xs">
                <strong>{resource.resourceCode}</strong> - {resource.name}
              </div>
            </Popup>
          </Marker>

          {/* Incident Destination Marker */}
          {targetIncidentCenter && incident && (
            <Marker position={targetIncidentCenter} icon={incidentTargetIcon}>
              <Popup>
                <div className="font-space text-xs">
                  <strong className="text-red-500">{incident.incidentNumber}</strong>: {incident.title}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Hospital Destination Marker */}
          {hospitalCenter && nearestHospital && (
            <Marker position={hospitalCenter} icon={hospitalTargetIcon}>
              <Popup>
                <div className="font-space text-xs">
                  <strong className="text-blue-500">{nearestHospital.name}</strong>
                  <div>Available Beds: {nearestHospital.availableBeds}</div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* OSRM / Haversine Route Polyline */}
          {route && route.coordinates.length > 0 && (
            <Polyline
              positions={route.coordinates}
              pathOptions={{ color: '#FF4D00', weight: 6, opacity: 0.85, dashArray: '8, 8' }}
            />
          )}
        </MapContainer>
      </div>

      {/* Turn-by-Turn Guidance & Hospital Card */}
      <div className="space-y-4 flex flex-col justify-between">
        {/* Turn-by-turn Navigation Panel */}
        <div className="glass-panel border-2 border-white/20 p-4 rounded-xl space-y-3 bg-black/80 flex-1">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <Compass className="w-4 h-4 text-[#FF4D00]" />
            <h4 className="font-archivo text-xs text-white uppercase tracking-wider">
              TURN-BY-TURN TACTICAL GUIDANCE
            </h4>
          </div>

          {steps.length === 0 ? (
            <div className="text-slate-500 font-space text-xs text-center py-6">
              NO ACTIVE ROUTE GUIDANCE. ASSIGN AN INCIDENT TO CALCULATE TACTICAL ROUTE.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {steps.map((st, i) => {
                const Icon = st.icon;
                return (
                  <div key={i} className="flex items-start gap-2.5 p-2 bg-white/5 rounded border border-white/10 font-space text-xs">
                    <div className="p-1.5 bg-[#FF4D00]/20 border border-[#FF4D00]/40 text-[#FF4D00] rounded shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium text-[11px] leading-snug">{st.instruction}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{st.distance}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Nearest Hospital Trauma Card */}
        {nearestHospital && (
          <div className="glass-panel border-2 border-blue-500/40 p-4 rounded-xl bg-blue-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HospitalIcon className="w-4 h-4 text-blue-400" />
                <span className="font-archivo text-xs text-white uppercase">
                  RECOMMENDED DESCENT HOSPITAL
                </span>
              </div>
              <span className="text-[10px] font-space px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/40">
                LEVEL 1 TRAUMA
              </span>
            </div>

            <div className="font-space text-xs font-bold text-blue-200">
              {nearestHospital.name}
            </div>

            <div className="grid grid-cols-2 gap-2 font-space text-[11px] text-slate-300 pt-1 border-t border-white/10">
              <div>Available Beds: <strong className="text-emerald-400">{nearestHospital.availableBeds}</strong></div>
              <div>ICU Beds: <strong className="text-cyan-400">{nearestHospital.icuAvailable}</strong></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
