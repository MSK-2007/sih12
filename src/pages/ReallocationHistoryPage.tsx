import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useReallocation } from '../hooks/useReallocation';
import { ReallocationReviewModal } from '../components/reallocation/ReallocationReviewModal';
import { Clock, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { KineticPageHeader } from '../components/kinetic/KineticPageHeader';

export const ReallocationHistoryPage: React.FC = () => {
  const { history, analysis, loading, confirming, error, loadHistory, analyze, confirm, reject, clearAnalysis } =
    useReallocation();

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const statusBadge = (status: string) => {
    if (status === 'REALLOCATION_RECOMMENDED')
      return <span className="px-3 py-1 font-space text-[10px] font-bold rounded-full bg-amber-500 text-black">PENDING REVIEW</span>;
    if (status === 'NO_REALLOCATION_REQUIRED')
      return <span className="px-3 py-1 font-space text-[10px] font-bold rounded-full bg-emerald-500 text-black">NO ACTION NEEDED</span>;
    if (status === 'NO_FEASIBLE_REALLOCATION')
      return <span className="px-3 py-1 font-space text-[10px] font-bold rounded-full bg-red-600 text-white">NO FEASIBLE OPTION</span>;
    return <span className="px-3 py-1 font-space text-[10px] font-bold rounded-full bg-black text-white border border-white/20">{status.replace(/_/g, ' ')}</span>;
  };

  const isDev = import.meta.env.DEV;

  return (
    <div className="space-y-6 px-4 md:px-8 py-6 pb-12 animate-fade-in">
      {/* Kinetic Orange Brutalist Header */}
      <KineticPageHeader
        title="REALLOCATION LOG"
        subtitle="AUDIT LOG OF ALL DYNAMIC RESOURCE REALLOCATION ANALYSES AND QUALITY GAIN DECISIONS"
        marqueeText="DYNAMIC REALLOCATION"
        icon={<RefreshCw className="w-6 h-6" />}
        actions={
          <div className="flex items-center gap-2 font-space text-xs">
            <Link to="/incidents" className="p-2.5 bg-black border-2 border-black rounded-full text-white hover:bg-[#FF4D00] hover:text-black transition" title="Back to Incidents">
              <ArrowLeft className="w-4 h-4 stroke-[3]" />
            </Link>
            <button
              onClick={() => loadHistory()}
              className="px-4 py-2 bg-black border-2 border-black rounded-full text-white hover:bg-[#FF4D00] hover:text-black transition flex items-center gap-2 font-bold"
            >
              <RefreshCw className="w-4 h-4" />
              REFRESH
            </button>
            {isDev && (
              <button
                onClick={() => analyze()}
                disabled={loading}
                className="px-4 py-2 bg-[#FF4D00] text-black font-bold uppercase rounded-full hover:scale-105 transition flex items-center gap-2 border-2 border-black shadow"
                title="[DEV MODE ONLY] Trigger reallocation analysis"
              >
                <AlertTriangle className="w-4 h-4 stroke-[3]" />
                RUN ANALYSIS
              </button>
            )}
          </div>
        }
      />

      {/* History Table */}
      <div className="glass-panel border-2 border-black overflow-hidden">
        {history.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Clock className="w-8 h-8 text-[#FF4D00] mx-auto" />
            <p className="font-archivo text-base text-white uppercase">NO REALLOCATION EVENTS RECORDED</p>
            <p className="font-space text-xs text-slate-500">EVENTS POPULATE AUTOMATICALLY WHEN FLEET CONFLICTS OCCUR.</p>
          </div>
        ) : (
          <div className="overflow-x-auto font-space text-xs">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20 bg-black text-slate-400">
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider">TIME</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider">TRIGGER INCIDENT</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider">PRIORITY</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider">STATUS</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider">QUALITY Δ</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider">RESOURCES AFFECTED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-black">
                {history.map((rec) => (
                  <tr key={rec.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(rec.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 font-bold text-white">{rec.triggerIncidentNumber}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${rec.triggerPriorityLevel === 'CRITICAL' ? 'text-red-400' : rec.triggerPriorityLevel === 'HIGH' ? 'text-orange-400' : 'text-yellow-400'}`}>
                        {rec.triggerPriorityLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3">{statusBadge(rec.status)}</td>
                    <td className="px-4 py-3 font-bold">
                      <span className={rec.improvement > 0 ? 'text-emerald-400' : 'text-slate-400'}>
                        {rec.improvement > 0 ? '+' : ''}{rec.improvement} pts
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {rec.affectedResources.map((r) => r.resourceCode).join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {analysis && analysis.status === 'REALLOCATION_RECOMMENDED' && (
        <ReallocationReviewModal
          recommendation={analysis}
          confirming={confirming}
          error={error}
          onConfirm={confirm}
          onReject={reject}
          onClose={clearAnalysis}
        />
      )}
    </div>
  );
};

export default ReallocationHistoryPage;
