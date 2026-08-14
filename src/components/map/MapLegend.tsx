import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Truck, Flame, Shield, LifeBuoy, PlusCircle, AlertTriangle } from 'lucide-react';

export const MapLegend: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3.5 shadow-2xl text-xs space-y-2.5 max-w-xs text-slate-200">
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          GIS Map Legend
        </span>
        <button className="text-slate-400 hover:text-slate-200">
          {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-3 pt-1 border-t border-slate-800">
          {/* Incident Severity */}
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1.5">Incidents Severity</span>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block shrink-0" />
                <span className="text-[11px]">Critical Priority</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                <span className="text-[11px]">High Priority</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                <span className="text-[11px]">Medium Priority</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[11px]">Low Priority</span>
              </div>
            </div>
          </div>

          {/* Response Fleet */}
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1.5">Fleet Units</span>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px]">Ambulance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="text-[11px]">Fire Unit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-[11px]">Police Unit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <LifeBuoy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px]">Rescue Team</span>
              </div>
            </div>
          </div>

          {/* Hospitals */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
            <PlusCircle className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-[11px] font-medium">Trauma Hospitals</span>
          </div>
        </div>
      )}
    </div>
  );
};
