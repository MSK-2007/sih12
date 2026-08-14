import React from 'react';
import { Link } from 'react-router-dom';
import { Incident } from '../../types/incident';
import { IncidentPriorityBadge } from './IncidentPriorityBadge';
import { IncidentStatusBadge } from './IncidentStatusBadge';
import { MapPin, Users, ArrowRight } from 'lucide-react';

interface Props {
  incidents: Incident[];
}

export const IncidentTable: React.FC<Props> = ({ incidents }) => {
  if (incidents.length === 0) {
    return (
      <div className="glass-panel p-12 text-center rounded-xl border border-slate-800">
        <p className="text-slate-400 text-sm">No incidents match the selected filter criteria.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4 font-semibold">Incident #</th>
              <th className="py-3.5 px-4 font-semibold">Emergency & Title</th>
              <th className="py-3.5 px-4 font-semibold">Location</th>
              <th className="py-3.5 px-4 font-semibold">Casualties</th>
              <th className="py-3.5 px-4 font-semibold">Priority</th>
              <th className="py-3.5 px-4 font-semibold">Status</th>
              <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {incidents.map((incident) => {
              const isCritical = incident.priorityLevel === 'CRITICAL';

              return (
                <tr
                  key={incident.id}
                  className={`hover:bg-slate-800/50 transition ${
                    isCritical ? 'bg-red-950/10' : ''
                  }`}
                >
                  {/* Incident Code */}
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-300 whitespace-nowrap">
                    {incident.incidentNumber}
                  </td>

                  {/* Title & Type */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {incident.emergencyType.replace('_', ' ')}
                      </span>
                    </div>
                    <Link
                      to={`/incidents/${incident.id}`}
                      className="font-bold text-slate-100 hover:text-red-400 transition line-clamp-1"
                    >
                      {incident.title}
                    </Link>
                  </td>

                  {/* Location */}
                  <td className="py-3.5 px-4 text-slate-300 max-w-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{incident.address}</span>
                    </div>
                  </td>

                  {/* Casualties & Injury */}
                  <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 font-semibold text-cyan-400">
                        <Users className="w-3.5 h-3.5" />
                        {incident.peopleAffected}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {incident.injuryLevel}
                      </span>
                    </div>
                  </td>

                  {/* Priority Badge */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <IncidentPriorityBadge level={incident.priorityLevel} score={incident.priorityScore} size="sm" />
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <IncidentStatusBadge status={incident.status} size="sm" />
                  </td>

                  {/* View Details Action */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <Link
                      to={`/incidents/${incident.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-red-400 hover:text-red-300 font-semibold transition text-xs"
                    >
                      View
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
