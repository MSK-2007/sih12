import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Hospital } from '../../types/hospital';
import { createHospitalDivIcon } from './MapMarkerUtils';
import { Bed, Activity, Phone } from 'lucide-react';

interface Props {
  hospital: Hospital;
  onSelect?: (hospital: Hospital) => void;
}

export const HospitalMarker: React.FC<Props> = ({ hospital, onSelect }) => {
  const icon = createHospitalDivIcon();
  const caps = hospital.emergencyCapability || [];

  return (
    <Marker
      position={[hospital.latitude, hospital.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => {
          if (onSelect) onSelect(hospital);
        },
      }}
    >
      <Popup className="resqai-leaflet-popup">
        <div className="p-1 space-y-2 max-w-xs text-slate-900">
          <div className="flex items-center justify-between gap-2 border-b pb-1.5 border-slate-200">
            <span className="font-bold text-xs text-blue-700 uppercase tracking-wider">HOSPITAL TRAUMA CENTER</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-blue-100 text-blue-800">
              {hospital.status}
            </span>
          </div>

          <div>
            <h4 className="font-bold text-sm text-slate-900 leading-tight">{hospital.name}</h4>
            <p className="text-xs text-slate-600 mt-0.5">{hospital.address}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2 rounded border border-slate-200">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Bed className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Available Beds: <strong>{hospital.availableBeds}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <Activity className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>ICU Beds: <strong>{hospital.icuAvailable}</strong></span>
            </div>
          </div>

          {caps.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {caps.map((c) => (
                <span key={c} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                  {c.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}

          {hospital.contactNumber && (
            <div className="pt-2 border-t border-slate-200 flex items-center gap-1.5 text-[11px] text-slate-600">
              <Phone className="w-3 h-3 text-slate-500" />
              <span>{hospital.contactNumber}</span>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
};
