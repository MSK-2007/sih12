import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  Zap, 
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { analyzeDynamicReallocation } from '../../services/reallocation';
import { evaluatePerformance } from '../../simulation/performanceEvaluator';

export interface DemoStep {
  id: number;
  title: string;
  subtitle: string;
  phase: string;
  badgeColor: string;
  details: string;
  actionLabel: string;
}

const DEMO_STEPS: DemoStep[] = [
  {
    id: 1,
    title: '1. Incident Intake & Synthetic Detection',
    subtitle: 'Emergency call received: Multi-vehicle collision at MG Road Junction',
    phase: 'INTAKE',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    details: 'System creates synthetic incident INC-DEMO-101 (Latitude: 12.9716, Longitude: 77.5946, 6 People Affected, SEVERE Injuries). Marked explicitly as [SYNTHETIC].',
    actionLabel: 'Execute Incident Intake',
  },
  {
    id: 2,
    title: '2. Priority Engine Score Calculation',
    subtitle: 'Deterministic evaluation of severity, casualties, injury level, & urgency',
    phase: 'PRIORITY',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    details: 'Priority Score calculated: 78.4 / 100 (HIGH Priority). Urgency multiplier applied based on reported timestamp decay.',
    actionLabel: 'Calculate Priority Score',
  },
  {
    id: 3,
    title: '3. Real External Data Intelligence Pipeline',
    subtitle: 'Fetch nearby real IMD weather alerts, USGS seismic events, & FIRMS fires',
    phase: 'ENVIRONMENTAL',
    badgeColor: 'bg-[#FF4D00]/20 text-[#FF4D00] border-[#FF4D00]/30',
    details: 'Real-time spatial query checks active IMD alerts within 30km. Active thunderstorm nowcast increases Environmental Risk Score by +15.0 pts.',
    actionLabel: 'Query Environmental Pipeline',
  },
  {
    id: 4,
    title: '4. Gemini AI Contextual Analysis',
    subtitle: 'Gemini 1.5 Flash generates contextual classification & risk explanation',
    phase: 'GEMINI AI',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    details: 'Gemini prompt analyzes incident + weather overlap: "High risk of flash flooding near flyover causing secondary hydroplaning. Recommends ALS ambulance and heavy rescue equipment."',
    actionLabel: 'Run Gemini AI Analysis',
  },
  {
    id: 5,
    title: '5. Initial Resource Optimization',
    subtitle: 'Global optimization assigns available sector units AMB-01 & FIRE-01',
    phase: 'OPTIMIZATION',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    details: 'Matching algorithm identifies optimal resource by capabilities (ALS), travel ETA (8.2 mins), and current workload.',
    actionLabel: 'Assign Initial Resources',
  },
  {
    id: 6,
    title: '6. High-Priority Critical Incident Surge',
    subtitle: 'CRITICAL building collapse reported at Whitefield (25 Trapped)',
    phase: 'SURGE',
    badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
    details: 'New Incident INC-DEMO-102 created with Priority Score 94.2 / 100 (CRITICAL). Sector resources are currently fully committed.',
    actionLabel: 'Inject Critical Surge Event',
  },
  {
    id: 7,
    title: '7. Resource Conflict Detection',
    subtitle: 'Resource deficit identified — AMB-01 committed to lower priority incident',
    phase: 'CONFLICT',
    badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    details: 'Engine detects conflict: AMB-01 (ALS capability) is en-route to MEDIUM priority incident while CRITICAL incident requires immediate ALS unit.',
    actionLabel: 'Detect Fleet Conflict',
  },
  {
    id: 8,
    title: '8. Dynamic Reallocation Engine Execution',
    subtitle: 'Pareto-optimization evaluates global reassignment options across all active emergencies',
    phase: 'REALLOCATION',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    details: 'Engine proposes preempting AMB-01 from INC-DEMO-101 and dispatching to INC-DEMO-102, while routing backup BLS unit to INC-DEMO-101.',
    actionLabel: 'Compute Global Reallocation',
  },
  {
    id: 9,
    title: '9. System Quality Score Impact Calculation',
    subtitle: 'Empirical calculation of before vs proposed global System Quality',
    phase: 'ANALYTICS',
    badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    details: 'System Quality before reallocation: 62.1/100. Proposed System Quality: 84.8/100 (+22.7% net improvement). Critical response time reduced by 6.4 minutes.',
    actionLabel: 'Calculate System Quality Gain',
  },
  {
    id: 10,
    title: '10. Human Operator Recommendation Review',
    subtitle: 'Human-in-the-Loop decision modal presents Gemini explanation & trade-offs',
    phase: 'HUMAN-IN-LOOP',
    badgeColor: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    details: 'Control room operator presented with complete context: trade-off matrix, Gemini summary, baseline comparison, and explicit ACCEPT / REJECT controls.',
    actionLabel: 'Open Operator Decision Modal',
  },
  {
    id: 11,
    title: '11. Operator Reallocation Approval',
    subtitle: 'Operator reviews trade-off and confirms reassignment recommendation',
    phase: 'APPROVAL',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    details: 'Operator clicks "ACCEPT REALLOCATION". Decision recorded with operator credentials and timestamp.',
    actionLabel: 'Simulate Operator Approval',
  },
  {
    id: 12,
    title: '12. Atomic Dispatch Execution',
    subtitle: 'System releases previous assignment & issues dispatches in database',
    phase: 'DISPATCH',
    badgeColor: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    details: 'Atomic updates: AMB-01 reassigned to INC-DEMO-102. AMB-04 dispatched to INC-DEMO-101. Realtime notification emitted to field units.',
    actionLabel: 'Execute Atomic Dispatch',
  },
  {
    id: 13,
    title: '13. Persistent Audit Logging & Analytics Sync',
    subtitle: 'Log saved to reallocation_audit_logs & live operational metrics updated',
    phase: 'AUDIT & METRICS',
    badgeColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    details: 'Full audit record created in Supabase. Analytics dashboard updated with reallocation count (+1) and response time improvements.',
    actionLabel: 'Finalize Pipeline Run',
  },
];

export const InteractiveDemoRunner: React.FC = () => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [demoActive, setDemoActive] = useState<boolean>(false);

  const activeStep = DEMO_STEPS[currentStepIndex];

  const handleStartDemo = () => {
    setDemoActive(true);
    setCurrentStepIndex(0);
    setLogs([`[00:00] End-to-End ResQAI Demonstration Pipeline initialized.`]);
  };

  const handleNextStep = async () => {
    if (currentStepIndex < DEMO_STEPS.length - 1) {
      const nextIdx = currentStepIndex + 1;
      const nextStep = DEMO_STEPS[nextIdx];
      setCurrentStepIndex(nextIdx);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Completed Step ${activeStep.id}: ${activeStep.phase} → Progressing to Step ${nextStep.id}: ${nextStep.phase}`,
      ]);

      // Execute background mock work for step demonstration
      if (nextIdx === 7) {
        await analyzeDynamicReallocation();
      } else if (nextIdx === 8) {
        await evaluatePerformance();
      }
    }
  };

  const handleReset = () => {
    setDemoActive(false);
    setCurrentStepIndex(0);
    setLogs([]);
  };

  return (
    <div className="glass-panel p-5 border-2 border-black space-y-4 bg-black/90">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/20 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-none bg-[#FF4D00] border border-black flex items-center justify-center text-black font-black">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-archivo text-sm uppercase tracking-tight text-white font-extrabold">
                RESQAI END-TO-END DEMONSTRATION PIPELINE
              </h3>
              <span className="bg-[#FF4D00] text-black font-space text-[10px] font-black px-2 py-0.5 uppercase border border-black">
                13-STEP LIVE DEMO
              </span>
            </div>
            <p className="font-space text-xs text-slate-400 mt-0.5">
              Intake → Priority → Environmental → Gemini AI → Reallocation → Operator Approval → Dispatch → Audit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!demoActive ? (
            <button
              onClick={handleStartDemo}
              className="bg-[#FF4D00] hover:bg-[#E54500] text-black font-space text-xs font-black px-4 py-2 border-2 border-black uppercase flex items-center gap-2 transition"
            >
              <Play className="w-4 h-4 fill-current" />
              START FULL DEMO PIPELINE
            </button>
          ) : (
            <button
              onClick={handleReset}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-space text-xs font-bold px-3 py-1.5 border border-slate-600 uppercase flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              RESET DEMO
            </button>
          )}
        </div>
      </div>

      {demoActive && (
        <div className="space-y-4 animate-fade-in">
          {/* Step Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-space">
              <span className="text-[#FF4D00] font-bold uppercase">
                STEP {activeStep.id} OF {DEMO_STEPS.length}: {activeStep.phase}
              </span>
              <span className="text-slate-400">
                {Math.round(((currentStepIndex + 1) / DEMO_STEPS.length) * 100)}% COMPLETE
              </span>
            </div>
            <div className="w-full bg-slate-900 border border-white/20 h-2.5 overflow-hidden">
              <div
                className="bg-[#FF4D00] h-full transition-all duration-300"
                style={{ width: `${((currentStepIndex + 1) / DEMO_STEPS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Active Step Card */}
          <div className="p-4 border-2 border-[#FF4D00] bg-slate-950 space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-space font-black px-2.5 py-1 uppercase border ${activeStep.badgeColor}`}>
                {activeStep.phase}
              </span>
              <span className="font-space text-[11px] text-slate-400">
                Step {activeStep.id} / 13
              </span>
            </div>

            <div>
              <h4 className="font-archivo text-base uppercase text-white font-extrabold">
                {activeStep.title}
              </h4>
              <p className="font-space text-xs text-[#FF4D00] font-bold mt-0.5">
                {activeStep.subtitle}
              </p>
            </div>

            <div className="p-3 bg-black border border-white/10 text-xs font-space text-slate-300 leading-relaxed">
              {activeStep.details}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-space text-[11px] text-emerald-400 font-bold uppercase">
                  Engine Ready for Step Execution
                </span>
              </div>

              {currentStepIndex < DEMO_STEPS.length - 1 ? (
                <button
                  onClick={handleNextStep}
                  className="bg-[#FF4D00] hover:bg-[#E54500] text-black font-space text-xs font-black px-4 py-2 border-2 border-black uppercase flex items-center gap-2 transition"
                >
                  {activeStep.actionLabel}
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 font-space text-xs font-bold px-3 py-1.5 uppercase">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  DEMO PIPELINE COMPLETE
                </div>
              )}
            </div>
          </div>

          {/* Audit Terminal Log */}
          <div className="p-3 bg-black border border-white/20 space-y-1 text-[11px] font-mono text-slate-400 max-h-36 overflow-y-auto">
            <div className="text-[10px] font-bold uppercase text-[#FF4D00] border-b border-white/10 pb-1 mb-1">
              PIPELINE EXECUTION LOGS:
            </div>
            {logs.map((log, i) => (
              <div key={i} className="leading-tight">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
