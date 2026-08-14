import React, { useState } from 'react';
import { Resource } from '../../types/resource';
import { Incident } from '../../types/incident';
import { FileText, Send, Plus, Minus } from 'lucide-react';

interface Props {
  resource: Resource;
  incident: Incident | null;
}

interface LogEntry {
  id: string;
  timestamp: string;
  author: string;
  text: string;
  category: 'STATUS' | 'VICTIM' | 'HAZARD' | 'GENERAL';
}

export const DriverFieldNotesPanel: React.FC<Props> = ({ resource, incident }) => {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: '1',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      author: `${resource.resourceCode} Driver`,
      text: 'Acknowledged dispatch order. Vehicle rolling with siren 10-33.',
      category: 'STATUS',
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      author: `${resource.resourceCode} Driver`,
      text: 'Arrived at scene. Initiated triage perimeter and initial assessment.',
      category: 'GENERAL',
    },
  ]);

  const [noteText, setNoteText] = useState('');
  const [victimCount, setVictimCount] = useState(incident?.peopleAffected || 0);

  const QUICK_TEMPLATES = [
    'Patient stabilized with CPR & IV fluids',
    'Hydraulic jaws of life deployed for extrication',
    'En route to Apex City Trauma Center',
    'Requesting additional Police traffic control',
    'Hazmat spill contained, perimeter secure',
  ];

  const handleAddLog = (textToAdd?: string) => {
    const text = textToAdd || noteText.trim();
    if (!text) return;

    const newEntry: LogEntry = {
      id: String(Date.now()),
      timestamp: new Date().toISOString(),
      author: `${resource.resourceCode} Driver`,
      text,
      category: 'STATUS',
    };

    setLogs((prev) => [newEntry, ...prev]);
    if (!textToAdd) setNoteText('');
  };

  return (
    <div className="glass-panel border-2 border-white/20 p-5 rounded-xl space-y-4 bg-black/80">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#FF4D00]" />
          <div>
            <h3 className="font-archivo text-sm text-white uppercase">DRIVER FIELD NOTES & ON-SCENE LOG</h3>
            <p className="font-space text-[11px] text-slate-400">
              LOG SITUATION UPDATES DIRECTLY TO OPERATIONAL CONTROL ROOM
            </p>
          </div>
        </div>

        {/* Patient / Victim Counter */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg font-space text-xs">
          <span className="text-slate-400 text-[10px] uppercase">SECURED VICTIMS:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVictimCount((v) => Math.max(0, v - 1))}
              className="p-1 rounded bg-black border border-white/20 text-white hover:bg-[#FF4D00] hover:text-black transition"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="font-bold text-[#FF4D00] text-sm w-4 text-center">{victimCount}</span>
            <button
              onClick={() => setVictimCount((v) => v + 1)}
              className="p-1 rounded bg-black border border-white/20 text-white hover:bg-[#FF4D00] hover:text-black transition"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Field Update Templates */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-space text-slate-400 uppercase">QUICK TACTICAL UPDATE CHIPS</label>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              onClick={() => handleAddLog(tmpl)}
              className="px-2.5 py-1 rounded bg-white/5 border border-white/10 hover:border-[#FF4D00] hover:bg-[#FF4D00]/10 text-slate-300 hover:text-white font-space text-[11px] transition text-left"
            >
              + {tmpl}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddLog()}
          placeholder="Type on-scene situation update..."
          className="flex-1 bg-black/60 border-2 border-white/20 focus:border-[#FF4D00] text-white px-3 py-2 rounded-lg font-space text-xs outline-none"
        />
        <button
          onClick={() => handleAddLog()}
          className="px-4 py-2 bg-[#FF4D00] text-black font-space font-bold text-xs uppercase rounded-lg hover:scale-105 transition flex items-center gap-1.5 border border-black shadow-md"
        >
          <Send className="w-4 h-4" /> LOG UPDATE
        </button>
      </div>

      {/* Log Feed Timeline */}
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {logs.map((entry) => (
          <div key={entry.id} className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-1">
            <div className="flex items-center justify-between text-[10px] font-space text-slate-400">
              <span className="text-[#FF4D00] font-bold">{entry.author}</span>
              <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="text-white font-inter text-xs leading-relaxed">{entry.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
