import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useResources } from '../hooks/useResources';
import { ResourceStats } from '../components/resources/ResourceStats';
import { ResourceFilters } from '../components/resources/ResourceFilters';
import { ResourceTable } from '../components/resources/ResourceTable';
import { ResourceCard } from '../components/resources/ResourceCard';
import { Plus, LayoutGrid, LayoutList, RefreshCw, AlertCircle, Truck } from 'lucide-react';
import { KineticPageHeader } from '../components/kinetic/KineticPageHeader';

export default function Resources() {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const { resources, filters, loading, error, refetch, updateFilters } = useResources();

  const handleResetFilters = () => {
    updateFilters({
      searchQuery: '',
      resourceType: 'ALL',
      status: 'ALL',
      departmentId: 'ALL',
      sortBy: 'status',
      sortOrder: 'asc',
    });
  };

  return (
    <div className="space-y-6 px-4 md:px-8 py-6 pb-12 animate-fade-in">
      {/* Kinetic Orange Brutalist Header */}
      <KineticPageHeader
        title="FLEET REGISTRY"
        subtitle="MONITOR READINESS STATUS AND MANAGE EMERGENCY RESPONSE UNITS IN REALTIME"
        marqueeText="FLEET RESOURCE REGISTRY"
        icon={<Truck className="w-6 h-6" />}
        actions={
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={refetch}
              className="p-2.5 rounded-full bg-black border-2 border-black text-white hover:bg-[#FF4D00] hover:text-black transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex items-center bg-black border-2 border-black rounded-full p-1 gap-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-full transition font-space text-xs ${viewMode === 'table' ? 'bg-[#FF4D00] text-black font-bold' : 'text-slate-500 hover:text-white'}`}
                title="Table View"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-full transition font-space text-xs ${viewMode === 'grid' ? 'bg-[#FF4D00] text-black font-bold' : 'text-slate-500 hover:text-white'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <Link
              to="/resources/create"
              className="flex items-center gap-2 px-4 py-2 bg-[#FF4D00] text-black rounded-full font-space font-bold text-xs uppercase hover:scale-105 transition border-2 border-black shadow-lg"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              REGISTER UNIT
            </Link>
          </div>
        }
      />

      {/* Stats KPIs */}
      <ResourceStats resources={resources} />

      {/* Filters */}
      <ResourceFilters
        filters={filters}
        onChange={updateFilters}
        onReset={handleResetFilters}
      />

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-950/40 border border-red-500/50 text-red-300 font-space text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>UNABLE TO ACCESS FLEET REGISTRY.</strong>
            <p className="text-xs text-red-300 mt-1">{error}</p>
            <button onClick={refetch} className="text-xs underline mt-1 text-red-300 hover:text-white font-bold">
              RETRY CONNECTION
            </button>
          </div>
        </div>
      )}

      {/* Results Header */}
      {!error && (
        <div className="flex items-center justify-between font-space text-xs text-slate-400">
          <span>
            SHOWING <strong className="text-white">{resources.length}</strong> FLEET UNIT{resources.length !== 1 ? 'S' : ''}
          </span>
          {(filters.searchQuery || (filters.resourceType && filters.resourceType !== 'ALL') || (filters.status && filters.status !== 'ALL')) && (
            <button onClick={handleResetFilters} className="text-[#FF4D00] hover:underline font-bold transition">
              CLEAR FILTERS
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {!error && (
        viewMode === 'table' ? (
          <ResourceTable resources={resources} loading={loading} />
        ) : (
          loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="glass-panel h-56 border border-white/20 animate-pulse" />
              ))}
            </div>
          ) : resources.length === 0 ? (
            <div className="glass-panel border border-white/20 p-16 text-center">
              <p className="font-archivo text-base text-white uppercase">NO FLEET UNITS MATCH FILTERS</p>
              <p className="font-space text-slate-400 text-xs mt-1">TRY ADJUSTING YOUR SEARCH OR STATUS SELECTION.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {resources.map((r) => <ResourceCard key={r.id} resource={r} />)}
            </div>
          )
        )
      )}
    </div>
  );
}
