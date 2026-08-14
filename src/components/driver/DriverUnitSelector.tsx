import React from 'react';
import { Resource, ResourceType } from '../../types/resource';
import { Truck, Shield, Flame, Radio, Activity, MapPin, CheckCircle } from 'lucide-react';
import { ResourceStatusBadge } from '../resources/ResourceStatusBadge';

interface Props {
  resources: Resource[];
  selectedResource: Resource | null;
  onSelectResource: (resource: Resource) => void;
}

export const DriverUnitSelector: React.FC<Props> = ({
  resources,
  selectedResource,
  onSelectResource,
}) => {
  const getIcon = (type: ResourceType) => {
    switch (type) {
      case 'AMBULANCE':
        return <Activity className="w-4 h-4 text-emerald-400" />;
      case 'FIRE_UNIT':
        return <Flame className="w-4 h-4 text-red-400" />;
      case 'POLICE_UNIT':
        return <Shield className="w-4 h-4 text-blue-400" />;
      case 'RESCUE_TEAM':
        return <Truck className="w-4 h-4 text-amber-400" />;
      default:
        return <Radio className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="glass-panel border-2 border-white/20 p-4 rounded-xl space-y-3 bg-black/80">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-[#FF4D00]" />
          <span className="font-archivo text-sm text-white uppercase tracking-wide">
            SELECT DRIVER RESPONDER UNIT
          </span>
        </div>
        <span className="text-[11px] font-space text-slate-400">
          {resources.length} UNITS REGISTERED IN FLEET
        </span>
      </div>

      {/* Responsive Horizontal Unit Cards Carousel / Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
        {resources.map((res) => {
          const isSelected = selectedResource?.id === res.id;
          return (
            <button
              key={res.id}
              onClick={() => onSelectResource(res)}
              className={`p-3 rounded-lg border text-left transition relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#FF4D00]/15 border-[#FF4D00] text-white shadow-lg ring-1 ring-[#FF4D00]'
                  : 'bg-white/5 border-white/10 hover:border-white/30 text-slate-300 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <div className="flex items-center gap-1.5 font-space font-bold text-xs">
                  {getIcon(res.resourceType)}
                  <span className={isSelected ? 'text-[#FF4D00]' : 'text-white'}>
                    {res.resourceCode}
                  </span>
                </div>
                {isSelected && <CheckCircle className="w-3.5 h-3.5 text-[#FF4D00]" />}
              </div>

              <div className="text-[11px] font-inter text-slate-300 truncate mb-2">
                {res.name}
              </div>

              <div className="flex items-center justify-between text-[10px] font-space text-slate-400 pt-1 border-t border-white/10">
                <ResourceStatusBadge status={res.status} />
                <span className="flex items-center gap-0.5 text-slate-400">
                  <MapPin className="w-2.5 h-2.5" />
                  {res.latitude.toFixed(2)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
