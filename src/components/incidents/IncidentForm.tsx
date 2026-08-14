import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateIncidentInput, EmergencyType, InjuryLevel } from '../../types/incident';
import { AlertCircle, MapPin, Save, ArrowLeft } from 'lucide-react';

interface Props {
  onSubmit: (input: CreateIncidentInput) => Promise<void>;
  loading?: boolean;
}

export const IncidentForm: React.FC<Props> = ({ onSubmit, loading = false }) => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<CreateIncidentInput>({
    title: '',
    emergencyType: 'ROAD_ACCIDENT',
    description: '',
    address: '',
    latitude: 12.9716,
    longitude: 77.5946,
    peopleAffected: 1,
    injuryLevel: 'MODERATE',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.title.trim()) {
      errs.title = 'Title is required';
    }

    if (!formData.emergencyType) {
      errs.emergencyType = 'Emergency type is required';
    }

    if (!formData.description.trim()) {
      errs.description = 'Description is required';
    }

    if (!formData.address.trim()) {
      errs.address = 'Location address is required';
    }

    if (isNaN(formData.peopleAffected) || formData.peopleAffected < 0) {
      errs.peopleAffected = 'People affected must be 0 or greater';
    }

    if (isNaN(formData.latitude) || formData.latitude < -90 || formData.latitude > 90) {
      errs.latitude = 'Latitude must be between -90 and 90';
    }

    if (isNaN(formData.longitude) || formData.longitude < -180 || formData.longitude > 180) {
      errs.longitude = 'Longitude must be between -180 and 180';
    }

    if (!formData.injuryLevel) {
      errs.injuryLevel = 'Injury level is required';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-xl border border-slate-800 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Report New Emergency Incident</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Log emergency report into the control room database
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/incidents')}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Title */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Incident Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. 3-Vehicle Crash at Silk Board Junction"
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
          />
          {errors.title && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.title}</p>}
        </div>

        {/* Emergency Type */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Emergency Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.emergencyType}
            onChange={(e) => setFormData({ ...formData, emergencyType: e.target.value as EmergencyType })}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500"
          >
            <option value="ROAD_ACCIDENT">Road Accident</option>
            <option value="FIRE">Fire</option>
            <option value="MEDICAL">Medical</option>
            <option value="FLOOD">Flood</option>
            <option value="BUILDING_COLLAPSE">Building Collapse</option>
            <option value="NATURAL_DISASTER">Natural Disaster</option>
            <option value="INDUSTRIAL_ACCIDENT">Industrial Accident</option>
            <option value="OTHER">Other</option>
          </select>
          {errors.emergencyType && <p className="text-xs text-red-400 mt-1">{errors.emergencyType}</p>}
        </div>

        {/* Injury Level */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Injury Severity Level <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.injuryLevel}
            onChange={(e) => setFormData({ ...formData, injuryLevel: e.target.value as InjuryLevel })}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500"
          >
            <option value="CRITICAL">Critical Injuries (Life Threatening)</option>
            <option value="SEVERE">Severe Injuries</option>
            <option value="MODERATE">Moderate Injuries</option>
            <option value="MINOR">Minor Injuries</option>
            <option value="NONE">No Injuries Reported</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
          {errors.injuryLevel && <p className="text-xs text-red-400 mt-1">{errors.injuryLevel}</p>}
        </div>

        {/* People Affected */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            People Affected <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={0}
            value={formData.peopleAffected}
            onChange={(e) => setFormData({ ...formData, peopleAffected: parseInt(e.target.value) || 0 })}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500"
          />
          {errors.peopleAffected && <p className="text-xs text-red-400 mt-1">{errors.peopleAffected}</p>}
        </div>

        {/* Location Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Location Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Address / Landmark..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>
          {errors.address && <p className="text-xs text-red-400 mt-1">{errors.address}</p>}
        </div>

        {/* Latitude & Longitude */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Latitude (-90 to 90) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.0001"
            value={formData.latitude}
            onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3.5 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-red-500"
          />
          {errors.latitude && <p className="text-xs text-red-400 mt-1">{errors.latitude}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Longitude (-180 to 180) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.0001"
            value={formData.longitude}
            onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3.5 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-red-500"
          />
          {errors.longitude && <p className="text-xs text-red-400 mt-1">{errors.longitude}</p>}
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Full Description <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter situation details, reported hazards, caller notes..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
          />
          {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description}</p>}
        </div>
      </div>

      {/* Form Action Footer */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => navigate('/incidents')}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Creating Incident...' : 'Submit Emergency Report'}
        </button>
      </div>
    </form>
  );
};
