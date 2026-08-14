import React from 'react';
import { ActiveResponseItem } from '../../services/controlCenter';
import { ResourceTypeBadge } from '../resources/ResourceTypeBadge';
import { ArrowRight, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  responses: ActiveResponseItem[];
  onOpenIncident: (id: string) => void;
}

export const ActiveResponsesList: React.FC<Props> = ({ responses, onOpenIncident }) => {
  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
            ACTIVE RESPONSES EN ROUTE ({responses.length})
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-500 uppercase">Live Dispatches</span>
      </div>

      {responses.length === 0 ? (
        <div className="p-4 text-center text-xs text-slate-500">
          No emergency units currently dispatched.
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {responses.map((resp) => (
            <div
              key={resp.assignmentId}
              className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <ResourceTypeBadge type={resp.resourceType} size="sm" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400">{resp.resourceCode}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <button
                      onClick={() => onOpenIncident(resp.incidentId)}
                      className="font-mono font-bold text-slate-100 hover:underline"
                    >
                      {resp.incidentNumber}
                    </button>
                  </div>
                  <p className="text-slate-400 text-[11px] line-clamp-1">{resp.incidentTitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 font-mono shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase block">ETA</span>
                  <span className="font-bold text-cyan-400 text-sm">{resp.etaMinutes} min</span>
                </div>
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] text-slate-500 uppercase block">Distance</span>
                  <span className="font-bold text-slate-300">{resp.distanceKm} km</span>
                </div>
                <Link
                  to={`/map?incidentId=${resp.incidentId}&resourceId=${resp.resourceId}`}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 transition"
                  title="View Route on GIS Map"
                >
                  <Navigation className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
