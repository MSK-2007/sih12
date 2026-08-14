import React from 'react';
import { Incident } from '../../types/incident';
import { IncidentPriorityBadge } from '../incidents/IncidentPriorityBadge';
import { IncidentStatusBadge } from '../incidents/IncidentStatusBadge';
import { ResourceRecommendations } from '../allocation/ResourceRecommendations';
import { X, MapPin, Users, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  incident: Incident | null;
  onClose: () => void;
  onRefresh?: () => void;
}

export const IncidentDrawer: React.FC<Props> = ({ incident, onClose, onRefresh }) => {
  if (!incident) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex justify-end bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0c121e] border-l border-slate-800 w-full max-w-xl h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <span className="font-mono font-extrabold text-white text-base">{incident.incidentNumber}</span>
            <IncidentPriorityBadge level={incident.priorityLevel} score={incident.priorityScore} />
            <IncidentStatusBadge status={incident.status} />
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Title & Description */}
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">{incident.title}</h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{incident.description}</p>
          </div>

          {/* Incident Specs Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1">
                <MapPin className="w-3 h-3 text-red-400" /> Location
              </span>
              <span className="font-medium text-slate-200 block truncate">{incident.address}</span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1">
                <Users className="w-3 h-3 text-amber-400" /> Casualties
              </span>
              <span className="font-mono font-bold text-amber-400 text-sm block">
                {incident.peopleAffected} affected ({incident.injuryLevel})
              </span>
            </div>
          </div>

          {/* AI Allocation Recommendations */}
          <ResourceRecommendations incident={incident} onStatusRefresh={onRefresh} />
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <Link
            to={`/map?incidentId=${incident.id}`}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            <MapPin className="w-3.5 h-3.5" /> View on GIS Map
          </Link>
          <Link
            to={`/incidents/${incident.id}`}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
          >
            Open Full Incident Page
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
