import React, { useState, useEffect } from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { useIncidents } from '../hooks/useIncidents';
import { useResources } from '../hooks/useResources';
import { SimulationBanner } from '../components/simulation/SimulationBanner';
import { SimulationClockCard } from '../components/simulation/SimulationClockCard';
import { SimulationControls } from '../components/simulation/SimulationControls';
import { ScenarioSelector } from '../components/simulation/ScenarioSelector';
import { EventTimeline } from '../components/simulation/EventTimeline';
import { SimulationMetricsPanel } from '../components/simulation/SimulationMetricsPanel';
import { ManualEventPanel } from '../components/simulation/ManualEventPanel';
import { DemoModePanel } from '../components/simulation/DemoModePanel';
import { EmergencyMap } from '../components/map/EmergencyMap';
import { Shield, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { KineticPageHeader } from '../components/kinetic/KineticPageHeader';
import { fetchAssignments } from '../services/assignments';
import { ResourceAssignment } from '../types/assignment';

export const SimulationDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    scenarios,
    status,
    currentTime,
    metrics,
    events,
    speed,
    initialize,
    start,
    pause,
    resume,
    step,
    stop,
    reset,
    setSpeed,
    triggerManual,
    runState,
  } = useSimulation();

  const { incidents, refetch: refetchIncidents } = useIncidents();
  const { resources } = useResources();

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('urban-surge');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<ResourceAssignment[]>([]);

  // Re-fetch incidents whenever simulation injects a new one.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (runState?.incidentIds && runState.incidentIds.length > 0) {
      refetchIncidents();
    }
  }, [runState?.incidentIds?.length]);

  // Reset selected incident when active run changes or clears
  useEffect(() => {
    if (!runState || !runState.incidentIds || runState.incidentIds.length === 0) {
      setSelectedIncidentId(null);
    }
  }, [runState?.id, runState?.incidentIds?.length]);

  // Load assignments reactively to map resources to the selected incident
  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const data = await fetchAssignments();
        setAssignments(data);
      } catch (err) {
        console.error('Error fetching assignments on simulation page:', err);
      }
    };
    loadAssignments();
  }, [runState?.incidentIds?.length, incidents]);

  const handleSelectScenario = async (id: string) => {
    setSelectedScenarioId(id);
    setSelectedIncidentId(null);
    await initialize(id, 'AUTOMATIC');
  };

  const handleStartDemo = async () => {
    setSelectedScenarioId('urban-surge');
    setSelectedIncidentId(null);
    await initialize('urban-surge', 'AUTOMATIC');
    await start();
  };

  const isRunning = status === 'RUNNING';

  // Filter incidents for display
  const simIncidents = incidents.filter((i) => runState?.incidentIds?.includes(i.id));
  const displayedIncidents = selectedIncidentId
    ? simIncidents.filter((i) => i.id === selectedIncidentId)
    : simIncidents;

  // Filter resources to only show those assigned to the selected incident, or all resources if none selected
  const displayedResources = selectedIncidentId
    ? resources.filter((r) => {
        const asgn = assignments.find(
          (a) => a.resourceId === r.id && 
                 a.incidentId === selectedIncidentId && 
                 (a.assignmentStatus === 'DISPATCHED' || a.assignmentStatus === 'IN_PROGRESS')
        );
        return !!asgn;
      })
    : resources;

  const selectedInc = incidents.find((i) => i.id === selectedIncidentId);
  const mapCenter: [number, number] | undefined = selectedInc
    ? [selectedInc.latitude, selectedInc.longitude]
    : undefined;
  const mapZoom = selectedInc ? 15 : undefined;

  return (
    <div className="space-y-5 px-4 md:px-8 py-6 pb-12 animate-fade-in">
      {/* Simulation Warning Banner */}
      <SimulationBanner />

      {/* Kinetic Orange Brutalist Header */}
      <KineticPageHeader
        title="SIMULATION ENGINE"
        subtitle="CONTROLLED SCENARIO RUNNER — INTAKE → PRIORITY → ALLOCATION → REALLOCATION → ALERTS"
        marqueeText="EMERGENCY SIMULATION"
        icon={<Shield className="w-6 h-6" />}
      />

      {/* Guided Hackathon Demo Panel */}
      <DemoModePanel onStartDemo={handleStartDemo} isRunning={isRunning} />

      {/* Clock & Speed Bar */}
      <SimulationClockCard
        currentTime={currentTime}
        status={status}
        speed={speed}
        onSpeedChange={setSpeed}
      />

      {/* Scenario Execution Controls */}
      <SimulationControls
        status={status}
        onStart={start}
        onPause={pause}
        onResume={resume}
        onStep={step}
        onReset={reset}
        onStop={stop}
      />

      {/* Predefined Scenarios Selector */}
      <ScenarioSelector
        scenarios={scenarios}
        selectedId={selectedScenarioId}
        onSelectScenario={handleSelectScenario}
        disabled={isRunning}
      />

      {/* Live Calculated Metrics */}
      <SimulationMetricsPanel metrics={metrics} />

      {/* Grid: Live Tactical Map & Event Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tactical Map (2 cols) */}
        <div className="lg:col-span-2 glass-panel p-5 border-2 border-black flex flex-col h-[520px]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/20 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#FF4D00]" />
              <h2 className="font-archivo text-sm uppercase tracking-tight text-white">
                SIMULATED GIS RESPONSE MAP
              </h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {selectedIncidentId && (
                <button
                  onClick={() => setSelectedIncidentId(null)}
                  className="bg-[#FF4D00] hover:bg-[#E54500] text-black font-space text-[10px] font-black px-2.5 py-1 border-2 border-black uppercase transition-colors"
                >
                  Clear Selection [Show All]
                </button>
              )}

              <div className="flex items-center gap-2">
                <span className="font-space text-[10px] font-bold text-slate-400 uppercase">
                  Focus Incident:
                </span>
                <select
                  value={selectedIncidentId || 'ALL'}
                  onChange={(e) => setSelectedIncidentId(e.target.value === 'ALL' ? null : e.target.value)}
                  className="bg-black text-[#FF4D00] font-space text-[11px] font-bold border-2 border-black px-2 py-1 uppercase shadow-[2px_2px_0px_0px_rgba(255,77,0,0.4)] focus:outline-none cursor-pointer hover:bg-slate-900 transition-colors"
                >
                  <option value="ALL">SHOW ALL SCENARIO INCIDENTS ({simIncidents.length})</option>
                  {simIncidents.map((inc) => (
                    <option key={inc.id} value={inc.id}>
                      {inc.incidentNumber} - {inc.title.substring(0, 24)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1 rounded-none overflow-hidden border border-white/20 relative">
            <EmergencyMap
              incidents={displayedIncidents}
              resources={displayedResources}
              selectedIncident={selectedInc}
              center={mapCenter}
              zoom={mapZoom}
              onSelectIncident={(i) => setSelectedIncidentId(i.id)}
              onSelectResource={(r) => navigate(`/resources/${r.id}`)}
            />
          </div>
        </div>

        {/* Scheduled Event Queue Timeline (1 col) */}
        <div className="lg:col-span-1">
          <EventTimeline
            events={events}
            activeIncidentTitles={simIncidents.map((i) => i.title)}
            selectedIncidentTitle={selectedInc?.title || null}
            onSelectIncidentByTitle={(title) => {
              const matched = simIncidents.find((i) => i.title === title);
              if (matched) {
                setSelectedIncidentId(matched.id);
              }
            }}
          />
        </div>
      </div>

      {/* Manual Event Injection Panel */}
      <ManualEventPanel onTrigger={triggerManual} />
    </div>
  );
};

export default SimulationDashboardPage;

