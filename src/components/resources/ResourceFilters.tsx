import React from 'react';
import { ResourceFilters as FiltersType, ResourceType, ResourceStatus } from '../../types/resource';
import { Search, Filter, RotateCcw } from 'lucide-react';

interface Props {
  filters: FiltersType;
  onChange: (newFilters: Partial<FiltersType>) => void;
  onReset: () => void;
}

export const ResourceFilters: React.FC<Props> = ({ filters, onChange, onReset }) => {
  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-4">
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.searchQuery || ''}
            onChange={(e) => onChange({ searchQuery: e.target.value })}
            placeholder="Search code (e.g. AMB-01), name, capability..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
          />
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1 text-xs text-slate-400 font-medium mr-1">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </div>

          {/* Resource Type Dropdown */}
          <select
            value={filters.resourceType || 'ALL'}
            onChange={(e) => onChange({ resourceType: e.target.value as ResourceType | 'ALL' })}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-red-500 transition cursor-pointer"
          >
            <option value="ALL">All Fleet Types</option>
            <option value="AMBULANCE">Ambulance</option>
            <option value="FIRE_UNIT">Fire Unit</option>
            <option value="POLICE_UNIT">Police Unit</option>
            <option value="RESCUE_TEAM">Rescue Team</option>
          </select>

          {/* Resource Status Dropdown */}
          <select
            value={filters.status || 'ALL'}
            onChange={(e) => onChange({ status: e.target.value as ResourceStatus | 'ALL' })}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-red-500 transition cursor-pointer"
          >
            <option value="ALL">All Readiness Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="BUSY">Busy</option>
            <option value="OFFLINE">Offline</option>
          </select>

          {/* Sort By Dropdown */}
          <select
            value={filters.sortBy || 'status'}
            onChange={(e) => onChange({ sortBy: e.target.value as any })}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-400 focus:outline-none focus:border-red-500 transition cursor-pointer"
          >
            <option value="status">Sort: Available First</option>
            <option value="resource_code">Sort: Resource Code</option>
            <option value="resource_type">Sort: Resource Type</option>
            <option value="updated_at">Sort: Last Updated</option>
          </select>

          {/* Reset Button */}
          <button
            onClick={onReset}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition text-xs flex items-center gap-1"
            title="Reset Filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
