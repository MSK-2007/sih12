import React from 'react';
import { OperatorAttentionItem } from '../../services/controlCenter';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

interface Props {
  attentionItems: OperatorAttentionItem[];
  onOpenIncident: (id: string) => void;
  onOpenReallocation: () => void;
}

export const OperatorAttention: React.FC<Props> = ({
  attentionItems,
  onOpenIncident,
  onOpenReallocation,
}) => {
  if (attentionItems.length === 0) {
    return (
      <div className="glass-panel p-4 border border-emerald-500/30 flex items-center justify-between gap-3 bg-emerald-950/10">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <h3 className="font-space font-bold text-xs uppercase text-emerald-300">All Systems Operational</h3>
            <p className="font-space text-[11px] text-slate-400 mt-0.5">✓ Zero unassigned P1 emergencies or pending reallocation actions.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-4 border-2 border-[#FF4D00] bg-black space-y-3">
      <div className="flex items-center justify-between border-b border-white/20 pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#FF4D00] animate-pulse fill-[#FF4D00]" />
          <h2 className="font-archivo text-sm uppercase tracking-tight text-white">
            OPERATOR ATTENTION REQUIRED ({attentionItems.length})
          </h2>
        </div>
        <span className="font-space text-[10px] text-[#FF4D00] font-bold uppercase bg-[#FF4D00]/10 px-2.5 py-0.5 rounded-full border border-[#FF4D00]/30">
          ACTION REQUIRED
        </span>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {attentionItems.map((item) => (
          <div
            key={item.id}
            className={`p-3 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
              item.severity === 'CRITICAL'
                ? 'bg-red-950/30 border-red-500/40 text-red-200'
                : 'bg-black border-white/20 text-slate-300'
            }`}
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-archivo text-sm uppercase text-white">{item.title}</span>
                <span className="font-space text-[10px] text-slate-500">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="font-inter text-slate-400 text-[11px]">{item.message}</p>
            </div>

            <div className="shrink-0">
              {item.targetIncidentId ? (
                <button
                  onClick={() => onOpenIncident(item.targetIncidentId!)}
                  className="px-3.5 py-1.5 bg-[#FF4D00] hover:bg-white hover:text-black text-black rounded-full font-space font-bold text-[11px] uppercase transition flex items-center gap-1.5 shadow border border-black"
                >
                  Inspect Incident
                  <ArrowRight className="w-3 h-3" />
                </button>
              ) : item.type === 'REALLOCATION_RECOMMENDED' ? (
                <button
                  onClick={onOpenReallocation}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-full font-space font-bold text-[11px] uppercase transition flex items-center gap-1.5 shadow border border-black"
                >
                  Review Reallocation
                  <ArrowRight className="w-3 h-3" />
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
