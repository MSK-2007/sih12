import React, { useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { EnvironmentalAlert } from '../../types/externalData';
import { ShieldAlert, Cloud } from 'lucide-react';
import { convertAlertToIncident } from '../../services/environmentalAlertsService';

const getAlertIcon = (alertType: string, severity: string) => {
  let emoji = '🌧';
  let bgColor = '#3b82f6'; // Blue

  switch (alertType) {
    case 'FLOOD':
      emoji = '🌊';
      bgColor = '#06b6d4'; // Cyan
      break;
    case 'FIRE_HAZARD':
      emoji = '🔥';
      bgColor = '#f97316'; // Orange
      break;
    case 'HEAVY_RAIN':
      emoji = '🌧';
      bgColor = '#3b82f6'; // Blue
      break;
    case 'THUNDERSTORM':
      emoji = '⚡';
      bgColor = '#a855f7'; // Purple
      break;
    case 'CYCLONE':
      emoji = '🌀';
      bgColor = '#ec4899'; // Pink
      break;
    case 'HEATWAVE':
      emoji = '🌡️';
      bgColor = '#f59e0b'; // Amber
      break;
    case 'SEVERE_WEATHER':
      emoji = '🌪';
      bgColor = '#64748b'; // Slate
      break;
    default:
      emoji = '⛅';
      bgColor = '#3b82f6';
  }

  // Severity overrides colour intensity
  if (severity === 'CRITICAL') bgColor = '#dc2626';
  else if (severity === 'HIGH') bgColor = '#ea580c';

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
      box-shadow: 0 0 13px ${bgColor};
      border: 2px solid white;
      cursor: pointer;
    ">
      ${emoji}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'imd-environmental-alert-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'CRITICAL': return 'bg-red-500/20 text-red-400 border-red-500/40';
    case 'HIGH':     return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
    case 'MODERATE': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
    default:         return 'bg-lime-500/20 text-lime-400 border-lime-500/40';
  }
};

const getAlertEmoji = (alertType: string) => {
  const map: Record<string, string> = {
    HEAVY_RAIN: '🌧',
    FLOOD: '🌊',
    THUNDERSTORM: '⚡',
    CYCLONE: '🌀',
    HEATWAVE: '🌡️',
    FIRE_HAZARD: '🔥',
    SEVERE_WEATHER: '🌪',
  };
  return map[alertType] || '⛅';
};

interface Props {
  alert: EnvironmentalAlert;
  onAlertConverted?: () => void;
}

export const EnvironmentalAlertMarker: React.FC<Props> = ({ alert, onAlertConverted }) => {
  const [converting, setConverting] = useState(false);
  const icon = getAlertIcon(alert.alertType, alert.severity);

  const handleConvert = async () => {
    setConverting(true);
    try {
      await convertAlertToIncident(alert);
      if (onAlertConverted) onAlertConverted();
    } catch (err) {
      console.error('[EnvironmentalAlertMarker] Conversion error:', err);
    } finally {
      setConverting(false);
    }
  };

  return (
    <Marker position={[alert.latitude, alert.longitude]} icon={icon}>
      <Popup className="custom-leaflet-popup">
        <div className="p-3 bg-slate-900 text-white rounded-lg border border-slate-700 min-w-[270px] font-inter">

          {/* Source Header */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-1.5">
              <Cloud className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-black text-blue-300">
                {getAlertEmoji(alert.alertType)} IMD WEATHER WARNING
              </span>
            </div>
            <span className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded border ${getSeverityColor(alert.severity)}`}>
              {alert.severity}
            </span>
          </div>

          {/* Real External Data Badge */}
          <div className="mb-2">
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded text-[9px] font-mono font-bold tracking-wider uppercase block w-fit">
              📡 REAL EXTERNAL DATA (IMD)
            </span>
          </div>

          {/* Alert Type */}
          <div className="text-sm font-black text-white mb-1">
            {alertType(alert.alertType)}
          </div>

          <h4 className="text-xs font-bold text-slate-200 mb-1.5 leading-snug">{alert.title}</h4>
          <p className="text-[11px] text-slate-400 mb-2 leading-relaxed line-clamp-3">{alert.description}</p>

          {/* IMD Metadata */}
          <div className="text-[10px] text-slate-400 space-y-0.5 border-t border-slate-800 pt-2 mb-3 font-mono">
            <div>Source: <strong className="text-slate-200">{alert.source || 'IMD'}</strong></div>
            <div>Alert Type: <strong className="text-blue-300">{alert.alertType.replace(/_/g, ' ')}</strong></div>
            <div>Affected Area: <strong className="text-slate-200">{alert.affectedArea}</strong></div>
            {alert.region && <div>Region: <strong className="text-slate-200">{alert.region}</strong></div>}
            <div>Issued At: <strong className="text-slate-200">{alert.issuedAt ? new Date(alert.issuedAt).toLocaleString() : 'N/A'}</strong></div>
            <div>Expires At: <strong className="text-amber-300">{alert.expiresAt ? new Date(alert.expiresAt).toLocaleString() : 'Ongoing'}</strong></div>
            <div>Status: <strong className="text-cyan-400">{alert.status || 'ACTIVE'}</strong></div>
            {alert.sourceUrl && (
              <div>Reference: <a href={alert.sourceUrl} target="_blank" rel="noreferrer" className="text-indigo-400 underline truncate">mausam.imd.gov.in</a></div>
            )}
          </div>

          <button
            onClick={handleConvert}
            disabled={converting}
            className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold rounded text-xs flex items-center justify-center space-x-1.5 transition shadow-md"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{converting ? 'Creating Incident...' : 'Create ResQAI Incident'}</span>
          </button>
        </div>
      </Popup>
    </Marker>
  );
};

function alertType(t: string): string {
  const labels: Record<string, string> = {
    HEAVY_RAIN: '🌧 Heavy Rainfall Alert',
    FLOOD: '🌊 Flood / Inundation Warning',
    THUNDERSTORM: '⚡ Severe Thunderstorm Warning',
    CYCLONE: '🌀 Cyclone Alert',
    HEATWAVE: '🌡️ Heatwave Alert',
    FIRE_HAZARD: '🔥 Fire Hazard Warning',
    SEVERE_WEATHER: '🌪 Severe Weather Warning',
  };
  return labels[t] || '⛅ Weather Alert';
}
