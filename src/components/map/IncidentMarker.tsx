import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { Incident } from '../../types/incident';
import { createIncidentDivIcon } from './MapMarkerUtils';
import { Users, AlertTriangle, ArrowRight } from 'lucide-react';

interface Props {
  incident: Incident;
  isSelected?: boolean;
  onSelect?: (incident: Incident) => void;
}

export const IncidentMarker: React.FC<Props> = ({ incident, isSelected = false, onSelect }) => {
  const icon = createIncidentDivIcon(incident.priorityLevel, isSelected);

  return (
    <Marker
      position={[incident.latitude, incident.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => {
          if (onSelect) onSelect(incident);
        },
      }}
    >
      <Popup className="resqai-leaflet-popup">
        <div className="p-1 space-y-2 max-w-xs text-slate-900">
          <div className="flex items-center justify-between gap-2 border-b pb-1.5 border-slate-200">
            <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
              {incident.incidentNumber}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold text-white ${
                incident.priorityLevel === 'CRITICAL'
                  ? 'bg-red-600'
                  : incident.priorityLevel === 'HIGH'
                  ? 'bg-orange-500'
                  : 'bg-amber-500'
              }`}
            >
              {incident.priorityLevel}
            </span>
          </div>

          <div>
            <h4 className="font-bold text-sm text-slate-900 leading-tight">{incident.title}</h4>
            <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{incident.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-700 font-medium">
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>{incident.peopleAffected} Affected</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{incident.injuryLevel}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500">{incident.status}</span>
            <Link
              to={`/incidents/${incident.id}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700"
            >
              View Incident
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};
