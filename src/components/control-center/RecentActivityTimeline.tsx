import React from 'react';
import { Activity } from 'lucide-react';

export interface ActivityItem {
  id: string;
  timeStr: string;
  incidentNumber: string;
  message: string;
  type: string;
}

interface Props {
  activities?: ActivityItem[];
}

const DEFAULT_ACTIVITIES: ActivityItem[] = [
  { id: 'a1', timeStr: 'Just now', incidentNumber: 'INC-1045', message: 'Reallocation recommendation calculated for critical structural collapse.', type: 'REALLOCATION' },
  { id: 'a2', timeStr: '3 min ago', incidentNumber: 'INC-1042', message: 'Unit AMB-07 dispatched to road accident site.', type: 'DISPATCH' },
  { id: 'a3', timeStr: '6 min ago', incidentNumber: 'INC-1045', message: 'Priority score classified CRITICAL (96/100) via Rule-Based Priority Engine.', type: 'PRIORITY' },
  { id: 'a4', timeStr: '12 min ago', incidentNumber: 'INC-1044', message: 'Incident reported via 112 emergency line.', type: 'INTAKE' },
];

export const RecentActivityTimeline: React.FC<Props> = ({ activities = DEFAULT_ACTIVITIES }) => {
  return (
    <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
            RECENT OPERATIONAL LOGS
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-500 uppercase">Live Audit Stream</span>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {activities.map((act) => (
          <div key={act.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
            <span className="font-mono text-[10px] text-slate-500 shrink-0 mt-0.5">{act.timeStr}</span>
            <div className="min-w-0">
              <span className="font-mono font-bold text-slate-200 mr-2">{act.incidentNumber}:</span>
              <span className="text-slate-300">{act.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
