import React, { useState } from 'react';
import { Resource, ResourceStatus } from '../../types/resource';
import { updateResourceStatus } from '../../services/resources';
import { Volume2, VolumeX, AlertTriangle, ShieldAlert, CheckCircle2, Clock, Ban } from 'lucide-react';
import { ResourceStatusBadge } from '../resources/ResourceStatusBadge';

interface Props {
  resource: Resource;
  onStatusUpdated: (updated: Resource) => void;
  onSirenToggle?: (sirenActive: boolean) => void;
  sirenActive?: boolean;
}

export const DriverStatusControl: React.FC<Props> = ({
  resource,
  onStatusUpdated,
  onSirenToggle = () => {},
  sirenActive = false,
}) => {
  const [updating, setUpdating] = useState(false);
  const [sosAlertSent, setSosAlertSent] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const STATUS_OPTIONS: { status: ResourceStatus; label: string; bg: string; border: string; icon: any }[] = [
    { status: 'AVAILABLE', label: '10-8 AVAILABLE / READY', bg: 'bg-emerald-950/80 text-emerald-300', border: 'border-emerald-500/50 hover:bg-emerald-900', icon: CheckCircle2 },
    { status: 'ASSIGNED', label: '10-9 ASSIGNED / ACKNOWLEDGED', bg: 'bg-amber-950/80 text-amber-300', border: 'border-amber-500/50 hover:bg-amber-900', icon: Clock },
    { status: 'BUSY', label: '10-7 ON SCENE / BUSY', bg: 'bg-red-950/80 text-red-300', border: 'border-red-500/50 hover:bg-red-900', icon: AlertTriangle },
    { status: 'OFFLINE', label: '10-10 OUT OF SERVICE', bg: 'bg-slate-900 text-slate-400', border: 'border-slate-700 hover:bg-slate-800', icon: Ban },
  ];

  const handleStatusChange = async (targetStatus: ResourceStatus) => {
    if (updating || resource.status === targetStatus) return;
    setUpdating(true);
    setStatusError(null);

    try {
      const res = await updateResourceStatus(resource.id, targetStatus);
      if (res.success && res.resource) {
        onStatusUpdated(res.resource);
      } else {
        setStatusError(res.error || 'Failed to update unit status');
      }
    } catch (err: any) {
      setStatusError(err.message || 'Error changing status');
    } finally {
      setUpdating(false);
    }
  };

  const triggerSosAlert = () => {
    setSosAlertSent(true);
    setTimeout(() => setSosAlertSent(false), 5000);
  };

  return (
    <div className="glass-panel border-2 border-white/20 p-5 rounded-xl space-y-4 bg-black/80">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <h3 className="font-archivo text-base text-white uppercase flex items-center gap-2">
            UNIT STATUS & DISPATCH OVERRIDE
          </h3>
          <p className="font-space text-xs text-slate-400">
            DRIVER CONSOLE TELEMETRY - CALL SIGN: <strong className="text-[#FF4D00]">{resource.resourceCode}</strong>
          </p>
        </div>
        <ResourceStatusBadge status={resource.status} />
      </div>

      {statusError && (
        <div className="p-2.5 bg-red-950/60 border border-red-500 text-red-300 text-xs font-space rounded flex items-center justify-between">
          <span>{statusError}</span>
          <button onClick={() => setStatusError(null)} className="text-white hover:underline">Dismiss</button>
        </div>
      )}

      {/* Quick Status Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATUS_OPTIONS.map(({ status, label, bg, border, icon: Icon }) => {
          const isCurrent = resource.status === status;
          return (
            <button
              key={status}
              disabled={updating}
              onClick={() => handleStatusChange(status)}
              className={`p-3 rounded-lg border font-space text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 min-h-[72px] text-center ${
                isCurrent
                  ? `${bg} ${border} ring-2 ring-white shadow-xl scale-[1.02]`
                  : `bg-black/50 border-white/10 text-slate-400 hover:text-white ${border}`
              } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Icon className={`w-5 h-5 ${isCurrent ? 'animate-bounce' : ''}`} />
              <span className="leading-tight text-[11px]">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Driver Siren Strobe & SOS Panic Row */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <button
          onClick={() => onSirenToggle(!sirenActive)}
          className={`flex-1 w-full py-3 px-4 rounded-lg font-space font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition border-2 ${
            sirenActive
              ? 'bg-red-600 text-white border-red-400 animate-pulse shadow-lg shadow-red-500/50'
              : 'bg-black/70 text-slate-300 border-white/20 hover:border-white/40 hover:text-white'
          }`}
        >
          {sirenActive ? <Volume2 className="w-5 h-5 animate-spin" /> : <VolumeX className="w-5 h-5" />}
          {sirenActive ? 'SIREN & STROBE ACTIVE (10-33)' : 'TOGGLE EMERGENCY SIREN & LIGHTS'}
        </button>

        <button
          onClick={triggerSosAlert}
          className={`w-full sm:w-auto py-3 px-5 rounded-lg font-space font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition border-2 ${
            sosAlertSent
              ? 'bg-amber-500 text-black border-black font-extrabold shadow-xl'
              : 'bg-red-950/80 text-red-400 border-red-600/60 hover:bg-red-900 hover:text-white'
          }`}
        >
          {sosAlertSent ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-black" />
              MAYDAY DISPATCH SENT TO CONTROL ROOM
            </>
          ) : (
            <>
              <ShieldAlert className="w-5 h-5 text-red-400" />
              SOS BACKUP REQUEST
            </>
          )}
        </button>
      </div>
    </div>
  );
};
