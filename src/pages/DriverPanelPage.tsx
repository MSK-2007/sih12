import { useState, useEffect } from 'react';
import { useResources } from '../hooks/useResources';
import { useIncidents } from '../hooks/useIncidents';
import { Resource } from '../types/resource';
import { Incident } from '../types/incident';
import { ResourceAssignment } from '../types/assignment';
import { fetchAssignments } from '../services/assignments';
import { fetchHospitals } from '../services/hospitals';
import { Hospital } from '../types/hospital';

import { DriverUnitSelector } from '../components/driver/DriverUnitSelector';
import { DriverStatusControl } from '../components/driver/DriverStatusControl';
import { DriverDispatchPanel } from '../components/driver/DriverDispatchPanel';
import { DriverNavigationHUD } from '../components/driver/DriverNavigationHUD';
import { DriverFieldNotesPanel } from '../components/driver/DriverFieldNotesPanel';
import { DriverVehicleTelemetryPanel } from '../components/driver/DriverVehicleTelemetryPanel';
import { DriverFleetOverviewPanel } from '../components/driver/DriverFleetOverviewPanel';
import { KineticPageHeader } from '../components/kinetic/KineticPageHeader';

import { Radio, Navigation, Gauge, FileText, LayoutGrid, Volume2 } from 'lucide-react';

export default function DriverPanelPage() {
  const { resources, refetch: refetchResources } = useResources();
  const { incidents } = useIncidents();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [assignments, setAssignments] = useState<ResourceAssignment[]>([]);

  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mission' | 'controls' | 'logs' | 'fleet'>('mission');
  const [sirenActive, setSirenActive] = useState(false);

  // Initial setup: select first resource or saved resource
  useEffect(() => {
    fetchHospitals().then(setHospitals);
    loadAssignments();
  }, []);

  const loadAssignments = () => {
    fetchAssignments().then(setAssignments);
  };

  useEffect(() => {
    if (resources.length > 0 && !selectedResourceId) {
      setSelectedResourceId(resources[0].id);
    }
  }, [resources, selectedResourceId]);

  const selectedResource = resources.find((r) => r.id === selectedResourceId) || resources[0] || null;

  // Find assignment for current selected resource
  const currentAssignment = assignments.find(
    (a) => a.resourceId === selectedResource?.id && a.assignmentStatus !== 'COMPLETED' && a.assignmentStatus !== 'CANCELLED'
  ) || null;

  // Find active incident linked to this assignment or fallback to highest priority incident
  const activeIncident: Incident | null = currentAssignment
    ? incidents.find((i) => i.id === currentAssignment.incidentId) || null
    : selectedResource?.status === 'ASSIGNED' || selectedResource?.status === 'BUSY'
    ? incidents[0] || null
    : null;

  // Find nearest hospital
  const nearestHospital = hospitals.length > 0 ? hospitals[0] : null;

  const handleResourceSelect = (res: Resource) => {
    setSelectedResourceId(res.id);
  };

  const handleStatusUpdated = () => {
    refetchResources();
  };

  return (
    <div className={`space-y-6 px-4 md:px-8 py-6 pb-16 animate-fade-in relative ${sirenActive ? 'ring-8 ring-red-600 ring-inset' : ''}`}>
      {/* Emergency Siren Visual Flashing Top Bar */}
      {sirenActive && (
        <div className="bg-red-600 text-white font-space font-extrabold text-xs uppercase px-4 py-2 rounded-lg flex items-center justify-between shadow-2xl animate-pulse">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 animate-spin" />
            <span>EMERGENCY SIREN & STROBE ACTIVE (10-33 PRIORITY CLEARANCE)</span>
          </div>
          <button
            onClick={() => setSirenActive(false)}
            className="px-3 py-1 bg-black text-white rounded hover:bg-white hover:text-black transition text-[11px]"
          >
            MUTE SIREN
          </button>
        </div>
      )}

      {/* Kinetic Page Header */}
      <KineticPageHeader
        title="DRIVER RESPONDER CONSOLE"
        subtitle="TACTICAL MOBILE DISPATCH HUD, NAVIGATION GUIDANCE, & FIELD TELEMETRY"
        marqueeText="TACTICAL DRIVER DISPATCH HUD • REALTIME FIELD RESPONDER CONSOLE"
        icon={<Radio className="w-6 h-6 text-[#FF4D00]" />}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-space px-3 py-1.5 rounded-full bg-[#FF4D00]/20 text-[#FF4D00] border border-[#FF4D00]/50 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF4D00] animate-ping" />
              TELEMETRY ONLINE
            </span>
          </div>
        }
      />

      {/* Driver Unit Selector Carousel */}
      <DriverUnitSelector
        resources={resources}
        selectedResource={selectedResource}
        onSelectResource={handleResourceSelect}
      />

      {selectedResource && (
        <>
          {/* Main Tab Navigation Header */}
          <div className="flex items-center gap-2 bg-black/90 border-2 border-white/20 p-1.5 rounded-xl font-space text-xs overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setActiveTab('mission')}
              className={`px-4 py-2 rounded-lg font-bold uppercase transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'mission'
                  ? 'bg-[#FF4D00] text-black shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Navigation className="w-4 h-4" /> MISSION HUD & ROUTE
            </button>

            <button
              onClick={() => setActiveTab('controls')}
              className={`px-4 py-2 rounded-lg font-bold uppercase transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'controls'
                  ? 'bg-[#FF4D00] text-black shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Gauge className="w-4 h-4" /> STATUS & TELEMETRY
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 rounded-lg font-bold uppercase transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'logs'
                  ? 'bg-[#FF4D00] text-black shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <FileText className="w-4 h-4" /> FIELD LOGS & TRIAGE
            </button>

            <button
              onClick={() => setActiveTab('fleet')}
              className={`px-4 py-2 rounded-lg font-bold uppercase transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'fleet'
                  ? 'bg-[#FF4D00] text-black shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> ALL FLEET UNITS
            </button>
          </div>

          {/* TAB 1: MISSION HUD & ROUTE MAP */}
          {activeTab === 'mission' && (
            <div className="space-y-6">
              {/* Incident Dispatch Command Brief */}
              <DriverDispatchPanel
                resource={selectedResource}
                activeIncident={activeIncident}
                assignment={currentAssignment}
                onStatusUpdated={handleStatusUpdated}
                onAssignmentUpdated={loadAssignments}
              />

              {/* Navigation HUD Map */}
              <DriverNavigationHUD
                resource={selectedResource}
                incident={activeIncident}
                nearestHospital={nearestHospital}
              />
            </div>
          )}

          {/* TAB 2: STATUS & TELEMETRY */}
          {activeTab === 'controls' && (
            <div className="space-y-6">
              <DriverStatusControl
                resource={selectedResource}
                onStatusUpdated={handleStatusUpdated}
                sirenActive={sirenActive}
                onSirenToggle={setSirenActive}
              />

              <DriverVehicleTelemetryPanel resource={selectedResource} />
            </div>
          )}

          {/* TAB 3: FIELD LOGS & TRIAGE */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <DriverFieldNotesPanel
                resource={selectedResource}
                incident={activeIncident}
              />
            </div>
          )}

          {/* TAB 4: ALL FLEET UNITS */}
          {activeTab === 'fleet' && (
            <DriverFleetOverviewPanel
              resources={resources}
              selectedResource={selectedResource}
              onSelectResource={handleResourceSelect}
            />
          )}
        </>
      )}
    </div>
  );
}
