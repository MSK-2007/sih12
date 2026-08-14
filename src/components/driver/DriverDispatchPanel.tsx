import React, { useState, useEffect } from 'react';
import { Incident } from '../../types/incident';
import { Resource } from '../../types/resource';
import { ResourceAssignment } from '../../types/assignment';
import { updateAssignmentStatus } from '../../services/assignments';
import { updateResourceStatus, updateResourceLocation } from '../../services/resources';
import {
  Navigation,
  MapPin,
  Clock,
  Radio,
  CheckCircle,
  Play,
  Pause,
  Zap,
  Users,
  ShieldAlert,
} from 'lucide-react';
import { calculateRoute } from '../../services/routingService';

interface Props {
  resource: Resource;
  activeIncident: Incident | null;
  assignment: ResourceAssignment | null;
  onStatusUpdated: (resource: Resource) => void;
  onAssignmentUpdated: () => void;
}

export const DriverDispatchPanel: React.FC<Props> = ({
  resource,
  activeIncident,
  assignment,
  onStatusUpdated,
  onAssignmentUpdated,
}) => {
  const [isSimulatingDrive, setIsSimulatingDrive] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(0);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [eta, setEta] = useState<number | null>(null);
  const [dist, setDist] = useState<number | null>(null);
  const [stepLoading, setStepLoading] = useState(false);

  // Fetch or calculate route when resource or incident changes
  useEffect(() => {
    if (activeIncident && resource) {
      calculateRoute(
        resource.latitude,
        resource.longitude,
        activeIncident.latitude,
        activeIncident.longitude
      ).then((res) => {
        setRouteCoordinates(res.coordinates);
        setEta(res.etaMinutes);
        setDist(res.distanceKm);
      });
    } else {
      setRouteCoordinates([]);
      setEta(null);
      setDist(null);
    }
  }, [activeIncident, resource.latitude, resource.longitude]);

  // Live GPS Simulation timer
  useEffect(() => {
    let timer: any = null;
    if (isSimulatingDrive && routeCoordinates.length > 0) {
      timer = setInterval(async () => {
        setSimulationIndex((prev) => {
          const next = prev + 1;
          if (next >= routeCoordinates.length) {
            setIsSimulatingDrive(false);
            return prev;
          }
          const [lat, lng] = routeCoordinates[next];
          updateResourceLocation(resource.id, lat, lng).then((updated) => {
            if (updated) onStatusUpdated(updated);
          });
          return next;
        });
      }, 1500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSimulatingDrive, routeCoordinates, resource.id]);

  const handleStepAction = async (nextStatus: 'ACCEPTED' | 'DISPATCHED' | 'IN_PROGRESS' | 'COMPLETED') => {
    if (stepLoading) return;
    setStepLoading(true);

    try {
      if (assignment) {
        await updateAssignmentStatus(assignment.id, nextStatus);
      }

      let resStatus: any = 'ASSIGNED';
      if (nextStatus === 'DISPATCHED') resStatus = 'ASSIGNED';
      if (nextStatus === 'IN_PROGRESS') resStatus = 'BUSY';
      if (nextStatus === 'COMPLETED') resStatus = 'AVAILABLE';

      const res = await updateResourceStatus(resource.id, resStatus);
      if (res.success && res.resource) {
        onStatusUpdated(res.resource);
      }
      onAssignmentUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setStepLoading(false);
    }
  };

  if (!activeIncident) {
    return (
      <div className="glass-panel border-2 border-white/20 p-8 rounded-xl text-center bg-black/80 space-y-4">
        <div className="w-12 h-12 rounded-full bg-white/10 text-slate-400 flex items-center justify-center mx-auto border border-white/20">
          <Radio className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-archivo text-base text-white uppercase">NO ACTIVE DISPATCH ASSIGNED</h3>
          <p className="font-space text-xs text-slate-400 max-w-md mx-auto mt-1">
            UNIT <strong className="text-[#FF4D00]">{resource.resourceCode}</strong> IS CURRENTLY ON STANDBY IN READY POOL. STAND BY FOR CONTROL ROOM DISPATCH ORDER.
          </p>
        </div>
      </div>
    );
  }

  const assignmentStatus = assignment?.assignmentStatus || 'RECOMMENDED';

  return (
    <div className="glass-panel border-2 border-white/20 p-5 rounded-xl space-y-5 bg-black/90">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-[#FF4D00]/20 border border-[#FF4D00] text-[#FF4D00] rounded-lg shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-space text-xs font-bold text-[#FF4D00]">
                {activeIncident.incidentNumber}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-space font-bold uppercase bg-red-950 text-red-300 border border-red-500/50">
                {activeIncident.priorityLevel} PRIORITY ({activeIncident.priorityScore.toFixed(0)})
              </span>
            </div>
            <h2 className="font-archivo text-lg text-white uppercase mt-0.5">
              {activeIncident.title}
            </h2>
          </div>
        </div>

        {/* Distance & ETA */}
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-3 rounded-lg font-space text-xs shrink-0">
          <div className="text-center">
            <div className="text-slate-400 text-[10px] uppercase">DISTANCE</div>
            <div className="font-bold text-cyan-400 text-sm">{dist !== null ? `${dist} km` : '--'}</div>
          </div>
          <div className="h-6 w-px bg-white/20" />
          <div className="text-center">
            <div className="text-slate-400 text-[10px] uppercase">EST. ETA</div>
            <div className="font-bold text-[#FF4D00] text-sm">{eta !== null ? `${eta} min` : '--'}</div>
          </div>
        </div>
      </div>

      {/* Incident Details Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-space text-xs">
        <div className="bg-white/5 p-3 rounded-lg border border-white/10">
          <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1 mb-1">
            <MapPin className="w-3 h-3 text-[#FF4D00]" /> LOCATION ADDRESS
          </div>
          <div className="text-white font-medium truncate">{activeIncident.address}</div>
        </div>

        <div className="bg-white/5 p-3 rounded-lg border border-white/10">
          <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1 mb-1">
            <Users className="w-3 h-3 text-amber-400" /> CASUALTIES / INJURY
          </div>
          <div className="text-white font-medium">
            {activeIncident.peopleAffected} Victims • Level: <strong className="text-amber-400">{activeIncident.injuryLevel}</strong>
          </div>
        </div>

        <div className="bg-white/5 p-3 rounded-lg border border-white/10">
          <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1 mb-1">
            <ShieldAlert className="w-3 h-3 text-blue-400" /> TYPE & STATUS
          </div>
          <div className="text-white font-medium">
            {activeIncident.emergencyType} • Dispatch: <strong className="text-cyan-400">{assignmentStatus}</strong>
          </div>
        </div>
      </div>

      {/* Dispatch Lifecycle Progress Bar */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-[11px] font-space text-slate-400 uppercase">
          <span>MISSION DISPATCH LIFECYCLE</span>
          <span className="text-[#FF4D00] font-bold">CURRENT: {assignmentStatus}</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 font-space text-[10px] font-bold uppercase text-center">
          <div className={`p-2 rounded border ${assignmentStatus === 'ACCEPTED' || assignmentStatus === 'DISPATCHED' || assignmentStatus === 'IN_PROGRESS' || assignmentStatus === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300 border-emerald-500' : 'bg-white/5 text-slate-500 border-white/10'}`}>
            1. ACCEPTED
          </div>
          <div className={`p-2 rounded border ${assignmentStatus === 'DISPATCHED' || assignmentStatus === 'IN_PROGRESS' || assignmentStatus === 'COMPLETED' ? 'bg-amber-950 text-amber-300 border-amber-500' : 'bg-white/5 text-slate-500 border-white/10'}`}>
            2. EN ROUTE
          </div>
          <div className={`p-2 rounded border ${assignmentStatus === 'IN_PROGRESS' || assignmentStatus === 'COMPLETED' ? 'bg-blue-950 text-blue-300 border-blue-500' : 'bg-white/5 text-slate-500 border-white/10'}`}>
            3. ON SCENE
          </div>
          <div className={`p-2 rounded border ${assignmentStatus === 'COMPLETED' ? 'bg-purple-950 text-purple-300 border-purple-500' : 'bg-white/5 text-slate-500 border-white/10'}`}>
            4. CLEARED
          </div>
        </div>
      </div>

      {/* Driver Action Step Control Bar & Telemetry Simulator */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-white/10">
        {/* Step progression buttons */}
        {assignmentStatus !== 'ACCEPTED' && assignmentStatus !== 'DISPATCHED' && assignmentStatus !== 'IN_PROGRESS' && assignmentStatus !== 'COMPLETED' && (
          <button
            onClick={() => handleStepAction('ACCEPTED')}
            disabled={stepLoading}
            className="flex-1 w-full py-3 px-4 bg-emerald-500 text-black hover:bg-emerald-400 font-space font-bold text-xs uppercase rounded-lg shadow-lg flex items-center justify-center gap-2 border-2 border-black"
          >
            <CheckCircle className="w-4 h-4" /> ACCEPT DISPATCH ORDER
          </button>
        )}

        {assignmentStatus === 'ACCEPTED' && (
          <button
            onClick={() => handleStepAction('DISPATCHED')}
            disabled={stepLoading}
            className="flex-1 w-full py-3 px-4 bg-[#FF4D00] text-black hover:bg-orange-500 font-space font-bold text-xs uppercase rounded-lg shadow-lg flex items-center justify-center gap-2 border-2 border-black"
          >
            <Navigation className="w-4 h-4" /> START TRANSIT (EN ROUTE)
          </button>
        )}

        {assignmentStatus === 'DISPATCHED' && (
          <button
            onClick={() => handleStepAction('IN_PROGRESS')}
            disabled={stepLoading}
            className="flex-1 w-full py-3 px-4 bg-blue-500 text-white hover:bg-blue-600 font-space font-bold text-xs uppercase rounded-lg shadow-lg flex items-center justify-center gap-2 border-2 border-black"
          >
            <Clock className="w-4 h-4" /> ARRIVED ON SCENE (IN PROGRESS)
          </button>
        )}

        {(assignmentStatus === 'IN_PROGRESS' || assignmentStatus === 'DISPATCHED') && (
          <button
            onClick={() => handleStepAction('COMPLETED')}
            disabled={stepLoading}
            className="flex-1 w-full py-3 px-4 bg-purple-600 text-white hover:bg-purple-500 font-space font-bold text-xs uppercase rounded-lg shadow-lg flex items-center justify-center gap-2 border-2 border-black"
          >
            <CheckCircle className="w-4 h-4" /> MISSION COMPLETED & CLEAR UNIT
          </button>
        )}

        {/* GPS Simulation Toggle */}
        <button
          onClick={() => {
            if (isSimulatingDrive) {
              setIsSimulatingDrive(false);
            } else {
              setSimulationIndex(0);
              setIsSimulatingDrive(true);
            }
          }}
          className={`py-3 px-4 rounded-lg font-space font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-2 transition shrink-0 ${
            isSimulatingDrive
              ? 'bg-cyan-500 text-black border-cyan-400 animate-pulse'
              : 'bg-white/10 text-cyan-400 border-cyan-500/40 hover:bg-cyan-950/50'
          }`}
        >
          {isSimulatingDrive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isSimulatingDrive ? `TELEMETRY SIM: EN ROUTE (${simulationIndex}/${routeCoordinates.length})` : 'SIMULATE DRIVE GPS'}
        </button>
      </div>
    </div>
  );
};
