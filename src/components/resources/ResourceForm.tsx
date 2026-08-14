import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateResourceInput, UpdateResourceInput, ResourceType, ResourceStatus } from '../../types/resource';
import { Resource } from '../../types/resource';
import { AlertCircle, Loader } from 'lucide-react';

interface Props {
  mode: 'create' | 'edit';
  initialData?: Resource;
  onSubmit: (data: CreateResourceInput | UpdateResourceInput) => Promise<boolean>;
}

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: 'AMBULANCE', label: 'Ambulance' },
  { value: 'FIRE_UNIT', label: 'Fire Unit' },
  { value: 'POLICE_UNIT', label: 'Police Unit' },
  { value: 'RESCUE_TEAM', label: 'Rescue Team' },
];

const INITIAL_STATUSES: ResourceStatus[] = ['AVAILABLE', 'OFFLINE'];

export const ResourceForm: React.FC<Props> = ({ mode, initialData, onSubmit }) => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    resourceCode: initialData?.resourceCode || '',
    name: initialData?.name || '',
    resourceType: (initialData?.resourceType || initialData?.type || 'AMBULANCE') as ResourceType,
    departmentId: initialData?.departmentId || '',
    capability: (initialData?.capability || initialData?.capabilities || []).join(', '),
    capacity: String(initialData?.capacity ?? 1),
    latitude: String(initialData?.latitude ?? 12.9716),
    longitude: String(initialData?.longitude ?? 77.5946),
    status: (initialData?.status || 'AVAILABLE') as ResourceStatus,
    isActive: initialData?.isActive ?? true,
  });

  const set = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (validationErrors[key]) {
      setValidationErrors((prev) => ({ ...prev, [key]: '' }));
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (mode === 'create' && !form.resourceCode.trim()) errors.resourceCode = 'Resource code is required.';
    if (!form.name.trim()) errors.name = 'Resource name is required.';
    if (!form.resourceType) errors.resourceType = 'Resource type is required.';
    const cap = Number(form.capacity);
    if (isNaN(cap) || cap < 0) errors.capacity = 'Capacity must be 0 or greater.';
    const lat = Number(form.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) errors.latitude = 'Latitude must be between -90 and 90.';
    const lng = Number(form.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) errors.longitude = 'Longitude must be between -180 and 180.';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    const caps = form.capability.split(',').map((c) => c.trim()).filter(Boolean);
    try {
      let success = false;
      if (mode === 'create') {
        success = await onSubmit({
          resourceCode: form.resourceCode.toUpperCase().trim(),
          name: form.name.trim(),
          resourceType: form.resourceType,
          departmentId: form.departmentId || undefined,
          capability: caps,
          capacity: Number(form.capacity),
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          status: form.status,
        } as CreateResourceInput);
      } else {
        success = await onSubmit({
          name: form.name.trim(),
          departmentId: form.departmentId || undefined,
          capability: caps,
          capacity: Number(form.capacity),
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          isActive: form.isActive,
        } as UpdateResourceInput);
      }
      if (success) {
        navigate('/resources');
      } else {
        setSubmitError('Operation failed. Please check your input and try again.');
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = (key: string) =>
    `w-full bg-slate-900 border rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition ${
      validationErrors[key]
        ? 'border-red-500 focus:ring-red-500'
        : 'border-slate-700/80 focus:border-emerald-500 focus:ring-emerald-500'
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {submitError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/20 border border-red-500/30 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {submitError}
        </div>
      )}

      <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-5">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-3">
          Unit Identification
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {mode === 'create' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Resource Code <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.resourceCode}
                onChange={(e) => set('resourceCode', e.target.value)}
                placeholder="e.g. AMB-07, FIRE-05"
                className={fieldClass('resourceCode')}
              />
              {validationErrors.resourceCode && (
                <p className="text-xs text-red-400 mt-1">{validationErrors.resourceCode}</p>
              )}
            </div>
          )}

          <div className={mode === 'create' ? '' : 'sm:col-span-2'}>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Unit Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Central ALS Ambulance 7"
              className={fieldClass('name')}
            />
            {validationErrors.name && <p className="text-xs text-red-400 mt-1">{validationErrors.name}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Resource Type <span className="text-red-400">*</span>
            </label>
            <select
              value={form.resourceType}
              disabled={mode === 'edit'}
              onChange={(e) => set('resourceType', e.target.value)}
              className={`${fieldClass('resourceType')} cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {RESOURCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {validationErrors.resourceType && (
              <p className="text-xs text-red-400 mt-1">{validationErrors.resourceType}</p>
            )}
          </div>

          {mode === 'create' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Initial Status</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className={`${fieldClass('status')} cursor-pointer`}
              >
                {INITIAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-5">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-3">
          Operational Capabilities
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Capacity (patients / personnel)</label>
            <input
              type="number"
              min={0}
              value={form.capacity}
              onChange={(e) => set('capacity', e.target.value)}
              className={fieldClass('capacity')}
            />
            {validationErrors.capacity && <p className="text-xs text-red-400 mt-1">{validationErrors.capacity}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Capability List <span className="text-slate-500">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={form.capability}
              onChange={(e) => set('capability', e.target.value)}
              placeholder="e.g. ADVANCED_LIFE_SUPPORT, EXTRICATION"
              className={fieldClass('capability')}
            />
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-5">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-3">
          Current Location (Manual GPS Entry)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Latitude (-90 to 90)</label>
            <input
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => set('latitude', e.target.value)}
              className={fieldClass('latitude')}
            />
            {validationErrors.latitude && <p className="text-xs text-red-400 mt-1">{validationErrors.latitude}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Longitude (-180 to 180)</label>
            <input
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => set('longitude', e.target.value)}
              className={fieldClass('longitude')}
            />
            {validationErrors.longitude && <p className="text-xs text-red-400 mt-1">{validationErrors.longitude}</p>}
          </div>
        </div>
      </div>

      {mode === 'edit' && (
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 border border-slate-700" />
          </label>
          <span className="text-sm text-slate-300">
            Unit is <strong className={form.isActive ? 'text-emerald-400' : 'text-red-400'}>{form.isActive ? 'Active' : 'Inactive'}</strong>
          </span>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-sm transition disabled:opacity-60 flex items-center gap-2"
        >
          {submitting && <Loader className="w-4 h-4 animate-spin" />}
          {mode === 'create' ? 'Register Resource Unit' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold text-sm transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
