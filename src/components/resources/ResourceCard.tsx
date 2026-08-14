import { Link } from 'react-router-dom';
import { Resource } from '../../types/resource';
import { ResourceStatusBadge } from './ResourceStatusBadge';
import { ResourceTypeBadge } from './ResourceTypeBadge';
import { MapPin, Users, ArrowRight, ShieldCheck } from 'lucide-react';

interface Props {
  resource: Resource;
}

export const ResourceCard: React.FC<Props> = ({ resource }) => {
  const caps = resource.capability || resource.capabilities || [];
  const type = resource.resourceType || resource.type || 'AMBULANCE';
  const isAvailable = resource.status === 'AVAILABLE';

  return (
    <div
      className={`glass-panel p-5 rounded-xl border transition-all duration-200 hover:border-slate-700 flex flex-col justify-between space-y-4 ${
        isAvailable ? 'border-emerald-900/40 bg-emerald-950/5' : 'border-slate-800'
      }`}
    >
      <div>
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-white bg-slate-800/90 px-2.5 py-1 rounded border border-slate-700">
              {resource.resourceCode}
            </span>
            <ResourceTypeBadge type={type} size="sm" />
          </div>
          <ResourceStatusBadge status={resource.status} size="sm" />
        </div>

        {/* Resource Name */}
        <h3 className="text-base font-bold text-white tracking-tight leading-snug hover:text-emerald-400 transition">
          <Link to={`/resources/${resource.id}`}>{resource.name}</Link>
        </h3>

        {/* Capabilities badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {caps.length > 0 ? (
            caps.map((cap) => (
              <span
                key={cap}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 font-mono border border-slate-800"
              >
                {cap.replace('_', ' ')}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-slate-500 italic">Standard Equipment</span>
          )}
        </div>

        {/* Details Grid */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Capacity: <strong className="text-slate-200">{resource.capacity}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 justify-end">
            <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="font-mono text-[11px] truncate">
              {resource.latitude.toFixed(3)}, {resource.longitude.toFixed(3)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-slate-400" />
          {resource.isActive ? 'Active Unit' : 'Inactive'}
        </span>
        <Link
          to={`/resources/${resource.id}`}
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 group"
        >
          View Details
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
        </Link>
      </div>
    </div>
  );
};
