import React, { useState } from 'react';
import { useControlCenter } from '../hooks/useControlCenter';
import { ControlCenterHeader } from '../components/control-center/ControlCenterHeader';
import { KpiGrid } from '../components/control-center/KpiGrid';
import { OperatorAttention } from '../components/control-center/OperatorAttention';
import { CriticalIncidentsList } from '../components/control-center/CriticalIncidentsList';
import { ResourceStatusPanel } from '../components/control-center/ResourceStatusPanel';
import { ActiveResponsesList } from '../components/control-center/ActiveResponsesList';
import { SystemStatusCard } from '../components/control-center/SystemStatusCard';
import { RecentActivityTimeline } from '../components/control-center/RecentActivityTimeline';
import { IncidentDrawer } from '../components/control-center/IncidentDrawer';
import { EmergencyMap } from '../components/map/EmergencyMap';
import { Incident } from '../types/incident';
import { Resource } from '../types/resource';
import { MapPin, AlertCircle, RefreshCw, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { KineticPageHeader } from '../components/kinetic/KineticPageHeader';

export const ControlCenterPage: React.FC = () => {
  const {
    metrics,
    incidents,
    allActiveIncidents,
    criticalIncidents,
    resources,
    typeSummaries,
    activeResponses,
    attentionItems,
    systemStatus,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    priorityFilter,
    setPriorityFilter,
    refresh,
  } = useControlCenter();

  const navigate = useNavigate();
  const [selectedDrawerIncident, setSelectedDrawerIncident] = useState<Incident | null>(null);

  const handleOpenIncident = (incidentId: string) => {
    const inc = allActiveIncidents.find((i) => i.id === incidentId);
    if (inc) {
      setSelectedDrawerIncident(inc);
    } else {
      navigate(`/incidents/${incidentId}`);
    }
  };

  const handleOpenReallocation = () => {
    navigate('/reallocation');
  };

  const handleSelectMapIncident = (inc: Incident) => {
    setSelectedDrawerIncident(inc);
  };

  const handleSelectMapResource = (res: Resource) => {
    navigate(`/resources/${res.id}`);
  };

  if (error) {
    return (
      <div className="p-12 max-w-xl mx-auto text-center space-y-4 font-space">
        <AlertCircle className="w-12 h-12 text-[#FF4D00] mx-auto" />
        <h2 className="font-archivo text-xl uppercase text-white">UNABLE TO ACCESS OPERATIONAL STREAM</h2>
        <p className="text-xs text-slate-400 font-inter">{error}</p>
        <button
          onClick={refresh}
          className="px-6 py-2.5 bg-[#FF4D00] hover:bg-white text-black font-bold uppercase rounded-full text-xs transition flex items-center gap-2 mx-auto border border-black shadow-lg"
        >
          <RefreshCw className="w-4 h-4" /> RETRY CONNECTION
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 md:px-8 py-6 pb-12 animate-fade-in">
      {/* Kinetic Orange Brutalist Header */}
      <KineticPageHeader
        title="CONTROL CENTER"
        subtitle="REAL-TIME COMMAND HUB — INCIDENTS, DISPATCH, GIS & FLEET STATUS"
        marqueeText="LIVE OPERATIONAL COMMAND"
        icon={<LayoutDashboard className="w-6 h-6" />}
        actions={
          <button
            onClick={refresh}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-black border-2 border-black text-white font-space text-[11px] font-bold uppercase hover:bg-[#FF4D00] hover:text-black transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            REFRESH
          </button>
        }
      />
      {/* Control Center Header */}
      <ControlCenterHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        onRefresh={refresh}
      />

      {/* KPI Grid */}
      <KpiGrid metrics={metrics} loading={loading} />

      {/* Operator Attention Required Alert Box */}
      <OperatorAttention
        attentionItems={attentionItems}
        onOpenIncident={handleOpenIncident}
        onOpenReallocation={handleOpenReallocation}
      />

      {/* Main Command Center Grid: Map & Critical Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* GIS Map (2 cols) */}
        <div className="lg:col-span-2 glass-panel p-5 border-2 border-black flex flex-col h-[560px]">
          <div className="flex items-center justify-between border-b border-white/20 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#FF4D00]" />
              <h2 className="font-archivo text-sm uppercase tracking-tight text-white">
                LIVE GIS RESPONSE TACTICAL MAP
              </h2>
            </div>
            <span className="font-space text-[10px] text-emerald-400 font-bold uppercase bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              ● OPENSTREETMAP / OSRM LIVE
            </span>
          </div>

          <div className="flex-1 rounded-none overflow-hidden border border-white/20 relative">
            <EmergencyMap
              incidents={incidents}
              resources={resources}
              onSelectIncident={handleSelectMapIncident}
              onSelectResource={handleSelectMapResource}
            />
          </div>
        </div>

        {/* Critical Incidents List (1 col) */}
        <div className="lg:col-span-1 space-y-5">
          <CriticalIncidentsList
            incidents={criticalIncidents}
            onOpenIncident={handleOpenIncident}
          />
          <RecentActivityTimeline />
        </div>
      </div>

      {/* Resource Fleet Readiness Summary */}
      <ResourceStatusPanel summaries={typeSummaries} />

      {/* Active Responses & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <ActiveResponsesList
            responses={activeResponses}
            onOpenIncident={handleOpenIncident}
          />
        </div>
        <div className="lg:col-span-1">
          <SystemStatusCard status={systemStatus} />
        </div>
      </div>

      {/* Incident Details Drawer */}
      <IncidentDrawer
        incident={selectedDrawerIncident}
        onClose={() => setSelectedDrawerIncident(null)}
        onRefresh={refresh}
      />
    </div>
  );
};

export default ControlCenterPage;
