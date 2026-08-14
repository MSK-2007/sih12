import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const SimulationBanner: React.FC = () => {
  return (
    <div className="bg-amber-600 text-amber-950 px-4 py-2 font-mono text-xs font-black tracking-wider flex items-center justify-between border-b border-amber-500 shadow-md animate-pulse">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-950" />
        <span>⚠️ SIMULATION MODE ACTIVE — ALL INCIDENTS, RESOURCES AND DISPATCHES ARE SIMULATED</span>
      </div>
      <span className="hidden sm:inline bg-amber-950 text-amber-300 px-2 py-0.5 rounded text-[10px]">
        DEMO ENVIRONMENT
      </span>
    </div>
  );
};
