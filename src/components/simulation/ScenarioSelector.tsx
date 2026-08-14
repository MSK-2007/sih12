import React from 'react';
import { SimulationScenario } from '../../types/simulation';
import { Layers } from 'lucide-react';

interface Props {
  scenarios: SimulationScenario[];
  selectedId: string;
  onSelectScenario: (id: string) => void;
  disabled?: boolean;
}

export const ScenarioSelector: React.FC<Props> = ({
  scenarios,
  selectedId,
  onSelectScenario,
  disabled = false,
}) => {
  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
            PREDEFINED DEMO SCENARIOS
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500 uppercase">Preset Environments</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {scenarios.map((sc) => {
          const isSelected = sc.id === selectedId;
          return (
            <button
              key={sc.id}
              onClick={() => onSelectScenario(sc.id)}
              disabled={disabled}
              className={`p-3 rounded-lg border text-left space-y-1.5 transition ${
                isSelected
                  ? 'bg-amber-950/30 border-amber-500/50 ring-1 ring-amber-500/30'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-bold text-xs ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                  {sc.name.split('—')[0]}
                </span>
                <span className="text-[10px] font-mono text-slate-500 font-bold">{sc.events.length} evts</span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-tight">{sc.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
