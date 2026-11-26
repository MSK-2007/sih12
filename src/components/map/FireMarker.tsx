import React, { useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { ExternalEvent } from '../../types/externalEvents';
import { Flame, Brain } from 'lucide-react';
import { ExternalEventAiModal } from '../external/ExternalEventAiModal';

const getFireIcon = (severity: string, frp: number) => {
  let bgColor = '#f97316'; // Orange

  if (severity === 'CRITICAL' || frp >= 50) {
    bgColor = '#ef4444'; // Red pulse
  } else if (severity === 'HIGH' || frp >= 20) {
    bgColor = '#ea580c'; // Deep Orange
  } else if (severity === 'MODERATE' || frp >= 5) {
    bgColor = '#f59e0b'; // Amber
  } else if (severity === 'LOW') {
    bgColor = '#eab308'; // Yellow
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
      🔥
    </div>
  `;

  return L.divIcon({
    html,
    className: 'nasa-firms-fire-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
};

interface Props {
  event: ExternalEvent;
  onEventConverted?: () => void;
}

export const FireMarker: React.FC<Props> = ({ event, onEventConverted }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const icon = getFireIcon(event.severity, event.magnitude);

  const raw = event.rawData || {};

  return (
    <>
      <Marker position={[event.latitude, event.longitude]} icon={icon}>
        <Popup className="custom-leaflet-popup">
          <div className="p-3 bg-slate-900 text-white rounded-lg border border-slate-700 min-w-[260px] font-inter">
            
            {/* Header Badge */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-1.5">
                <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                <span className="text-xs font-black text-orange-400">🔥 ACTIVE FIRE</span>
              </div>
              <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                {event.severity}
              </span>
            </div>

            {/* REAL-TIME EXTERNAL DATA Tag */}
            <div className="mb-2">
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded text-[9px] font-mono font-bold tracking-wider uppercase block w-fit">
                📡 REAL-TIME EXTERNAL DATA (NASA FIRMS)
              </span>
            </div>

            {/* FRP Reading */}
            <div className="text-xl font-black text-white mb-1">
              FRP: {event.magnitude ? event.magnitude.toFixed(1) : '0.0'} <span className="text-xs text-slate-400 font-normal">MW</span>
            </div>

            <h4 className="text-xs font-bold text-slate-200 mb-2 leading-snug">{event.title}</h4>

            {/* NASA FIRMS Metadata */}
            <div className="text-[11px] text-slate-400 space-y-1 border-t border-slate-800 pt-2 mb-3 font-mono">
              <div>Source: <strong className="text-slate-200">{event.source || 'NASA FIRMS'}</strong></div>
              <div>Event Type: <strong className="text-orange-300">Fire</strong></div>
              <div>Detection Time: <strong className="text-slate-200">{new Date(event.occurredAt).toLocaleString()}</strong></div>
              <div>Coordinates: <strong className="text-slate-200">{event.latitude.toFixed(4)}°, {event.longitude.toFixed(4)}°</strong></div>
              <div>Confidence: <strong className="text-slate-200">{raw.confidence || 'Nominal'}</strong></div>
              <div>Data Freshness: <strong className="text-emerald-400">{raw.detection_freshness || 'Recent (Last 24h)'}</strong></div>
              <div>Status: <strong className="text-cyan-400">{event.status}</strong></div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded text-xs flex items-center justify-center space-x-1.5 transition shadow-md"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>
                {event.status === 'CONVERTED_TO_INCIDENT' ? 'View ResQAI Incident' : 'Analyze with AI & Review'}
              </span>
            </button>
          </div>
        </Popup>
      </Marker>

      {/* Gemini AI Context Analysis & Incident Creation Modal */}
      <ExternalEventAiModal
        event={event}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onIncidentCreated={() => {
          setIsModalOpen(false);
          if (onEventConverted) onEventConverted();
        }}
      />
    </>
  );
};
