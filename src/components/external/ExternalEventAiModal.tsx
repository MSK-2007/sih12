import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  Brain,
  Shield,
  FileText,
  Layers,
  ArrowRight,
  Eye,
  Archive,
  RefreshCw,
  Clock,
  Navigation,
  CheckSquare,
  Square,
  Sliders
} from 'lucide-react';
import { ExternalEvent, ExternalEventAiAnalysis } from '../../types/externalEvents';
import { analyzeExternalEvent, subscribeToAiAnalysisRealtime } from '../../services/externalEventAiService';
import { processExternalEventWorkflow, executeOperatorDispatchConfirmation } from '../../services/externalEventWorkflow';
import { PriorityAnalysis } from '../../engines/priorityEngine';
import { AllocationAnalysis } from '../../engines/allocationEngine';
import { EmergencyType, InjuryLevel, PriorityLevel, Incident } from '../../types/incident';
import { supabase, isSupabaseConfigured } from '../../services/supabase';

interface ExternalEventAiModalProps {
  event: ExternalEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onIncidentCreated?: () => void;
}

type WorkflowStep = 'AI_ANALYSIS' | 'EDIT_INCIDENT' | 'RECOMMENDED_RESPONSE';

export const ExternalEventAiModal: React.FC<ExternalEventAiModalProps> = ({
  event,
  isOpen,
  onClose,
  onIncidentCreated,
}) => {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('AI_ANALYSIS');

  // Step 1: AI Analysis State
  const [analysis, setAnalysis] = useState<ExternalEventAiAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiErrorMsg, setAiErrorMsg] = useState<string | null>(null);

  // Step 2: Edit Incident State
  const [incidentTitle, setIncidentTitle] = useState<string>('');
  const [incidentDescription, setIncidentDescription] = useState<string>('');
  const [emergencyType, setEmergencyType] = useState<EmergencyType>('NATURAL_DISASTER');
  const [incidentSeverity, setIncidentSeverity] = useState<PriorityLevel>('HIGH');
  const [peopleAffected, setPeopleAffected] = useState<number>(25);
  const [injuryLevel, setInjuryLevel] = useState<InjuryLevel>('MODERATE');
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<string[]>([]);

  // Step 3: Decision Engine & Allocation Output State
  const [engineLoading, setEngineLoading] = useState<boolean>(false);
  const [createdIncident, setCreatedIncident] = useState<Incident | null>(null);
  const [priorityAnalysis, setPriorityAnalysis] = useState<PriorityAnalysis | null>(null);
  const [allocationAnalysis, setAllocationAnalysis] = useState<AllocationAnalysis | null>(null);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [showModifyList, setShowModifyList] = useState<boolean>(false);

  // Dispatch Confirmation State
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!event || !isOpen) {
      setAnalysis(null);
      setCurrentStep('AI_ANALYSIS');
      setShowModifyList(false);
      setDispatchError(null);
      setDispatchSuccessMsg(null);
      return;
    }

    setIncidentTitle(`Seismic Incident: ${event.title}`);
    setPeopleAffected(event.magnitude >= 7.0 ? 100 : event.magnitude >= 6.0 ? 50 : event.magnitude >= 5.0 ? 15 : 5);
    setInjuryLevel(event.magnitude >= 6.0 ? 'SEVERE' : event.magnitude >= 5.0 ? 'MODERATE' : 'MINOR');
    setEmergencyType('NATURAL_DISASTER');

    // Auto load existing AI analysis or trigger fresh analysis
    const loadAnalysis = async () => {
      setAiLoading(true);
      setAiErrorMsg(null);
      const res = await analyzeExternalEvent(event);
      if (res.success && res.analysis) {
        setAnalysis(res.analysis);
        setIncidentSeverity(res.analysis.riskLevel as PriorityLevel);
        setIncidentDescription(`${res.analysis.situationSummary}\n\nAffected Area: ${res.analysis.affectedAreaAssessment}`);
        setSelectedResourceTypes(res.analysis.recommendedResourceTypes);
      } else {
        setAiErrorMsg(res.error || 'AI analysis is temporarily unavailable. Manual review is still available.');
      }
      setAiLoading(false);
    };

    loadAnalysis();

    // Realtime subscription for incident_ai_analysis
    const unsubscribe = subscribeToAiAnalysisRealtime(event.id, (updatedAnalysis) => {
      setAnalysis(updatedAnalysis);
      setIncidentSeverity(updatedAnalysis.riskLevel as PriorityLevel);
      setIncidentDescription(`${updatedAnalysis.situationSummary}\n\nAffected Area: ${updatedAnalysis.affectedAreaAssessment}`);
      setSelectedResourceTypes(updatedAnalysis.recommendedResourceTypes);
    });

    return () => {
      unsubscribe();
    };
  }, [event, isOpen]);

  if (!isOpen || !event) return null;

  // Handle re-triggering AI Analysis
  const handleManualAiTrigger = async () => {
    setAiLoading(true);
    setAiErrorMsg(null);
    const res = await analyzeExternalEvent(event);
    if (res.success && res.analysis) {
      setAnalysis(res.analysis);
      setIncidentSeverity(res.analysis.riskLevel as PriorityLevel);
      setIncidentDescription(`${res.analysis.situationSummary}\n\nAffected Area: ${res.analysis.affectedAreaAssessment}`);
      setSelectedResourceTypes(res.analysis.recommendedResourceTypes);
    } else {
      setAiErrorMsg(res.error || 'AI analysis is temporarily unavailable.');
    }
    setAiLoading(false);
  };

  // Run Priority & Resource Allocation Engines
  const handleRunDecisionEngine = async () => {
    setEngineLoading(true);
    try {
      const result = await processExternalEventWorkflow({
        event,
        title: incidentTitle,
        emergencyType,
        severity: incidentSeverity,
        peopleAffected,
        injuryLevel,
        description: incidentDescription,
        geminiRiskLevel: analysis?.riskLevel,
        geminiSummary: analysis?.situationSummary,
      });

      setCreatedIncident(result.incident);
      setPriorityAnalysis(result.priorityAnalysis);
      setAllocationAnalysis(result.allocationAnalysis);

      // Pre-select top candidate resources (rank 1 per type or top 3)
      const topIds = result.allocationAnalysis.recommendations.slice(0, 3).map((r) => r.resourceId);
      setSelectedResourceIds(topIds);

      setCurrentStep('RECOMMENDED_RESPONSE');
    } catch (err) {
      console.error('[ExternalEventAiModal] Engine execution failed:', err);
    } finally {
      setEngineLoading(false);
    }
  };

  // Handle Operator Dispatch Confirmation
  const handleConfirmDispatch = async () => {
    if (!createdIncident || selectedResourceIds.length === 0) return;

    setIsDispatching(true);
    setDispatchError(null);

    const res = await executeOperatorDispatchConfirmation(createdIncident.id, selectedResourceIds);

    if (res.success) {
      setDispatchSuccessMsg(res.message);
      setTimeout(() => {
        if (onIncidentCreated) onIncidentCreated();
        onClose();
      }, 1200);
    } else {
      setDispatchError(res.message);
      if (res.staleResourceId) {
        // Remove stale resource from selection
        setSelectedResourceIds((prev) => prev.filter((id) => id !== res.staleResourceId));
      }
    }
    setIsDispatching(false);
  };

  const handleMonitor = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('external_events').update({ status: 'UNDER_REVIEW' }).eq('id', event.id);
      } catch {
        // Ignore DB error in offline fallback mode
      }
    }
    onClose();
  };

  const handleDismiss = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('external_events').update({ status: 'ARCHIVED' }).eq('id', event.id);
      } catch {
        // Ignore DB error in offline fallback mode
      }
    }
    onClose();
  };

  const toggleResourceSelection = (resourceId: string) => {
    setSelectedResourceIds((prev) =>
      prev.includes(resourceId) ? prev.filter((id) => id !== resourceId) : [...prev, resourceId]
    );
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return <span className="px-2.5 py-1 bg-red-500/20 text-red-400 border border-red-500/40 rounded text-xs font-bold uppercase">CRITICAL RISK</span>;
      case 'HIGH':
        return <span className="px-2.5 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/40 rounded text-xs font-bold uppercase">HIGH RISK</span>;
      case 'MODERATE':
        return <span className="px-2.5 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 rounded text-xs font-bold uppercase">MODERATE RISK</span>;
      default:
        return <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded text-xs font-bold uppercase">LOW RISK</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-inter overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
              <Brain className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-tight uppercase">
                  {currentStep === 'AI_ANALYSIS' && 'GEMINI AI CONTEXT ANALYSIS'}
                  {currentStep === 'EDIT_INCIDENT' && 'CREATE INCIDENT — OPERATOR REVIEW'}
                  {currentStep === 'RECOMMENDED_RESPONSE' && 'RESQAI RECOMMENDED RESPONSE & DISPATCH'}
                </h3>
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-mono rounded border border-indigo-500/30">
                  {currentStep === 'RECOMMENDED_RESPONSE' ? 'Priority & Allocation Engine' : analysis?.modelName || 'Gemini 1.5 Flash'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Contextual decision support for live {event.source === 'NASA_FIRMS' || event.eventType === 'FIRE' ? 'NASA FIRMS fire detection' : 'USGS seismic event'}: <strong className="text-white">{event.title}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Event Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/90 border border-slate-800 p-3 rounded-xl">
            <div>
              <span className="text-slate-400 text-[10px] block">Magnitude</span>
              <span className="text-lg font-black text-amber-400">M {event.magnitude.toFixed(1)}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Location</span>
              <span className="text-xs font-semibold text-slate-200 truncate block">{event.title}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Coordinates</span>
              <span className="text-xs font-mono text-slate-300 block">{event.latitude.toFixed(2)}°, {event.longitude.toFixed(2)}°</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Occurred Time</span>
              <span className="text-xs text-slate-300 block">{new Date(event.occurredAt).toLocaleTimeString()}</span>
            </div>
          </div>

          {/* STEP 1: AI ANALYSIS DISPLAY */}
          {currentStep === 'AI_ANALYSIS' && (
            <>
              {aiErrorMsg && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 flex items-start space-x-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-xs font-bold text-amber-200">AI Context Support Notice</strong>
                    <p className="text-[11px] text-amber-300/90 mt-0.5">{aiErrorMsg}</p>
                  </div>
                </div>
              )}

              {aiLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                  <span className="text-xs text-slate-400 font-medium">Generating Gemini Contextual Analysis & Risk Assessment...</span>
                </div>
              ) : analysis ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Risk Level Assessment</span>
                      <div className="flex items-center space-x-2">
                        {getRiskBadge(analysis.riskLevel)}
                        <span className="text-slate-400 font-mono text-[11px]">Confidence: <strong className="text-indigo-400">{analysis.confidence}%</strong></span>
                      </div>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Recommended Operator Action</span>
                      <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-xs font-bold uppercase block w-fit">
                        {analysis.recommendedOperatorAction.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                        <Brain className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Situation Summary</span>
                      </h4>
                      <p className="text-slate-200 text-xs leading-relaxed">{analysis.situationSummary}</p>
                    </div>

                    <div className="border-t border-slate-800/80 pt-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Reasoning Summary</h4>
                      <p className="text-slate-400 text-[11px] leading-relaxed font-mono">{analysis.reasoningSummary}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                      <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Potential Impacts</span>
                      </h4>
                      <ul className="space-y-1.5 pl-4 list-disc text-slate-300">
                        {analysis.potentialImpacts.map((impact, idx) => (
                          <li key={idx}>{impact}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                      <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center space-x-1.5">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Recommended Resource Types</span>
                      </h4>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {analysis.recommendedResourceTypes.map((resType, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded text-xs font-bold">
                            {resType}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Affected Area Assessment</h4>
                    <p className="text-slate-300 text-xs leading-relaxed">{analysis.affectedAreaAssessment}</p>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {/* STEP 2: EDIT INCIDENT DETAILS */}
          {currentStep === 'EDIT_INCIDENT' && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                <FileText className="w-4 h-4 text-rose-400" />
                <h4 className="text-sm font-bold text-white uppercase">Pre-Filled Incident Creation Form</h4>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1">Incident Title</label>
                  <input
                    type="text"
                    value={incidentTitle}
                    onChange={(e) => setIncidentTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Emergency Type</label>
                    <select
                      value={emergencyType}
                      onChange={(e) => setEmergencyType(e.target.value as EmergencyType)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="NATURAL_DISASTER">NATURAL_DISASTER (Earthquake)</option>
                      <option value="FIRE">FIRE</option>
                      <option value="MEDICAL">MEDICAL</option>
                      <option value="ACCIDENT">ACCIDENT</option>
                      <option value="HAZMAT">HAZMAT</option>
                      <option value="RESCUE">RESCUE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Assigned Severity</label>
                    <select
                      value={incidentSeverity}
                      onChange={(e) => setIncidentSeverity(e.target.value as PriorityLevel)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MODERATE">MODERATE</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Estimated People Affected</label>
                    <input
                      type="number"
                      min={1}
                      value={peopleAffected}
                      onChange={(e) => setPeopleAffected(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 font-medium mb-1">Injury Level</label>
                    <select
                      value={injuryLevel}
                      onChange={(e) => setInjuryLevel(e.target.value as InjuryLevel)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="FATAL">FATAL</option>
                      <option value="SEVERE">SEVERE</option>
                      <option value="MODERATE">MODERATE</option>
                      <option value="MINOR">MINOR</option>
                      <option value="NONE">NONE</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1">Recommended Resource Types (Gemini AI)</label>
                  <div className="flex flex-wrap gap-1.5 pb-2">
                    {selectedResourceTypes.map((resType, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-[10px] font-bold">
                        {resType}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1">Situation Description</label>
                  <textarea
                    rows={3}
                    value={incidentDescription}
                    onChange={(e) => setIncidentDescription(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: RECOMMENDED RESPONSE & DECISION SUPPORT */}
          {currentStep === 'RECOMMENDED_RESPONSE' && priorityAnalysis && allocationAnalysis && (
            <div className="space-y-5">
              
              {/* RECOMMENDED RESPONSE Header Card */}
              <div className="bg-gradient-to-r from-rose-950/60 via-slate-950 to-indigo-950/60 border border-rose-500/40 rounded-xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] text-rose-400 uppercase font-black tracking-widest block mb-1">
                    RESQAI ENGINE DECISION SUPPORT RECOMMENDATION
                  </span>
                  <h3 className="text-xl font-black text-white tracking-tight uppercase">RECOMMENDED RESPONSE</h3>
                  <p className="text-xs text-slate-300 mt-1">{priorityAnalysis.explanation}</p>
                </div>

                <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-700/80 px-4 py-3 rounded-xl shrink-0">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">Priority Score</span>
                    <span className="text-2xl font-black text-rose-400">{priorityAnalysis.score} <span className="text-xs text-slate-400">/ 100</span></span>
                  </div>
                  <div className="h-8 w-px bg-slate-700" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">Level</span>
                    <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-xs font-bold uppercase">
                      {priorityAnalysis.level}
                    </span>
                  </div>
                </div>
              </div>

              {/* Major Factors Influencing Priority Score */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Brain className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Major Priority Factors Breakdown</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {priorityAnalysis.factors.map((factor, idx) => (
                    <div key={idx} className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg space-y-1">
                      <span className="text-[10px] text-slate-400 block font-medium">{factor.name}</span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{factor.rawValue}</span>
                        <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1 rounded">+{factor.contribution} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ranked Recommended Resource Units */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Ranked Resource Allocation Candidates ({allocationAnalysis.recommendations.length} available)
                    </h4>
                  </div>
                  <button
                    onClick={() => setShowModifyList(!showModifyList)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{showModifyList ? 'Hide All Candidates' : '[MODIFY RECOMMENDATION]'}</span>
                  </button>
                </div>

                {allocationAnalysis.recommendations.length === 0 ? (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs">
                    No active available response units match spatial location. Expand fleet pool or assign manually.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {(showModifyList ? allocationAnalysis.recommendations : allocationAnalysis.recommendations.slice(0, 3)).map((rec) => {
                      const isSelected = selectedResourceIds.includes(rec.resourceId);
                      return (
                        <div
                          key={rec.resourceId}
                          onClick={() => toggleResourceSelection(rec.resourceId)}
                          className={`p-3 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-indigo-950/40 border-indigo-500/50 text-white shadow-md'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <button className="text-indigo-400 focus:outline-none">
                              {isSelected ? <CheckSquare className="w-5 h-5 text-emerald-400" /> : <Square className="w-5 h-5 text-slate-600" />}
                            </button>

                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-black text-sm text-white">{rec.resourceCode}</span>
                                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-bold border border-slate-700">
                                  {rec.resourceType}
                                </span>
                                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold">
                                  AVAILABLE
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-300 mt-0.5">{rec.explanation}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 shrink-0 text-xs font-mono">
                            <div className="flex items-center space-x-1 text-amber-400">
                              <Clock className="w-3.5 h-3.5" />
                              <span>ETA: <strong>{rec.etaMinutes} min</strong></span>
                            </div>
                            <div className="flex items-center space-x-1 text-slate-400">
                              <Navigation className="w-3.5 h-3.5" />
                              <span>{rec.distanceKm.toFixed(1)} km</span>
                            </div>
                            <div className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded font-bold border border-indigo-500/30">
                              Score: {rec.allocationScore}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status Message Feedback */}
              {dispatchError && (
                <div className="p-3 bg-red-500/10 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{dispatchError}</span>
                </div>
              )}

              {dispatchSuccessMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{dispatchSuccessMsg}</span>
                </div>
              )}

            </div>
          )}

          {/* Human-in-the-loop Guardrail Notice */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 flex items-center space-x-2 text-[10px]">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>ResQAI System Safety Architecture:</strong> Gemini AI provides context. Priority engine calculates priority score. Deterministic allocation engine selects candidate units. Human operator must approve dispatch.
            </span>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          {currentStep === 'AI_ANALYSIS' && (
            <>
              <button
                onClick={handleManualAiTrigger}
                disabled={aiLoading}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium border border-slate-700 transition text-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>ANALYZE WITH AI</span>
              </button>

              <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end text-xs">
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg font-medium flex items-center space-x-1 transition"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Dismiss</span>
                </button>
                <button
                  onClick={handleMonitor}
                  className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-lg font-semibold flex items-center space-x-1 transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Monitor</span>
                </button>
                <button
                  onClick={() => setCurrentStep('EDIT_INCIDENT')}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg flex items-center space-x-1.5 shadow-md transition"
                >
                  <span>Create Incident</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {currentStep === 'EDIT_INCIDENT' && (
            <>
              <button
                onClick={() => setCurrentStep('AI_ANALYSIS')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition text-xs"
              >
                Back to Analysis
              </button>

              <button
                onClick={handleRunDecisionEngine}
                disabled={engineLoading}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg flex items-center space-x-2 transition shadow-md text-xs"
              >
                {engineLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing Priority & Allocation Engines...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    <span>RUN RESQAI DECISION ENGINE</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}

          {currentStep === 'RECOMMENDED_RESPONSE' && (
            <>
              <button
                onClick={() => setCurrentStep('EDIT_INCIDENT')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg font-medium transition text-xs"
              >
                Back to Edit
              </button>

              <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end text-xs">
                <button
                  onClick={onClose}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => setShowModifyList(!showModifyList)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded-lg font-semibold transition"
                >
                  MODIFY RECOMMENDATION
                </button>
                <button
                  onClick={handleConfirmDispatch}
                  disabled={isDispatching || selectedResourceIds.length === 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg flex items-center space-x-1.5 shadow-lg transition"
                >
                  {isDispatching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Dispatching Units...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>CONFIRM DISPATCH ({selectedResourceIds.length})</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
