import React, { useState } from 'react';
import { Resource, ResourceType } from '../../types/resource';
import { ResourceStatusBadge } from '../resources/ResourceStatusBadge';
import { ResourceTypeBadge } from '../resources/ResourceTypeBadge';
import { Truck, MapPin, Search } from 'lucide-react';

interface Props {
  resources: Resource[];
  onSelectResource: (resource: Resource) => void;
  selectedResource: Resource | null;
}

export const DriverFleetOverviewPanel: React.FC<Props> = ({
  resources,
  onSelectResource,
  selectedResource,
}) => {
  const [filterType, setFilterType] = useState<ResourceType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const filtered = resources.filter((r) => {
    if (filterType !== 'ALL' && r.resourceType !== filterType) return false;
    if (search && !r.resourceCode.toLowerCase().includes(search.toLowerCase()) && !r.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="glass-panel border-2 border-white/20 p-5 rounded-xl space-y-4 bg-black/80">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <h3 className="font-archivo text-base text-white uppercase flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#FF4D00]" /> FLEET-WIDE DRIVER RESPONDER UNITS
          </h3>
          <p className="font-space text-xs text-slate-400">
            MONITOR REALTIME FLEET STATUS, RESPONDER CAPABILITIES, AND LOCATION COORDINATES
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code or unit..."
              className="bg-black/60 border border-white/20 focus:border-[#FF4D00] text-white pl-8 pr-3 py-1.5 rounded-lg font-space text-xs outline-none w-44"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-black/60 border border-white/20 text-white px-2.5 py-1.5 rounded-lg font-space text-xs outline-none"
          >
            <option value="ALL">ALL TYPES</option>
            <option value="AMBULANCE">AMBULANCES</option>
            <option value="FIRE_UNIT">FIRE UNITS</option>
            <option value="POLICE_UNIT">POLICE UNITS</option>
            <option value="RESCUE_TEAM">RESCUE TEAMS</option>
          </select>
        </div>
      </div>

      {/* Grid of All Units */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((r) => {
          const isSelected = selectedResource?.id === r.id;
          return (
            <div
              key={r.id}
              onClick={() => onSelectResource(r)}
              className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-3 ${
                isSelected
                  ? 'bg-[#FF4D00]/15 border-[#FF4D00] shadow-lg ring-1 ring-[#FF4D00]'
                  : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-space font-bold text-sm text-white">
                  <span>{r.resourceCode}</span>
                  <ResourceTypeBadge type={r.resourceType} />
                </div>
                <ResourceStatusBadge status={r.status} />
              </div>

              <div>
                <div className="text-xs font-medium text-white">{r.name}</div>
                <div className="text-[11px] text-slate-400 font-space mt-1">
                  Capabilities: {r.capability.join(', ')}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-space text-slate-400 pt-2 border-t border-white/10">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#FF4D00]" />
                  {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                </span>
                <span className="text-[#FF4D00] font-bold text-[10px] uppercase">
                  {isSelected ? 'ACTIVE UNIT' : 'CLICK TO SELECT'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
