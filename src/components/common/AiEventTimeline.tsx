import React from 'react';
import { Clock, AlertCircle, CheckCircle2, Bot, Zap, RefreshCw, Cpu, TrendingUp } from 'lucide-react';
import { useAiEventTimeline, getEventConfig, AiTimelineEvent } from '../../hooks/useAiEventTimeline';

interface AiEventTimelineProps {
  incidentId?: string;
  limit?: number;
  compact?: boolean;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getEventIcon(eventType: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    INCIDENT_CREATED: <AlertCircle className="w-3.5 h-3.5 text-[#FF4D00]" />,
    PRIORITY_CALCULATED: <TrendingUp className="w-3.5 h-3.5 text-yellow-400" />,
    ENV_EVENT_DETECTED: <Zap className="w-3.5 h-3.5 text-blue-400" />,
    GEMINI_ANALYSIS_COMPLETED: <Bot className="w-3.5 h-3.5 text-purple-400" />,
    RESOURCE_CONFLICT: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
    REALLOCATION_RECOMMENDED: <RefreshCw className="w-3.5 h-3.5 text-orange-400" />,
    OPERATOR_APPROVED: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
    OPERATOR_REJECTED: <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />,
  };
  return icons[eventType] || <Clock className="w-3.5 h-3.5 text-slate-400" />;
}

function TimelineEntry({ event }: { event: AiTimelineEvent }) {
  const cfg = getEventConfig(event.event_type);

  return (
    <div className="flex gap-3 relative group">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div
          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 transition-all`}
          style={{ borderColor: cfg.color, backgroundColor: `${cfg.color}15` }}
        >
          {getEventIcon(event.event_type)}
        </div>
        <div className="w-px flex-1 bg-white/10 mt-1" />
      </div>

      {/* Content */}
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className="font-space text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                style={{ color: cfg.color, backgroundColor: `${cfg.color}15` }}
              >
                {cfg.label}
              </span>
              {event.source && event.source !== 'SYSTEM' && (
                <span className="font-space text-[9px] text-slate-500 uppercase">via {event.source}</span>
              )}
            </div>
            <p className="font-space text-[11px] text-white font-bold mt-1 leading-tight">{event.title}</p>
            {event.description && (
              <p className="font-inter text-[10px] text-slate-400 mt-0.5 line-clamp-2">{event.description}</p>
            )}
          </div>
          <span className="font-mono text-[9px] text-slate-600 shrink-0 mt-1">
            {formatTime(event.occurred_at)}
          </span>
        </div>

        {/* Metadata tags */}
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {event.metadata.magnitude && (
              <span className="font-mono text-[9px] px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-slate-400">
                M{Number(event.metadata.magnitude).toFixed(1)}
              </span>
            )}
            {event.metadata.confidence && (
              <span className="font-mono text-[9px] px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-purple-400">
                Conf: {event.metadata.confidence}%
              </span>
            )}
            {event.metadata.model && (
              <span className="font-mono text-[9px] px-1.5 py-0.5 bg-purple-500/5 border border-purple-500/10 rounded text-purple-500">
                {event.metadata.model}
              </span>
            )}
            {event.metadata.matchedIncidentCount !== undefined && (
              <span className="font-mono text-[9px] px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-blue-400">
                {event.metadata.matchedIncidentCount} incident match(es)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AiEventTimeline({ incidentId, limit = 30, compact = false }: AiEventTimelineProps) {
  const { events, loading, refresh } = useAiEventTimeline({ incidentId, limit });

  return (
    <div className="glass-panel border-2 border-black p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-400" />
          <span className="font-archivo text-sm uppercase text-white font-bold tracking-tight">
            {incidentId ? 'INCIDENT TIMELINE' : 'AI OPERATIONS TIMELINE'}
          </span>
          {events.length > 0 && (
            <span className="font-space text-[10px] text-slate-500">{events.length} events</span>
          )}
        </div>
        <button
          onClick={refresh}
          className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition"
          title="Refresh timeline"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Timeline */}
      <div className={`overflow-y-auto ${compact ? 'max-h-64' : 'max-h-96'} pr-1 custom-scrollbar`}>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-white/5 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-white/5 rounded animate-pulse w-1/3" />
                  <div className="h-2 bg-white/5 rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="font-space text-[10px] text-slate-600 uppercase">No events yet</p>
            <p className="font-inter text-[10px] text-slate-700 mt-1">Events will appear as the system processes live data</p>
          </div>
        ) : (
          <div>
            {events.map((event) => (
              <TimelineEntry key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
