import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { IncidentForm } from '../components/incidents/IncidentForm';
import { CreateIncidentInput } from '../types/incident';
import { createIncident } from '../services/incidents';
import { ArrowLeft, Shield } from 'lucide-react';

export const CreateIncidentPage: React.FC = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (input: CreateIncidentInput) => {
    setSubmitting(true);
    setError(null);
    try {
      const created = await createIncident(input);
      navigate(`/incidents/${created.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit incident report');
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 px-4 md:px-8 py-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2">
        <Link to="/incidents" className="text-[#FF4D00] hover:text-white transition">
          <ArrowLeft className="w-5 h-5 stroke-[3]" />
        </Link>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#FF4D00]" />
          <h1 className="font-archivo text-xl md:text-2xl text-white tracking-[-0.04em] uppercase">
            INTAKE EMERGENCY REPORT
          </h1>
        </div>
      </div>

      {error && (
        <div className="p-4 border-2 border-red-500 bg-red-950/40 text-red-300 font-space text-xs">
          {error}
        </div>
      )}

      <div className="glass-panel p-6 border-2 border-black">
        <IncidentForm onSubmit={handleSubmit} loading={submitting} />
      </div>
    </div>
  );
};
