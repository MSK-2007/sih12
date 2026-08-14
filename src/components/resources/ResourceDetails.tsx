import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Resource, ResourceStatus } from '../../types/resource';
import { ResourceStatusBadge } from './ResourceStatusBadge';
import { ResourceTypeBadge } from './ResourceTypeBadge';
import { ResourceStatusControl } from './ResourceStatusControl';
import { ResourceAssignmentHistory } from './ResourceAssignmentHistory';
import { useResourceAssignments } from '../../hooks/useResourceAssignments';
import { MapPin, Users, Clock, Edit2, ArrowLeft, Activity, Package, Navigation } from 'lucide-react';
import { updateResourceLocation } from '../../services/resources';

interface Props {
  resource: Resource;
  onStatusChange: (newStatus: ResourceStatus) => Promise<boolean>;
  onRefetch: () => void;
}

function timeAgo(isoString: string | undefined): string {
  if (!isoString) return 'Unknown';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  return `${Math.floor(hrs / 24)} day(s) ago`;
}

export const ResourceDetails: React.FC<Props> = ({ resource, onStatusChange, onRefetch }) => {
  const type = resource.resourceType || resource.type || 'AMBULANCE';
  const caps = resource.capability || resource.capabilities || [];
  const { assignments, loading: assignmentsLoading } = useResourceAssignments(resource.id);

  const [locEdit, setLocEdit] = useState(false);
  const [lat, setLat] = useState(String(resource.latitude));
  const [lng, setLng] = useState(String(resource.longitude));
  const [locSaving, setLocSaving] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const handleSaveLocation = async () => {
    const newLat = Number(lat);
    const newLng = Number(lng);
    if (isNaN(newLat) || newLat < -90 || newLat > 90) {
      setLocError('Latitude must be between -90 and 90'); return;
    }
    if (isNaN(newLng) || newLng < -180 || newLng > 180) {
      setLocError('Longitude must be between -180 and 180'); return;
    }
    setLocSaving(true);
    setLocError(null);
    try {
      await updateResourceLocation(resource.id, newLat, newLng);
      onRefetch();
      setLocEdit(false);
    } catch (err: any) {
      setLocError(err?.message || 'Failed to update location');
    } finally {
      setLocSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/resources"
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1 mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Fleet Registry
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm font-bold bg-slate-800 text-slate-200 px-3 py-1 rounded border border-slate-700">
              {resource.resourceCode}
            </span>
            <ResourceTypeBadge type={type} size="md" />
            <ResourceStatusBadge status={resource.status} size="md" />
            {!resource.isActive && (
              <span className="text-xs px-2.5 py-1 rounded bg-red-950/20 text-red-400 border border-red-500/30 font-semibold">
                INACTIVE UNIT
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-2">{resource.name}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={`/map?resourceId=${resource.id}&lat=${resource.latitude}&lng=${resource.longitude}`}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/20 transition"
          >
            <MapPin className="w-4 h-4" />
            View On Map
          </Link>
          <Link
            to={`/resources/${resource.id}/edit`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-semibold transition"
          >
            <Edit2 className="w-4 h-4" />
            Edit Resource
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Control */}
          <div className="glass-panel p-5 rounded-xl border border-slate-800">
            <ResourceStatusControl
              resourceId={resource.id}
              currentStatus={resource.status}
              onStatusChange={onStatusChange}
            />
          </div>

          {/* Core Info */}
          <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-5">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Unit Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-900/50 p-3.5 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1.5">
                  <Package className="w-3.5 h-3.5 text-cyan-400" />
                  Capabilities
                </div>
                {caps.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {caps.map((cap) => (
                      <span key={cap} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono">
                        {cap.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 italic">Standard equipment</span>
                )}
              </div>

              <div className="bg-slate-900/50 p-3.5 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  Capacity
                </div>
                <p className="text-2xl font-bold text-white">{resource.capacity}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">patients / personnel</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { label: 'Resource Type', val: type.replace('_', ' ') },
                { label: 'Department', val: resource.departmentId || 'Unassigned' },
                { label: 'Created', val: new Date(resource.createdAt).toLocaleDateString() },
                { label: 'Updated', val: timeAgo(resource.updatedAt) },
              ].map(({ label, val }) => (
                <div key={label} className="bg-slate-900/40 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-500 block">{label}</span>
                  <span className="font-mono text-slate-300 mt-0.5 block truncate">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Location Panel */}
          <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Navigation className="w-4 h-4 text-red-400" />
                GPS Location
              </h2>
              {!locEdit && (
                <button
                  onClick={() => setLocEdit(true)}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                >
                  Update Location
                </button>
              )}
            </div>

            {!locEdit ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="font-mono text-sm">
                    {resource.latitude.toFixed(5)}, {resource.longitude.toFixed(5)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  Last updated: {timeAgo(resource.lastLocationUpdate || resource.updatedAt)}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                {locError && <p className="text-xs text-red-400">{locError}</p>}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveLocation}
                    disabled={locSaving}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition disabled:opacity-60"
                  >
                    {locSaving ? 'Saving...' : 'Save Location'}
                  </button>
                  <button
                    onClick={() => { setLocEdit(false); setLocError(null); }}
                    className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Assignment History */}
        <div>
          <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Clock className="w-4 h-4 text-slate-400" />
              Assignment History
            </h3>
            <ResourceAssignmentHistory assignments={assignments} loading={assignmentsLoading} />
          </div>
        </div>
      </div>
    </div>
  );
};
