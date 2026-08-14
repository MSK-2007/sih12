import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useIncident } from '../hooks/useIncident';
import { IncidentDetails } from '../components/incidents/IncidentDetails';
import { AlertCircle, RefreshCw, ArrowLeft, Radio } from 'lucide-react';

export const IncidentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { incident, loading, error, refetch, changeStatus } = useIncident(id);

  if (loading) {
    return (
      <div className="p-16 text-center max-w-4xl mx-auto font-space">
        <div className="w-8 h-8 border-2 border-[#FF4D00] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">LOADING INCIDENT DOSSIER...</p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center glass-panel border-2 border-red-500 my-12 font-space space-y-3">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="font-archivo text-xl text-white uppercase">INCIDENT NOT FOUND</h2>
        <p className="text-xs text-slate-400">{error || 'The requested incident ID does not exist.'}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-full bg-[#FF4D00] text-black text-xs font-bold uppercase inline-flex items-center gap-1.5 transition border border-black"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          RETRY LOADING
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 md:px-8 py-6 pb-12 animate-fade-in">
      <div className="flex items-center gap-2">
        <Link to="/incidents" className="text-[#FF4D00] hover:text-white transition">
          <ArrowLeft className="w-5 h-5 stroke-[3]" />
        </Link>
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-[#FF4D00] animate-pulse" />
          <h1 className="font-archivo text-xl md:text-2xl text-white tracking-[-0.04em] uppercase">
            INCIDENT DOSSIER: <span className="font-space text-[#FF4D00]">{incident.incidentNumber}</span>
          </h1>
        </div>
      </div>

      <IncidentDetails incident={incident} onStatusChange={changeStatus} />
    </div>
  );
};
