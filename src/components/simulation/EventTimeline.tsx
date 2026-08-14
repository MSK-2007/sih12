import { SimulationEvent } from '../../types/simulation';
import { Activity, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface Props {
  events: SimulationEvent[];
  activeIncidentTitles?: string[];
  onSelectIncidentByTitle?: (title: string) => void;
  selectedIncidentTitle?: string | null;
}

export const EventTimeline: React.FC<Props> = ({
  events,
  activeIncidentTitles = [],
  onSelectIncidentByTitle,
  selectedIncidentTitle = null,
}) => {
  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
            SIMULATION EVENT TIMELINE
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500 uppercase">{events.length} Scheduled Events</span>
      </div>

      {events.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500">
          No simulation events loaded.
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {events.map((evt) => {
            const isCompleted = evt.status === 'COMPLETED';
            const isProcessing = evt.status === 'PROCESSING';
            const isFailed = evt.status === 'FAILED';
            
            const hasIncident = evt.type.includes('INCIDENT') && evt.payload && typeof evt.payload.title === 'string';
            const incidentTitle = evt.payload?.title || '';
            const isClickable = hasIncident && activeIncidentTitles.includes(incidentTitle);
            const isSelected = isClickable && selectedIncidentTitle === incidentTitle;

            return (
              <div
                key={evt.id}
                onClick={() => {
                  if (isClickable && onSelectIncidentByTitle && incidentTitle) {
                    onSelectIncidentByTitle(incidentTitle);
                  }
                }}
                className={`p-3 rounded-lg border flex items-center justify-between gap-3 text-xs font-mono transition ${
                  isClickable 
                    ? 'cursor-pointer hover:border-[#FF4D00]/60 hover:bg-[#FF4D00]/5' 
                    : ''
                } ${
                  isSelected
                    ? 'border-[#FF4D00] bg-[#FF4D00]/10 ring-2 ring-[#FF4D00]/20'
                    : isProcessing
                    ? 'bg-amber-950/20 border-amber-500/40 ring-1 ring-amber-500/20'
                    : isCompleted
                    ? 'bg-slate-900/80 border-slate-800'
                    : isFailed
                    ? 'bg-red-950/20 border-red-500/40'
                    : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-400 text-[11px] shrink-0">{evt.simulatedTime}</span>
                  <div>
                    <span className={`font-bold block text-xs ${evt.type.includes('CRITICAL') ? 'text-red-400' : 'text-slate-200'}`}>
                      {evt.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400 font-sans block line-clamp-1">
                      {evt.payload?.title || evt.payload?.resourceCode || 'Event payload'}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {isCompleted ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" /> COMPLETED
                    </span>
                  ) : isProcessing ? (
                    <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/30 animate-pulse">
                      <Clock className="w-3 h-3" /> RUNNING
                    </span>
                  ) : isFailed ? (
                    <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold px-2 py-0.5 rounded bg-red-950/40 border border-red-500/30">
                      <AlertCircle className="w-3 h-3" /> FAILED
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                      PENDING
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

