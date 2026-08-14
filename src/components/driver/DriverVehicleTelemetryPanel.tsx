import React, { useState } from 'react';
import { Resource } from '../../types/resource';
import { Gauge, Zap, Fuel, Activity, Wrench, Shield, CheckSquare, Square } from 'lucide-react';

interface Props {
  resource: Resource;
}

export const DriverVehicleTelemetryPanel: React.FC<Props> = ({ resource }) => {
  const [equipmentList, setEquipmentList] = useState([
    { name: 'Cardiac Defibrillator / ECG Monitor', checked: true },
    { name: 'Medical Oxygen Tank (2000 PSI)', checked: true },
    { name: 'Hydraulic Cutter / Extrication Jaws', checked: true },
    { name: 'Pediatric & Adult Resuscitation Kit', checked: true },
    { name: 'GPS Telemetry & Radio Transceiver', checked: true },
    { name: 'Hazmat Protective Gear & Respirators', checked: false },
  ]);

  const toggleEquipment = (idx: number) => {
    setEquipmentList((prev) =>
      prev.map((eq, i) => (i === idx ? { ...eq, checked: !eq.checked } : eq))
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Vehicle Telemetry & Health Gauges */}
      <div className="glass-panel border-2 border-white/20 p-5 rounded-xl space-y-4 bg-black/80">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <Gauge className="w-5 h-5 text-[#FF4D00]" />
          <div>
            <h3 className="font-archivo text-sm text-white uppercase">VEHICLE TELEMETRY & ENGINE READINESS</h3>
            <p className="font-space text-[11px] text-slate-400">UNIT CALL SIGN: {resource.resourceCode}</p>
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 font-space text-xs">
          <div className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-1">
            <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
              <Fuel className="w-3.5 h-3.5 text-amber-400" /> FUEL / BATTERY TANK
            </div>
            <div className="text-xl font-bold text-white">88%</div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-amber-400 h-full rounded-full" style={{ width: '88%' }} />
            </div>
          </div>

          <div className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-1">
            <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-cyan-400" /> ALTERNATOR & SYS POWER
            </div>
            <div className="text-xl font-bold text-cyan-400">14.2 V</div>
            <div className="text-[10px] text-emerald-400 font-bold">OPTIMAL CHARGE</div>
          </div>

          <div className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-1">
            <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" /> OXYGEN / PUMP PRESSURE
            </div>
            <div className="text-xl font-bold text-emerald-400">1950 PSI</div>
            <div className="text-[10px] text-emerald-400 font-bold">FULL TANK READY</div>
          </div>

          <div className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-1">
            <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5 text-purple-400" /> SHIFT HOURS / ODOMETER
            </div>
            <div className="text-xl font-bold text-white">4.2 HR</div>
            <div className="text-[10px] text-slate-400">NEXT SERVICE: 120 HR</div>
          </div>
        </div>
      </div>

      {/* Equipment Inspection Checklist */}
      <div className="glass-panel border-2 border-white/20 p-5 rounded-xl space-y-4 bg-black/80">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <Shield className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="font-archivo text-sm text-white uppercase">PRE-SHIFT EQUIPMENT CHECKLIST</h3>
            <p className="font-space text-[11px] text-slate-400">VERIFY ESSENTIAL ONBOARD RESPONDER GEAR</p>
          </div>
        </div>

        <div className="space-y-2">
          {equipmentList.map((eq, i) => (
            <button
              key={i}
              onClick={() => toggleEquipment(i)}
              className={`w-full p-2.5 rounded-lg border font-space text-xs flex items-center justify-between transition text-left ${
                eq.checked
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <span>{eq.name}</span>
              {eq.checked ? (
                <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
