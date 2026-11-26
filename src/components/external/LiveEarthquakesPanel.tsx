import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, AlertTriangle, ShieldAlert, CheckCircle2, Globe, Radio, Sparkles } from 'lucide-react';
import { ExternalEvent } from '../../types/externalEvents';
import { getLatestEarthquakes, subscribeToEarthquakeRealtime } from '../../services/earthquakeService';
import { getLatestFireEvents, subscribeToFireEventsRealtime } from '../../services/fireService';
import { SourceTypeBadge } from './LiveDataPanel';
import { ExternalEventAiModal } from './ExternalEventAiModal';

interface LiveEarthquakesPanelProps {
  onEventConvertedToIncident?: () => void;
  onEarthquakesLoaded?: (events: ExternalEvent[]) => void;
}

type EventFilterTab = 'ALL' | 'EARTHQUAKE' | 'FIRE';

export const LiveEarthquakesPanel: React.FC<LiveEarthquakesPanelProps> = ({
  onEventConvertedToIncident,
  onEarthquakesLoaded,
}) => {
  const [earthquakeEvents, setEarthquakeEvents] = useState<ExternalEvent[]>([]);
  const [fireEvents, setFireEvents] = useState<ExternalEvent[]>([]);
  const [activeTab, setActiveTab] = useState<EventFilterTab>('ALL');

  const [loading, setLoading] = useState<boolean>(true);
  const [firmsStatus, setFirmsStatus] = useState<'ONLINE' | 'CACHED' | 'UNAVAILABLE' | 'OFFLINE'>('ONLINE');
  const [firmsErrorMessage, setFirmsErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Gemini AI Analysis Modal State
  const [selectedEventForAi, setSelectedEventForAi] = useState<ExternalEvent | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

  const fetchAllEvents = async () => {
    setLoading(true);
    setFirmsErrorMessage(null);
    try {
      // 1. Fetch USGS Earthquakes
      const eqRes = await getLatestEarthquakes();
      setEarthquakeEvents(eqRes.events);

      // 2. Fetch NASA FIRMS Fire Events
      const fireRes = await getLatestFireEvents();
      setFireEvents(fireRes.events);
      if (!fireRes.success) {
        setFirmsStatus('UNAVAILABLE');
        setFirmsErrorMessage(fireRes.errorMessage || 'NASA FIRMS API key not configured.');
      } else {
        setFirmsStatus(fireRes.status as any);
      }

      setLastUpdated(new Date().toLocaleTimeString());

      if (onEarthquakesLoaded) {
        const combined = [...eqRes.events, ...fireRes.events];
        onEarthquakesLoaded(combined);
      }
    } catch (err) {
      console.error('[LiveEarthquakesPanel] Error fetching external feeds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllEvents();

    // Subscribe to Supabase Realtime for USGS Earthquakes
    const unsubEarthquakes = subscribeToEarthquakeRealtime((newEvent) => {
      setEarthquakeEvents((prev) => {
        const exists = prev.some((e) => e.sourceEventId === newEvent.sourceEventId);
        if (exists) return prev;
        return [newEvent, ...prev];
      });
      setLastUpdated(new Date().toLocaleTimeString());
    });

    // Subscribe to Supabase Realtime for NASA FIRMS Fires
    const unsubFirms = subscribeToFireEventsRealtime((newFire) => {
      setFireEvents((prev) => {
        const exists = prev.some((e) => e.sourceEventId === newFire.sourceEventId);
        if (exists) return prev;
        return [newFire, ...prev];
      });
      setLastUpdated(new Date().toLocaleTimeString());
    });

    // 5-minute fallback polling
    const interval = setInterval(fetchAllEvents, 5 * 60 * 1000);

    return () => {
      unsubEarthquakes();
      unsubFirms();
      clearInterval(interval);
    };
  }, []);

  const openAiModal = (event: ExternalEvent) => {
    setSelectedEventForAi(event);
    setIsAiModalOpen(true);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/40 text-[10px] uppercase">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold border border-orange-500/40 text-[10px] uppercase">HIGH</span>;
      case 'MODERATE':
        return <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-bold border border-yellow-500/40 text-[10px] uppercase">MODERATE</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded bg-lime-500/20 text-lime-400 font-bold border border-lime-500/40 text-[10px] uppercase">LOW</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-500/20 text-slate-400 font-bold border border-slate-500/40 text-[10px] uppercase">INFO</span>;
    }
  };

  // Combine and filter events
  const combinedEvents = [...earthquakeEvents, ...fireEvents].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  const filteredEvents = combinedEvents.filter((ev) => {
    if (activeTab === 'EARTHQUAKE') return ev.source === 'USGS' || ev.eventType === 'EARTHQUAKE';
    if (activeTab === 'FIRE') return ev.source === 'NASA_FIRMS' || ev.eventType === 'FIRE';
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100 space-y-5 font-inter">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
            <Globe className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold tracking-tight text-white uppercase font-archivo">LIVE EXTERNAL EVENTS CENTER</h2>
              <SourceTypeBadge source="REAL_TIME" />
            </div>
            <p className="text-xs text-slate-400">Integrated USGS Seismic & NASA FIRMS Satellite Active Fire Ingestion</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-xs font-bold flex items-center space-x-1.5">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>REALTIME ACTIVE</span>
          </span>
          <button
            onClick={fetchAllEvents}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Source Unavailable Warning Notice */}
      {firmsStatus === 'UNAVAILABLE' && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 flex items-start space-x-2.5 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold text-amber-200">🔥 NASA FIRMS Source Status Notice</strong>
            <p className="text-[11px] text-amber-300/90 mt-0.5">
              {firmsErrorMessage || 'FIRMS_MAP_KEY secret not configured in Supabase Edge Function secrets. USGS Earthquakes remain 100% active.'}
            </p>
          </div>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 text-[11px] block">Total Live Events</span>
          <span className="text-2xl font-black text-white">{combinedEvents.length}</span>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 text-[11px] block">🌍 USGS Earthquakes</span>
          <span className="text-2xl font-black text-amber-400">{earthquakeEvents.length}</span>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 text-[11px] block">🔥 NASA FIRMS Active Fires</span>
          <span className="text-2xl font-black text-orange-400">{fireEvents.length}</span>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 text-[11px] block">Last Data Update</span>
          <span className="text-sm font-bold text-slate-300 mt-1 block">{lastUpdated || 'Just now'}</span>
        </div>
      </div>

      {/* Filter Tabs & Feed Table */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Live External Events Activity Log</h3>
          </div>

          {/* Filter Tab Buttons */}
          <div className="flex items-center space-x-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                activeTab === 'ALL' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              ALL ({combinedEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('EARTHQUAKE')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1 transition ${
                activeTab === 'EARTHQUAKE' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🌍 USGS ({earthquakeEvents.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('FIRE')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1 transition ${
                activeTab === 'FIRE' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🔥 NASA FIRMS ({fireEvents.length})</span>
            </button>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            {loading ? 'Ingesting latest external hazard data...' : 'No events detected for selected filter.'}
          </div>
        ) : (
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {filteredEvents.map((event) => {
              const isFire = event.source === 'NASA_FIRMS' || event.eventType === 'FIRE';
              return (
                <div
                  key={event.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                        isFire
                          ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}>
                        {isFire ? '🔥 NASA FIRMS' : '🌍 USGS'}
                      </span>

                      <span className="font-mono text-xs font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                        {isFire ? `FRP: ${event.magnitude.toFixed(1)} MW` : `M ${event.magnitude.toFixed(1)}`}
                      </span>

                      {getSeverityBadge(event.severity)}

                      <span className="text-xs font-semibold text-white truncate max-w-xs">{event.title}</span>
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center space-x-3">
                      <span>Lat: {event.latitude.toFixed(3)}°, Lon: {event.longitude.toFixed(3)}°</span>
                      <span>•</span>
                      <span>Time: {new Date(event.occurredAt).toLocaleTimeString()}</span>
                      <span>•</span>
                      <span>Status: <strong className="text-cyan-400">{event.status}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end shrink-0">
                    <button
                      onClick={() => openAiModal(event)}
                      className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-xs font-semibold flex items-center space-x-1 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>AI Analysis</span>
                    </button>

                    {event.status === 'CONVERTED_TO_INCIDENT' ? (
                      <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold rounded flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Incident Created</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => openAiModal(event)}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold flex items-center space-x-1 whitespace-nowrap transition shadow-sm"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Review & Dispatch</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Gemini AI Context Analysis Modal */}
      <ExternalEventAiModal
        event={selectedEventForAi}
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onIncidentCreated={() => {
          if (onEventConvertedToIncident) onEventConvertedToIncident();
          fetchAllEvents();
        }}
      />
    </div>
  );
};
