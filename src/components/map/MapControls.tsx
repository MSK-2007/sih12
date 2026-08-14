import React from 'react';
import { Locate, RotateCcw, Filter } from 'lucide-react';

interface Props {
  onResetView: () => void;
  onToggleFilters: () => void;
  onClearRoute: () => void;
  hasRoute: boolean;
}

export const MapControls: React.FC<Props> = ({
  onResetView,
  onToggleFilters,
  onClearRoute,
  hasRoute,
}) => {
  return (
    <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-2 shadow-2xl">
      <button
        onClick={onToggleFilters}
        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1.5 text-xs font-semibold"
        title="Toggle Map Filters"
      >
        <Filter className="w-4 h-4 text-cyan-400" />
        <span className="hidden sm:inline">Filters</span>
      </button>

      <button
        onClick={onResetView}
        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1.5 text-xs font-semibold"
        title="Reset Map Center"
      >
        <Locate className="w-4 h-4 text-emerald-400" />
        <span className="hidden sm:inline">Reset View</span>
      </button>

      {hasRoute && (
        <button
          onClick={onClearRoute}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-red-400 transition flex items-center gap-1.5 text-xs font-semibold"
          title="Clear Active Route"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Clear Route</span>
        </button>
      )}
    </div>
  );
};
