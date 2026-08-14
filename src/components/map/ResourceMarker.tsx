import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { Resource } from '../../types/resource';
import { createResourceDivIcon } from './MapMarkerUtils';
import { ShieldCheck, ArrowRight, Package } from 'lucide-react';

interface Props {
  resource: Resource;
  isSelected?: boolean;
  onSelect?: (resource: Resource) => void;
}

export const ResourceMarker: React.FC<Props> = ({ resource, isSelected = false, onSelect }) => {
  const type = resource.resourceType || resource.type || 'AMBULANCE';
  const icon = createResourceDivIcon(type, resource.status, isSelected);
  const caps = resource.capability || resource.capabilities || [];

  return (
    <Marker
      position={[resource.latitude, resource.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => {
          if (onSelect) onSelect(resource);
        },
      }}
    >
      <Popup className="resqai-leaflet-popup">
        <div className="p-1 space-y-2 max-w-xs text-slate-900">
          <div className="flex items-center justify-between gap-2 border-b pb-1.5 border-slate-200">
            <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
              {resource.resourceCode}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold text-white ${
                resource.status === 'AVAILABLE'
                  ? 'bg-emerald-600'
                  : resource.status === 'ASSIGNED'
                  ? 'bg-amber-500'
                  : resource.status === 'BUSY'
                  ? 'bg-red-600'
                  : 'bg-slate-600'
              }`}
            >
              {resource.status}
            </span>
          </div>

          <div>
            <h4 className="font-bold text-sm text-slate-900 leading-tight">{resource.name}</h4>
            <p className="text-xs text-slate-600 mt-0.5">{type.replace('_', ' ')}</p>
          </div>

          {caps.length > 0 && (
            <div className="flex items-start gap-1 text-[11px] text-slate-700">
              <Package className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
              <span className="line-clamp-1">{caps.join(', ').replace(/_/g, ' ')}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Cap: {resource.capacity}
            </span>
            <Link
              to={`/resources/${resource.id}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
            >
              View Unit
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};
