import { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Check } from 'lucide-react';
import { useOperationalLocation } from '../../context/OperationalLocationContext';

export function LocationSelector() {
  const { location, setLocation, availableLocations } = useOperationalLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/15 rounded-full hover:bg-white/10 hover:border-[#FF4D00]/40 transition group"
      >
        <MapPin className="w-3 h-3 text-[#FF4D00]" />
        <span className="font-space text-[10px] font-bold text-white uppercase tracking-wide max-w-[100px] truncate">
          {location.city}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 right-0 w-56 bg-black/95 border border-white/15 rounded-lg shadow-2xl z-[100] overflow-hidden backdrop-blur-xl">
          <div className="px-3 py-2 border-b border-white/10">
            <p className="font-space text-[9px] text-slate-500 uppercase tracking-widest">OPERATIONAL AREA</p>
          </div>

          <div className="py-1 max-h-64 overflow-y-auto custom-scrollbar">
            {availableLocations.map((loc) => {
              const isActive = loc.label === location.label;
              return (
                <button
                  key={loc.label}
                  onClick={() => {
                    setLocation(loc);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left transition ${
                    isActive
                      ? 'bg-[#FF4D00]/10 text-white'
                      : 'hover:bg-white/5 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className={`w-3 h-3 flex-shrink-0 ${isActive ? 'text-[#FF4D00]' : 'text-slate-500'}`} />
                    <div className="min-w-0">
                      <p className="font-space text-[11px] font-bold truncate">{loc.label}</p>
                      <p className="font-inter text-[9px] text-slate-500">{loc.state}</p>
                    </div>
                  </div>
                  {isActive && <Check className="w-3.5 h-3.5 text-[#FF4D00] flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="px-3 py-2 border-t border-white/10">
            <p className="font-inter text-[9px] text-slate-600 text-center">
              Location affects weather, alerts & environmental data
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
