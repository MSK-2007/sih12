import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { ExternalEvent } from '../../types/externalEvents';
import { ShieldAlert, Activity } from 'lucide-react';
import { convertEarthquakeToIncident } from '../../services/earthquakeService';

const getEarthquakeIcon = (magnitude: number, severity: string) => {
  let bgColor = '#eab308'; // Yellow

  if (severity === 'CRITICAL' || magnitude >= 7.0) {
    bgColor = '#dc2626'; // Red pulse
  } else if (severity === 'HIGH' || magnitude >= 6.0) {
    bgColor = '#ea580c'; // Orange
  } else if (severity === 'MODERATE' || magnitude >= 5.0) {
    bgColor = '#f59e0b'; // Amber
  } else if (severity === 'LOW') {
    bgColor = '#84cc16'; // Lime
  }

  const html = `
    <div style="
      background-color: ${bgColor};
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      box-shadow: 0 0 14px ${bgColor};
      border: 2px solid white;
      cursor: pointer;
      color: white;
    ">
      🌍
    </div>
  `;

  return L.divIcon({
    html,
    className: 'usgs-earthquake-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
};

interface Props {
  event: ExternalEvent;
  onEventConverted?: () => void;
}

export const EarthquakeMarker: React.FC<Props> = ({ event, onEventConverted }) => {
  const icon = getEarthquakeIcon(event.magnitude, event.severity);

  const handleConvert = async () => {
    try {
      await convertEarthquakeToIncident(event);
      if (onEventConverted) onEventConverted();
    } catch (err) {
      console.error('[EarthquakeMarker] Conversion error:', err);
    }
  };

  return (
    <Marker position={[event.latitude, event.longitude]} icon={icon}>
      <Popup className="custom-leaflet-popup">
        <div className="p-3 bg-slate-900 text-white rounded-lg border border-slate-700 min-w-[240px]">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-1.5">
              <Activity className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">USGS EARTHQUAKE</span>
            </div>
            <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {event.severity}
            </span>
          </div>

          <div className="text-2xl font-black text-white mb-1">
            M {event.magnitude.toFixed(1)}
          </div>

          <h4 className="text-xs font-bold text-slate-200 mb-2 leading-snug">{event.title}</h4>

          <div className="text-[11px] text-slate-400 space-y-1 border-t border-slate-800 pt-2 mb-3">
            <div>Source: <strong className="text-slate-200">{event.source}</strong></div>
            <div>Location: <strong className="text-slate-200">{event.latitude.toFixed(3)}°, {event.longitude.toFixed(3)}°</strong></div>
            <div>Time: <strong className="text-slate-200">{new Date(event.occurredAt).toLocaleString()}</strong></div>
            <div>Status: <strong className="text-cyan-400">{event.status}</strong></div>
          </div>

          <button
            onClick={handleConvert}
            disabled={event.status === 'CONVERTED_TO_INCIDENT'}
            className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold rounded text-xs flex items-center justify-center space-x-1 transition"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{event.status === 'CONVERTED_TO_INCIDENT' ? 'Incident Created' : 'Create ResQAI Incident'}</span>
          </button>
        </div>
      </Popup>
    </Marker>
  );
};
