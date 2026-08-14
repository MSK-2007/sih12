import React from 'react';
import { SystemServiceStatus } from '../../services/controlCenter';
import { ShieldCheck, Database, Radio, MapPin, Navigation, Lock } from 'lucide-react';

interface Props {
  status: SystemServiceStatus | null;
}

export const SystemStatusCard: React.FC<Props> = ({ status }) => {
  if (!status) return null;

  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
            SYSTEM HEALTH & SERVICE STATUS
          </h2>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 font-bold">● OPERATIONAL</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
        {/* DB */}
        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-cyan-400" /> Database
          </span>
          <span className="text-emerald-400 font-bold">● ONLINE</span>
        </div>

        {/* Realtime */}
        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400" /> Realtime
          </span>
          <span className="text-emerald-400 font-bold">● ACTIVE</span>
        </div>

        {/* GIS */}
        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400" /> GIS Map
          </span>
          <span className="text-emerald-400 font-bold">● READY</span>
        </div>

        {/* Routing */}
        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-blue-400" /> OSRM Route
          </span>
          <span className="text-emerald-400 font-bold">● READY</span>
        </div>

        {/* Auth */}
        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between col-span-2 sm:col-span-1">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-purple-400" /> Operator
          </span>
          <span className="text-emerald-400 font-bold">● VERIFIED</span>
        </div>
      </div>
    </div>
  );
};
