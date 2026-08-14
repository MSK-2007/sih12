import React from 'react';
import { Incident } from '../../types/incident';
import { Resource } from '../../types/resource';
import { RouteResult } from '../../types/map';
import { Navigation, Clock, MapPin, Loader, X, Zap, ArrowRight } from 'lucide-react';

interface Props {
  selectedResource: Resource | null;
  selectedIncident: Incident | null;
  route: RouteResult | null;
  loading: boolean;
  error: string | null;
  onCalculateRoute: () => void;
  onClearRoute: () => void;
  onClearSelections: () => void;
}

export const RoutePanel: React.FC<Props> = ({
  selectedResource,
  selectedIncident,
  route,
  loading,
  error,
  onCalculateRoute,
  onClearRoute,
  onClearSelections,
}) => {
  if (!selectedResource && !selectedIncident && !route) return null;

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-2xl space-y-3 max-w-sm text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
          <Navigation className="w-4 h-4 text-emerald-400" />
          Spatial Routing Analysis
        </span>
        <button
          onClick={onClearSelections}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
          title="Clear Selection"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Selected Pair Overview */}
      <div className="space-y-2 text-xs">
        {/* Selected Resource */}
        <div className={`p-2.5 rounded-lg border transition ${selectedResource ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
          <span className="text-[10px] font-semibold uppercase text-slate-400 block">Selected Unit</span>
          {selectedResource ? (
            <div className="flex items-center justify-between mt-0.5">
              <span className="font-mono font-bold text-emerald-400">{selectedResource.resourceCode}</span>
              <span className="text-[11px] text-slate-300 truncate max-w-[150px]">{selectedResource.name}</span>
            </div>
          ) : (
            <span className="italic text-[11px]">Click a resource marker on the map...</span>
          )}
        </div>

        <div className="flex justify-center text-slate-500 my-0.5">
          <ArrowRight className="w-4 h-4 rotate-90" />
        </div>

        {/* Selected Incident */}
        <div className={`p-2.5 rounded-lg border transition ${selectedIncident ? 'bg-red-950/20 border-red-500/30' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
          <span className="text-[10px] font-semibold uppercase text-slate-400 block">Target Emergency</span>
          {selectedIncident ? (
            <div className="flex items-center justify-between mt-0.5">
              <span className="font-mono font-bold text-red-400">{selectedIncident.incidentNumber}</span>
              <span className="text-[11px] text-slate-300 truncate max-w-[150px]">{selectedIncident.title}</span>
            </div>
          ) : (
            <span className="italic text-[11px]">Click an incident marker on the map...</span>
          )}
        </div>
      </div>

      {/* Action Button */}
      {selectedResource && selectedIncident && !route && (
        <button
          onClick={onCalculateRoute}
          disabled={loading}
          className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
        >
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Calculate OSRM Route & ETA
        </button>
      )}

      {error && <p className="text-xs text-red-400 font-medium">{error}</p>}

      {/* Route Result Display */}
      {route && (
        <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Route Calculated</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {route.provider}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-900 p-2 rounded border border-slate-700/60">
              <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                <MapPin className="w-3 h-3 text-red-400" /> Distance
              </span>
              <span className="font-mono font-bold text-white text-base mt-0.5 block">{route.distanceKm} km</span>
            </div>

            <div className="bg-slate-900 p-2 rounded border border-slate-700/60">
              <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" /> Est. Response
              </span>
              <span className="font-mono font-bold text-cyan-400 text-base mt-0.5 block">{route.durationMinutes} min</span>
            </div>
          </div>

          <button
            onClick={onClearRoute}
            className="w-full py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-semibold text-xs transition"
          >
            Clear Route Layer
          </button>
        </div>
      )}
    </div>
  );
};
