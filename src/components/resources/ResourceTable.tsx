import React from 'react';
import { Link } from 'react-router-dom';
import { Resource } from '../../types/resource';
import { ResourceStatusBadge } from './ResourceStatusBadge';
import { ResourceTypeBadge } from './ResourceTypeBadge';
import { MapPin, Edit2, Eye, Users } from 'lucide-react';

interface Props {
  resources: Resource[];
  loading?: boolean;
}

export const ResourceTable: React.FC<Props> = ({ resources, loading }) => {
  if (loading) {
    return (
      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        <div className="divide-y divide-slate-800/60">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
              <div className="h-4 w-20 bg-slate-800 rounded" />
              <div className="h-4 flex-1 bg-slate-800 rounded" />
              <div className="h-4 w-24 bg-slate-800 rounded" />
              <div className="h-4 w-20 bg-slate-800 rounded" />
              <div className="h-4 w-16 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="glass-panel rounded-xl border border-slate-800 p-16 text-center">
        <p className="text-slate-400 text-sm font-medium">No resources found matching your filters.</p>
        <p className="text-slate-600 text-xs mt-1">Try adjusting your search or filter criteria.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60">
              <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Code</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Unit Name</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Type</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Capability</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Capacity</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">GPS</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {resources.map((resource) => {
              const caps = resource.capability || resource.capabilities || [];
              const type = resource.resourceType || resource.type || 'AMBULANCE';
              return (
                <tr key={resource.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs font-bold text-slate-100 bg-slate-900 px-2.5 py-1 rounded border border-slate-700">
                      {resource.resourceCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <Link
                      to={`/resources/${resource.id}`}
                      className="font-semibold text-white hover:text-emerald-400 transition leading-tight line-clamp-1"
                    >
                      {resource.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <ResourceTypeBadge type={type} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <ResourceStatusBadge status={resource.status} size="sm" />
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <div className="flex flex-wrap gap-1">
                      {caps.slice(0, 2).map((cap) => (
                        <span key={cap} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 font-mono">
                          {cap.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {caps.length > 2 && (
                        <span className="text-[10px] text-slate-500">+{caps.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center gap-1 text-slate-300 text-xs">
                      <Users className="w-3 h-3 text-cyan-400" />
                      {resource.capacity}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                      {resource.latitude.toFixed(3)}, {resource.longitude.toFixed(3)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition">
                      <Link
                        to={`/resources/${resource.id}`}
                        className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        to={`/resources/${resource.id}/edit`}
                        className="p-1.5 rounded-md bg-slate-800 hover:bg-emerald-900 text-slate-300 hover:text-emerald-400 transition"
                        title="Edit Resource"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
