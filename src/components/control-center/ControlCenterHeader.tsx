import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Plus, Search, RefreshCw } from 'lucide-react';
import { NotificationBell } from '../notifications/NotificationBell';
import { PriorityLevel } from '../../types/incident';

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  priorityFilter: PriorityLevel | 'ALL';
  onPriorityFilterChange: (p: PriorityLevel | 'ALL') => void;
  onRefresh: () => void;
}

export const ControlCenterHeader: React.FC<Props> = ({
  searchQuery,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  onRefresh,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel p-5 rounded-none border-2 border-black space-y-4">
      {/* Top Title & Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/20 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#FF4D00] text-black flex items-center justify-center font-bold shadow-lg shrink-0">
            <Shield className="w-6 h-6 fill-black text-black" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-archivo text-xl md:text-2xl text-white tracking-[-0.04em] uppercase">
                RESQAI CONTROL CENTER
              </h1>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-space font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                OPERATIONAL
              </span>
            </div>
            <p className="font-space text-xs text-slate-400 mt-0.5">INTELLIGENT EMERGENCY RESPONSE COMMAND PLATFORM</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="font-space font-bold bg-black px-3.5 py-1.5 rounded-full border border-white/20 text-[#FF4D00]">
            {timeStr || '10:30:00'} IST
          </div>

          <NotificationBell />

          <button
            onClick={onRefresh}
            className="p-2 rounded-full bg-white/5 border border-white/20 text-slate-300 hover:text-white hover:border-[#FF4D00] transition"
            title="Refresh operational feeds"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            to="/incidents/create"
            className="flex items-center gap-1.5 bg-[#FF4D00] text-black font-space font-bold px-4 py-2 rounded-full hover:scale-105 transition-transform text-xs uppercase shadow-lg border border-black"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            INTAKE EMERGENCY
          </Link>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter incidents by title, code, location..."
            className="w-full bg-black border border-white/20 rounded-full pl-9 pr-4 py-1.5 text-xs text-white font-space placeholder:text-slate-600 focus:outline-none focus:border-[#FF4D00] transition"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="font-space text-[10px] uppercase font-bold text-slate-500 mr-1">PRIORITY:</span>
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => onPriorityFilterChange(lvl)}
              className={`px-3 py-1 rounded-full font-space text-[10px] font-bold uppercase transition ${
                priorityFilter === lvl
                  ? 'bg-[#FF4D00] text-black'
                  : 'bg-black text-slate-400 border border-white/20 hover:text-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
