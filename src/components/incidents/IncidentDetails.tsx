import React, { useState } from 'react';
import { Incident, IncidentStatus, isValidStatusTransition, ALLOWED_STATUS_TRANSITIONS } from '../../types/incident';
import { IncidentPriorityBadge } from './IncidentPriorityBadge';
import { IncidentStatusBadge } from './IncidentStatusBadge';
import { IncidentTimeline } from './IncidentTimeline';
import { IncidentUpdateForm } from './IncidentUpdateForm';
import { useIncidentUpdates } from '../../hooks/useIncidentUpdates';
import { priorityEngine } from '../../engines/priorityEngine';
import { recalculateIncidentPriority } from '../../services/incidents';
import { ResourceRecommendations } from '../allocation/ResourceRecommendations';
import { MapPin, Users, Clock, Activity, ArrowLeft, RefreshCw, Zap, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  incident: Incident;
  onStatusChange: (newStatus: IncidentStatus, message?: string) => Promise<boolean>;
}

export const IncidentDetails: React.FC<Props> = ({ incident, onStatusChange }) => {
  const { updates, loading: updatesLoading, postUpdate } = useIncidentUpdates(incident.id);
  const [changingStatus, setChangingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[incident.status] || [];

  const handleStatusClick = async (targetStatus: IncidentStatus) => {
    if (!isValidStatusTransition(incident.status, targetStatus)) {
      setStatusError(`Cannot transition directly from ${incident.status} to ${targetStatus}`);
      return;
    }

    setChangingStatus(true);
    setStatusError(null);
    try {
      const ok = await onStatusChange(targetStatus, `Operator updated status to ${targetStatus}`);
      if (!ok) {
        setStatusError('Status update failed');
      }
    } catch (err: any) {
      setStatusError(err?.message || 'Error updating status');
    } finally {
      setChangingStatus(false);
    }
  };

  const handlePostTimelineUpdate = async (message: string, targetStatus: IncidentStatus) => {
    if (targetStatus !== incident.status) {
      const ok = await onStatusChange(targetStatus, message);
      if (!ok) return;
    }
    await postUpdate(message, targetStatus);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/incidents"
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1 mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Incident Control List
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold bg-slate-800 text-slate-200 px-3 py-1 rounded border border-slate-700">
              {incident.incidentNumber}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 text-slate-300">
              {incident.emergencyType.replace('_', ' ')}
            </span>
            <IncidentStatusBadge status={incident.status} size="md" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-2">{incident.title}</h1>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to={`/map?incidentId=${incident.id}&lat=${incident.latitude}&lng=${incident.longitude}`}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/20 transition"
          >
            <MapPin className="w-4 h-4" />
            View On GIS Map
          </Link>
          <IncidentPriorityBadge level={incident.priorityLevel} score={incident.priorityScore} size="lg" />
        </div>
      </div>

      {/* Main Grid: Details + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Comprehensive Details (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Workflow Action Bar */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Status Lifecycle Control
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Current: <strong className="text-slate-200">{incident.status}</strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {allowedNextStatuses.length > 0 ? (
                allowedNextStatuses.map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusClick(st)}
                    disabled={changingStatus}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 font-mono text-xs font-semibold transition disabled:opacity-50"
                  >
                    Advance to → {st.replace('_', ' ')}
                  </button>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">
                  Incident lifecycle is CLOSED. No further state transitions allowed.
                </span>
              )}
            </div>
            {statusError && <p className="text-xs text-red-400 font-medium">{statusError}</p>}
          </div>

          {/* Overview Info Cards */}
          <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-5">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-red-500" />
              Incident Overview
            </h2>

            <div>
              <p className="text-xs font-medium text-slate-400">Description & Reported Situation</p>
              <p className="text-sm text-slate-200 mt-1 leading-relaxed">{incident.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                  <MapPin className="w-4 h-4 text-red-400" />
                  Address / Location
                </div>
                <p className="text-sm font-semibold text-white">{incident.address}</p>
                <p className="text-xs font-mono text-slate-500 mt-1">
                  GPS: {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}
                </p>
              </div>

              <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Casualties & Injury Rating
                </div>
                <p className="text-sm font-semibold text-white">
                  {incident.peopleAffected} Person(s) Affected
                </p>
                <p className="text-xs text-amber-400 font-semibold mt-1">
                  Injury Severity: {incident.injuryLevel}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="bg-slate-900/40 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block">Reported At</span>
                <span className="font-mono text-slate-300">
                  {new Date(incident.reportedAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="bg-slate-900/40 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block">Created At</span>
                <span className="font-mono text-slate-300">
                  {new Date(incident.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="bg-slate-900/40 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block">Priority Score</span>
                <span className="font-mono font-bold text-amber-400">{incident.priorityScore}/100</span>
              </div>
              <div className="bg-slate-900/40 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block">Operator Assigned</span>
                <span className="font-mono text-slate-300">
                  {incident.assignedOperator || 'Control Room Desk'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Priority Intelligence Analysis */}
          {(() => {
            const analysis = priorityEngine.calculatePriority({
              emergency_type: incident.emergencyType,
              people_affected: incident.peopleAffected,
              injury_level: incident.injuryLevel,
              severity: incident.priorityScore || 50,
              reported_at: incident.reportedAt,
            });

            return (
              <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    AI Priority Intelligence Analysis
                  </h2>
                  <button
                    onClick={async () => {
                      setChangingStatus(true);
                      try {
                        await recalculateIncidentPriority(incident.id);
                        await onStatusChange(incident.status, `Priority recalculated via Intelligence Engine`);
                      } finally {
                        setChangingStatus(false);
                      }
                    }}
                    disabled={changingStatus}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${changingStatus ? 'animate-spin' : ''}`} />
                    Recalculate Priority
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Priority Score</span>
                    <span className="font-mono text-4xl font-extrabold text-amber-400 mt-1 block">{analysis.score}<span className="text-sm text-slate-500 font-normal">/100</span></span>
                  </div>
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Classification</span>
                    <span className={`inline-block mt-2 font-mono text-sm font-bold px-3 py-1 rounded border ${
                      analysis.level === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' :
                      analysis.level === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                      analysis.level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {analysis.level}
                    </span>
                  </div>
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-center flex flex-col justify-center">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Recommended Urgency</span>
                    <span className="text-xs font-semibold text-slate-200 mt-1 leading-snug">{analysis.urgency}</span>
                  </div>
                </div>

                {/* Factor Contribution Progress Bars */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Weighted Factor Breakdown</span>
                  <div className="space-y-2.5">
                    {analysis.factors.map((f) => (
                      <div key={f.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-300">{f.name} <span className="text-slate-500 text-[10px]">({Math.round(f.weight * 100)}% weight)</span></span>
                          <span className="font-mono text-slate-400">{f.normalizedScore}/100 <span className="text-amber-400 font-bold ml-1">(+{f.contribution.toFixed(1)} pts)</span></span>
                        </div>
                        <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              f.normalizedScore >= 80 ? 'bg-red-500' : f.normalizedScore >= 60 ? 'bg-orange-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${f.normalizedScore}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explainable Rationale */}
                <div className="p-4 rounded-xl bg-amber-950/10 border border-amber-500/30 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" /> Why This Priority?
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">{analysis.explanation}</p>
                </div>
              </div>
            );
          })()}

          {/* Resource Allocation Engine Recommendations */}
          <ResourceRecommendations
            incident={incident}
            onStatusRefresh={() => onStatusChange(incident.status)}
          />
        </div>

        {/* Right Column: Timeline & Update Form (1 col) */}
        <div className="space-y-6">
          <IncidentUpdateForm
            currentStatus={incident.status}
            onSubmit={handlePostTimelineUpdate}
          />

          <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Clock className="w-4 h-4 text-slate-400" />
              Operational Timeline Logs
            </h3>
            <IncidentTimeline updates={updates} loading={updatesLoading} />
          </div>
        </div>
      </div>
    </div>
  );
};
