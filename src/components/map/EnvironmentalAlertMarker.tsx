import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { EnvironmentalAlert } from '../../types/externalData';
import { ShieldAlert } from 'lucide-react';
import { convertAlertToIncident } from '../../services/environmentalAlertsService';

const getAlertIcon = (alertType: string, severity: string) => {
  let emoji = '🌧';
  let bgColor = '#f59e0b'; // Amber

  if (alertType === 'FLOOD') {
    emoji = '🌊';
    bgColor = '#06b6d4'; // Cyan
  } else if (alertType === 'FIRE_HAZARD') {
    emoji = '🔥';
    bgColor = '#ef4444'; // Red
  } else if (alertType === 'HEAVY_RAIN') {
    emoji = '🌧';
    bgColor = '#3b82f6'; // Blue
  } else if (alertType === 'THUNDERSTORM') {
    emoji = '⚡';
    bgColor = '#a855f7'; // Purple
  }

  if (severity === 'CRITICAL') bgColor = '#dc2626';

  const html = `
    <div style="
      background-color: ${bgColor};
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      box-shadow: 0 0 12px ${bgColor};
      border: 2px solid white;
      cursor: pointer;
    ">
      ${emoji}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'environmental-alert-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

interface Props {
  alert: EnvironmentalAlert;
  onAlertConverted?: () => void;
}

export const EnvironmentalAlertMarker: React.FC<Props> = ({ alert, onAlertConverted }) => {
  const icon = getAlertIcon(alert.alertType, alert.severity);

  const handleConvert = async () => {
    try {
      await convertAlertToIncident(alert);
      if (onAlertConverted) onAlertConverted();
    } catch (err) {
      console.error('Failed to convert alert:', err);
    }
  };

  return (
    <Marker position={[alert.latitude, alert.longitude]} icon={icon}>
      <Popup className="custom-leaflet-popup">
        <div className="p-3 bg-slate-900 text-white rounded-lg border border-slate-700 min-w-[220px]">
          <div className="flex items-center space-x-1.5 mb-1.5">
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
              {alert.severity}
            </span>
            <span className="text-xs font-semibold text-amber-300">{alert.alertType}</span>
          </div>

          <h4 className="text-xs font-bold text-white mb-1">{alert.title}</h4>
          <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">{alert.description}</p>

          <div className="text-[10px] text-slate-400 space-y-0.5 border-t border-slate-800 pt-2 mb-2">
            <div>Source: <strong className="text-slate-200">{alert.source}</strong></div>
            <div>Area: <strong className="text-slate-200">{alert.affectedArea}</strong></div>
            <div>Time: {new Date(alert.startsAt).toLocaleTimeString()}</div>
          </div>

          <button
            onClick={handleConvert}
            className="w-full py-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded text-[11px] flex items-center justify-center space-x-1 transition"
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Create ResQAI Incident</span>
          </button>
        </div>
      </Popup>
    </Marker>
  );
};
