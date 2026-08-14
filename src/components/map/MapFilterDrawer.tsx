import React from 'react';
import { MapFilterState } from '../../types/map';
import { PriorityLevel } from '../../types/incident';
import { ResourceType, ResourceStatus } from '../../types/resource';
import { Filter, X, Eye, EyeOff } from 'lucide-react';

interface Props {
  filters: MapFilterState;
  onChange: (newFilters: MapFilterState) => void;
  onClose: () => void;
}

export const MapFilterDrawer: React.FC<Props> = ({ filters, onChange, onClose }) => {
  const toggleLayer = (layer: 'showIncidents' | 'showResources' | 'showHospitals') => {
    onChange({ ...filters, [layer]: !filters[layer] });
  };

  const togglePriority = (p: PriorityLevel) => {
    onChange({
      ...filters,
      incidentPriority: {
        ...filters.incidentPriority,
        [p]: !filters.incidentPriority[p],
      },
    });
  };

  const toggleResourceType = (t: ResourceType) => {
    onChange({
      ...filters,
      resourceType: {
        ...filters.resourceType,
        [t]: !filters.resourceType[t],
      },
    });
  };

  const toggleResourceStatus = (s: ResourceStatus) => {
    onChange({
      ...filters,
      resourceStatus: {
        ...filters.resourceStatus,
        [s]: !filters.resourceStatus[s],
      },
    });
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-2xl space-y-4 w-72 text-slate-100 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <span className="font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-cyan-400" />
          GIS Layer Visibility
        </span>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Layer Toggles */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between p-2 rounded bg-slate-800/60 border border-slate-700/60">
          <span className="font-semibold text-red-400">Incidents Layer</span>
          <button
            onClick={() => toggleLayer('showIncidents')}
            className={`p-1 rounded transition ${filters.showIncidents ? 'text-emerald-400' : 'text-slate-500'}`}
          >
            {filters.showIncidents ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between p-2 rounded bg-slate-800/60 border border-slate-700/60">
          <span className="font-semibold text-emerald-400">Fleet Units Layer</span>
          <button
            onClick={() => toggleLayer('showResources')}
            className={`p-1 rounded transition ${filters.showResources ? 'text-emerald-400' : 'text-slate-500'}`}
          >
            {filters.showResources ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between p-2 rounded bg-slate-800/60 border border-slate-700/60">
          <span className="font-semibold text-sky-400">Trauma Hospitals Layer</span>
          <button
            onClick={() => toggleLayer('showHospitals')}
            className={`p-1 rounded transition ${filters.showHospitals ? 'text-emerald-400' : 'text-slate-500'}`}
          >
            {filters.showHospitals ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Incident Priority Filter */}
      {filters.showIncidents && (
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Incident Priority</span>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as PriorityLevel[]).map((p) => (
              <label key={p} className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={filters.incidentPriority[p]}
                  onChange={() => togglePriority(p)}
                  className="rounded border-slate-700 text-red-500 focus:ring-0 bg-slate-900 cursor-pointer"
                />
                <span className="text-[11px]">{p}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Resource Types & Statuses Filter */}
      {filters.showResources && (
        <div className="pt-2 border-t border-slate-800 space-y-3">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Fleet Types</span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {(['AMBULANCE', 'FIRE_UNIT', 'POLICE_UNIT', 'RESCUE_TEAM'] as ResourceType[]).map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={filters.resourceType[t] !== false}
                    onChange={() => toggleResourceType(t)}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-900 cursor-pointer"
                  />
                  <span className="text-[10px]">{t.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Readiness Status</span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {(['AVAILABLE', 'ASSIGNED', 'BUSY', 'OFFLINE'] as ResourceStatus[]).map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={filters.resourceStatus[s] !== false}
                    onChange={() => toggleResourceStatus(s)}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-900 cursor-pointer"
                  />
                  <span className="text-[10px]">{s}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
