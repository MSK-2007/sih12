import React, { useEffect, useState } from 'react';
import { Incident } from '../../types/incident';
import {
  evaluateIncidentEnvironmentalContext,
  EnvironmentalIntelligenceReport,
  MatchedEnvironmentalEvent,
} from '../../services/environmentalIntelligenceService';
import { recalculateIncidentPriority } from '../../services/incidents';
import {
  ShieldAlert,
  CloudRain,
  Flame,
  Activity,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertTriangle,
  Zap,
  MapPin,
} from 'lucide-react';

interface Props {
  incident: Incident;
  onContextUpdated?: () => void;
}

export const EnvironmentalIntelligenceCard: React.FC<Props> = ({ incident, onContextUpdated }) => {
  const [report, setReport] = useState<EnvironmentalIntelligenceReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingPriority, setUpdatingPriority] = useState<boolean>(false);
  const [updateSuccessMessage, setUpdateSuccessMessage] = useState<string | null>(null);

  const fetchIntelligence = async () => {
    setLoading(true);
    try {
      const rep = await evaluateIncidentEnvironmentalContext(incident, 50);
      setReport(rep);
    } catch (err) {
      console.warn('[EnvironmentalIntelligenceCard] Evaluation error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (incident?.id) {
      fetchIntelligence();
    }
  }, [incident.id, incident.latitude, incident.longitude]);

  const handleApplyPriorityBoost = async () => {
    if (!report) return;
    setUpdatingPriority(true);
    setUpdateSuccessMessage(null);
    try {
      await recalculateIncidentPriority(incident.id);
      if (onContextUpdated) {
        onContextUpdated();
      }
      setUpdateSuccessMessage(
        `Priority recalculated with Environmental Risk Score (${report.compositeRiskScore}/100). Deterministic boost applied.`
      );
      setTimeout(() => setUpdateSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('[EnvironmentalIntelligenceCard] Priority update error:', err);
    } finally {
      setUpdatingPriority(false);
    }
  };

  const renderEventIcon = (eventType: string) => {
    if (eventType.includes('FIRE')) {
      return <Flame className="w-4 h-4 text-orange-400 shrink-0" />;
    }
    if (eventType.includes('EARTHQUAKE')) {
      return <Activity className="w-4 h-4 text-purple-400 shrink-0" />;
    }
    return <CloudRain className="w-4 h-4 text-sky-400 shrink-0" />;
  };

  const getSourceBadgeColor = (source: string) => {
    if (source === 'IMD') return 'bg-sky-950 text-sky-400 border-sky-800';
    if (source === 'USGS') return 'bg-purple-950 text-purple-400 border-purple-800';
    if (source === 'NASA_FIRMS') return 'bg-amber-950 text-amber-400 border-amber-800';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  if (loading) {
    return (
      <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-3 font-space">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
          <RefreshCw className="w-4 h-4 animate-spin text-[#FF4D00]" />
          ANALYZING REAL-WORLD ENVIRONMENTAL INTELLIGENCE...
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-5 font-inter animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-[#FF4D00] animate-pulse shrink-0" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-archivo">
              ENVIRONMENTAL & EXTERNAL EVENT INTELLIGENCE
            </h2>
            <span className="font-space text-[10px] text-slate-400 uppercase tracking-tight">
              USGS • NASA FIRMS • IMD REAL-TIME PIPELINE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchIntelligence}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Refresh Environmental Intelligence"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <span
            className={`font-mono text-xs font-bold px-3 py-1 rounded-full border ${
              report.riskLevel === 'CRITICAL'
                ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                : report.riskLevel === 'HIGH'
                ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                : report.riskLevel === 'MODERATE'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
            }`}
          >
            ENV RISK: {report.compositeRiskScore}/100 [{report.riskLevel}]
          </span>
        </div>
      </div>

      {/* Overview & Primary Hazard Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-slate-900/70 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-space">
              PRIMARY ENVIRONMENTAL HAZARD
            </span>
            <span className="text-xs font-mono text-slate-400">
              Radius: <strong className="text-white">50 km</strong>
            </span>
          </div>
          <p className="text-sm font-semibold text-white">{report.primaryHazard}</p>

          {/* Operational Impact Notes */}
          <div className="space-y-1.5 pt-2">
            {report.operationalImpactNotes.map((note, idx) => (
              <p key={idx} className="text-xs text-slate-300 leading-relaxed font-medium flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{note}</span>
              </p>
            ))}
          </div>
        </div>

        {/* Priority Influence Action Card */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider font-space flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> PRIORITY BOOST
            </span>
            <p className="text-xs text-slate-300 leading-snug">
              Deterministic priority boost based on nearby environmental hazards.
            </p>
            <div className="font-mono text-2xl font-black text-amber-400 pt-1">
              +{report.suggestedPriorityBoost} <span className="text-xs text-slate-400 font-normal">pts max</span>
            </div>
          </div>

          <button
            onClick={handleApplyPriorityBoost}
            disabled={updatingPriority || report.matchedEventsCount === 0}
            className="w-full py-2 px-3 rounded-lg bg-[#FF4D00] hover:bg-orange-600 text-black font-space font-bold text-xs uppercase transition disabled:opacity-40 disabled:hover:bg-[#FF4D00] flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${updatingPriority ? 'animate-spin' : ''}`} />
            {updatingPriority ? 'RECALCULATING...' : 'RE-EVALUATE PRIORITY'}
          </button>
        </div>
      </div>

      {updateSuccessMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-space font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          {updateSuccessMessage}
        </div>
      )}

      {/* Matched Real-World Events List */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-space">
            DETECTED NEARBY EVENTS ({report.matchedEventsCount})
          </span>
          <span className="text-[11px] text-slate-400 font-mono">Real-time geospatial matching</span>
        </div>

        {report.matchedEvents.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
            No active USGS earthquakes, NASA FIRMS fires, or IMD weather warnings detected within 50 km radius of this incident.
          </div>
        ) : (
          <div className="space-y-2.5">
            {report.matchedEvents.map((ev: MatchedEnvironmentalEvent) => (
              <div
                key={ev.id}
                className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {renderEventIcon(ev.eventType)}
                    <span className="text-xs font-bold text-white">{ev.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${getSourceBadgeColor(ev.source)}`}>
                      {ev.source}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700 uppercase">
                      {ev.severity}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-red-400" />
                    Distance: <strong className="text-white">{ev.distanceKm.toFixed(1)} km</strong> away
                  </span>
                  <span>Reported: {new Date(ev.occurredAt).toLocaleTimeString()}</span>
                </div>

                {/* Gemini AI Summary if available */}
                {ev.aiSummary && (
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1 font-space">
                      <Info className="w-3 h-3" /> GEMINI AI CONTEXTUAL INSIGHT
                    </span>
                    <p className="leading-snug text-slate-300">{ev.aiSummary}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
