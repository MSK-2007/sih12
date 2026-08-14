import React from 'react';
import { Link } from 'react-router-dom';
import { Incident } from '../../types/incident';
import { IncidentPriorityBadge } from './IncidentPriorityBadge';
import { IncidentStatusBadge } from './IncidentStatusBadge';
import { MapPin, Users, Clock, AlertTriangle, ArrowRight } from 'lucide-react';

interface Props {
  incident: Incident;
}

export const IncidentCard: React.FC<Props> = ({ incident }) => {
  const timeAgo = getTimeAgo(incident.reportedAt);
  const isCritical = incident.priorityLevel === 'CRITICAL';

  return (
    <div
      className={`glass-panel p-5 rounded-xl border transition-all duration-200 hover:border-slate-700 flex flex-col justify-between space-y-4 ${
        isCritical ? 'border-red-500/40 bg-red-950/10' : 'border-slate-800'
      }`}
    >
      <div>
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
              {incident.incidentNumber}
            </span>
            <span className="text-xs px-2 py-0.5 rounded font-semibold bg-slate-800 text-slate-300">
              {incident.emergencyType.replace('_', ' ')}
            </span>
          </div>
          <IncidentPriorityBadge level={incident.priorityLevel} score={incident.priorityScore} />
        </div>

        {/* Incident Title */}
        <h3 className="text-base font-bold text-white tracking-tight leading-snug hover:text-red-400 transition">
          <Link to={`/incidents/${incident.id}`}>{incident.title}</Link>
        </h3>

        {/* Description snippet */}
        <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
          {incident.description}
        </p>

        {/* Location & Details Grid */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 text-slate-400 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{incident.address}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 justify-end">
            <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span><strong className="text-slate-200">{incident.peopleAffected}</strong> affected</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Injury: <strong className="text-slate-200">{incident.injuryLevel}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 justify-end">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>

      {/* Footer Status & View Action */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <IncidentStatusBadge status={incident.status} size="sm" />
        <Link
          to={`/incidents/${incident.id}`}
          className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 group"
        >
          View Details
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
        </Link>
      </div>
    </div>
  );
};

function getTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  return `${Math.floor(diffHours / 24)} d ago`;
}
