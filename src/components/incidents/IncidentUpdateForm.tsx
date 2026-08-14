import React, { useState } from 'react';
import { IncidentStatus } from '../../types/incident';
import { Send } from 'lucide-react';

interface Props {
  currentStatus: IncidentStatus;
  onSubmit: (message: string, status: IncidentStatus) => Promise<void>;
}

export const IncidentUpdateForm: React.FC<Props> = ({ currentStatus, onSubmit }) => {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<IncidentStatus>(currentStatus);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please enter an update message');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(message.trim(), status);
      setMessage('');
    } catch (err: any) {
      setError(err?.message || 'Failed to post update');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Post Operational Update
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as IncidentStatus)}
          className="bg-slate-800 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-red-500 font-mono"
        >
          <option value="REPORTED">REPORTED</option>
          <option value="ANALYSING">ANALYSING</option>
          <option value="PRIORITIZED">PRIORITIZED</option>
          <option value="AWAITING_DISPATCH">AWAITING DISPATCH</option>
          <option value="DISPATCHED">DISPATCHED</option>
          <option value="IN_PROGRESS">IN PROGRESS</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="CLOSED">CLOSED</option>
        </select>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        placeholder="Enter field update note (e.g. 2 injured transported, fire contained)..."
        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
      />

      {error && <p className="text-xs text-red-400 font-medium">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || !message.trim()}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-3.5 h-3.5" />
          {submitting ? 'Posting...' : 'Post Update'}
        </button>
      </div>
    </form>
  );
};
