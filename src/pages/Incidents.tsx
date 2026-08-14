import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useIncidents } from '../hooks/useIncidents';
import { IncidentCard } from '../components/incidents/IncidentCard';
import { IncidentTable } from '../components/incidents/IncidentTable';
import { IncidentFilters } from '../components/incidents/IncidentFilters';
import { Plus, LayoutGrid, Table, Radio, AlertTriangle } from 'lucide-react';
import { KineticPageHeader } from '../components/kinetic/KineticPageHeader';

export const IncidentsPage: React.FC = () => {
  const { incidents, filters, loading, error, updateFilters, refetch } = useIncidents();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED');
  const criticalCount = activeIncidents.filter((i) => i.priorityLevel === 'CRITICAL').length;
  const highCount = activeIncidents.filter((i) => i.priorityLevel === 'HIGH').length;

  return (
    <div className="space-y-6 px-4 md:px-8 py-6 pb-12 animate-fade-in">
      {/* Kinetic Orange Brutalist Header */}
      <KineticPageHeader
        title="INCIDENT QUEUE"
        subtitle="REALTIME INCIDENT LIFE CYCLE MANAGEMENT & PRIORITY QUEUEING STREAM"
        marqueeText="EMERGENCY INCIDENT QUEUE"
        icon={<Radio className="w-6 h-6 animate-pulse" />}
        actions={
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="bg-black border-2 border-black p-1 rounded-full flex items-center gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-full text-xs font-space transition ${
                  viewMode === 'grid' ? 'bg-[#FF4D00] text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-full text-xs font-space transition ${
                  viewMode === 'table' ? 'bg-[#FF4D00] text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Tabular Desk View"
              >
                <Table className="w-4 h-4" />
              </button>
            </div>
            <Link
              to="/incidents/create"
              className="px-4 py-2 rounded-full bg-[#FF4D00] text-black font-space text-xs font-bold uppercase transition flex items-center gap-2 border-2 border-black hover:scale-105 shadow-lg"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              INTAKE EMERGENCY
            </Link>
          </div>
        }
      />

      {/* KPI Counters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-4 border border-white/20">
          <span className="font-space text-[10px] font-bold text-slate-400 uppercase tracking-tight">Total Active</span>
          <p className="font-archivo text-3xl font-extrabold text-white mt-1 leading-none">{activeIncidents.length}</p>
        </div>
        <div className="glass-panel p-4 border-2 border-red-500/50 bg-red-950/20">
          <span className="font-space text-[10px] font-bold text-red-400 uppercase tracking-tight flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            Critical Priority
          </span>
          <p className="font-archivo text-3xl font-extrabold text-red-400 mt-1 leading-none">{criticalCount}</p>
        </div>
        <div className="glass-panel p-4 border border-orange-500/40">
          <span className="font-space text-[10px] font-bold text-orange-400 uppercase tracking-tight">High Priority</span>
          <p className="font-archivo text-3xl font-extrabold text-orange-400 mt-1 leading-none">{highCount}</p>
        </div>
        <div className="glass-panel p-4 border border-white/20">
          <span className="font-space text-[10px] font-bold text-slate-400 uppercase tracking-tight">Awaiting Dispatch</span>
          <p className="font-archivo text-3xl font-extrabold text-amber-400 mt-1 leading-none">
            {activeIncidents.filter((i) => i.status === 'REPORTED' || i.status === 'ANALYSING' || i.status === 'PRIORITIZED' || i.status === 'AWAITING_DISPATCH').length}
          </p>
        </div>
      </div>

      {/* Search & Filter Component */}
      <IncidentFilters
        filters={filters}
        onChange={updateFilters}
        onReset={() =>
          updateFilters({
            searchQuery: '',
            emergencyType: 'ALL',
            priorityLevel: 'ALL',
            status: 'ALL',
            injuryLevel: 'ALL',
            sortBy: 'priority_score',
            sortOrder: 'desc',
          })
        }
      />

      {/* Main List Rendering */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-48 glass-panel animate-pulse p-4 border border-white/20" />
          ))}
        </div>
      ) : error ? (
        <div className="glass-panel p-8 text-center border border-red-500/50 text-red-400 font-space text-xs">
          {error}
          <button
            onClick={() => refetch()}
            className="block mx-auto mt-3 px-4 py-2 bg-[#FF4D00] text-black font-bold uppercase rounded-full text-xs"
          >
            RETRY
          </button>
        </div>
      ) : incidents.length === 0 ? (
        <div className="glass-panel p-12 text-center border border-white/20">
          <p className="font-archivo text-base text-white uppercase">NO INCIDENTS MATCH CRITERIA</p>
          <p className="font-space text-slate-400 text-xs mt-1">ADJUST YOUR SEARCH OR FILTER PARAMETERS.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {incidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      ) : (
        <IncidentTable incidents={incidents} />
      )}
    </div>
  );
};
