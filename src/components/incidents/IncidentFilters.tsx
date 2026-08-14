import React from 'react';
import { IncidentFilters as FiltersType, EmergencyType, PriorityLevel, IncidentStatus, InjuryLevel } from '../../types/incident';
import { Search, Filter, RotateCcw } from 'lucide-react';

interface Props {
  filters: FiltersType;
  onChange: (newFilters: Partial<FiltersType>) => void;
  onReset: () => void;
}

export const IncidentFilters: React.FC<Props> = ({ filters, onChange, onReset }) => {
  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-800/80 space-y-4">
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.searchQuery || ''}
            onChange={(e) => onChange({ searchQuery: e.target.value })}
            placeholder="Search incident #, title, location..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
          />
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1 text-xs text-slate-400 font-medium mr-1">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </div>

          {/* Emergency Type Dropdown */}
          <select
            value={filters.emergencyType || 'ALL'}
            onChange={(e) => onChange({ emergencyType: e.target.value as EmergencyType | 'ALL' })}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-red-500 transition cursor-pointer"
          >
            <option value="ALL">All Emergency Types</option>
            <option value="ROAD_ACCIDENT">Road Accident</option>
            <option value="FIRE">Fire</option>
            <option value="MEDICAL">Medical</option>
            <option value="FLOOD">Flood</option>
            <option value="BUILDING_COLLAPSE">Building Collapse</option>
            <option value="NATURAL_DISASTER">Natural Disaster</option>
            <option value="INDUSTRIAL_ACCIDENT">Industrial Accident</option>
            <option value="OTHER">Other</option>
          </select>

          {/* Priority Level Dropdown */}
          <select
            value={filters.priorityLevel || 'ALL'}
            onChange={(e) => onChange({ priorityLevel: e.target.value as PriorityLevel | 'ALL' })}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-red-500 transition cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical Priority</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={filters.status || 'ALL'}
            onChange={(e) => onChange({ status: e.target.value as IncidentStatus | 'ALL' })}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-red-500 transition cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="REPORTED">Reported</option>
            <option value="ANALYSING">Analysing</option>
            <option value="PRIORITIZED">Prioritized</option>
            <option value="AWAITING_DISPATCH">Awaiting Dispatch</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Injury Level Dropdown */}
          <select
            value={filters.injuryLevel || 'ALL'}
            onChange={(e) => onChange({ injuryLevel: e.target.value as InjuryLevel | 'ALL' })}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-red-500 transition cursor-pointer"
          >
            <option value="ALL">All Injury Levels</option>
            <option value="CRITICAL">Critical Injuries</option>
            <option value="SEVERE">Severe Injuries</option>
            <option value="MODERATE">Moderate Injuries</option>
            <option value="MINOR">Minor Injuries</option>
            <option value="NONE">No Injuries</option>
            <option value="UNKNOWN">Unknown</option>
          </select>

          {/* Sort By Dropdown */}
          <select
            value={filters.sortBy || 'priority_score'}
            onChange={(e) => onChange({ sortBy: e.target.value as any })}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-semibold text-amber-400 focus:outline-none focus:border-red-500 transition cursor-pointer"
          >
            <option value="priority_score">Sort: Highest Priority Score</option>
            <option value="reported_at">Sort: Reported Time</option>
            <option value="people_affected">Sort: People Affected</option>
            <option value="status">Sort: Status</option>
            <option value="emergency_type">Sort: Emergency Type</option>
          </select>

          {/* Reset Filters Button */}
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
