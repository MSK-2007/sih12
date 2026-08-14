import React from 'react';
import { AnalyticsFilter, DateRangePreset } from '../../types/analytics';
import { Calendar, RefreshCw } from 'lucide-react';

interface Props {
  filter: AnalyticsFilter;
  onSetDateRange: (preset: DateRangePreset, from?: string, to?: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

const PRESETS: { label: string; preset: DateRangePreset }[] = [
  { label: 'Today', preset: 'TODAY' },
  { label: 'Last 7 Days', preset: 'LAST_7_DAYS' },
  { label: 'Last 30 Days', preset: 'LAST_30_DAYS' },
  { label: 'Simulation Run', preset: 'SIMULATION_RUN' },
];

export const AnalyticsFilters: React.FC<Props> = ({ filter, onSetDateRange, onRefresh, loading }) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-slate-400">
        <Calendar className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Period:</span>
      </div>

      {PRESETS.map(({ label, preset }) => (
        <button
          key={preset}
          onClick={() => onSetDateRange(preset)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
            filter.preset === preset
              ? 'bg-blue-600 border-blue-500 text-white'
              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
          }`}
        >
          {label}
        </button>
      ))}

      <button
        onClick={onRefresh}
        disabled={loading}
        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </button>
    </div>
  );
};
