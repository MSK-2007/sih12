import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, AlertTriangle, ShieldAlert, CheckCircle2, Globe, Radio } from 'lucide-react';
import { ExternalEvent } from '../../types/externalEvents';
import { getLatestEarthquakes, subscribeToEarthquakeRealtime, convertEarthquakeToIncident } from '../../services/earthquakeService';
import { SourceTypeBadge } from './LiveDataPanel';

interface LiveEarthquakesPanelProps {
  onEventConvertedToIncident?: () => void;
  onEarthquakesLoaded?: (events: ExternalEvent[]) => void;
}

export const LiveEarthquakesPanel: React.FC<LiveEarthquakesPanelProps> = ({
  onEventConvertedToIncident,
  onEarthquakesLoaded,
}) => {
  const [events, setEvents] = useState<ExternalEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [providerStatus, setProviderStatus] = useState<'ONLINE' | 'CACHED' | 'OFFLINE'>('ONLINE');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchEarthquakes = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await getLatestEarthquakes();
      setEvents(res.events);
      setProviderStatus(res.status);
      setLastUpdated(new Date().toLocaleTimeString());

      if (onEarthquakesLoaded) {
        onEarthquakesLoaded(res.events);
      }
    } catch (err) {
      console.error('[LiveEarthquakesPanel] Failed to fetch USGS data:', err);
      setErrorMessage('USGS live feed temporarily unavailable.');
      setProviderStatus('OFFLINE');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarthquakes();

    // Subscribe to Supabase Realtime for instant external_events pushes
    const unsubscribe = subscribeToEarthquakeRealtime((newEvent) => {
      setEvents((prev) => {
        const exists = prev.some((e) => e.sourceEventId === newEvent.sourceEventId);
        if (exists) return prev;
        const updated = [newEvent, ...prev];
        if (onEarthquakesLoaded) onEarthquakesLoaded(updated);
        return updated;
      });
      setLastUpdated(new Date().toLocaleTimeString());
    });

    // 5-minute fallback polling
    const interval = setInterval(fetchEarthquakes, 5 * 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleConvert = async (event: ExternalEvent) => {
    setConvertingId(event.id);
    try {
      await convertEarthquakeToIncident(event);
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, status: 'CONVERTED_TO_INCIDENT' } : e))
      );
      if (onEventConvertedToIncident) onEventConvertedToIncident();
    } catch (err) {
      console.error('[LiveEarthquakesPanel] Failed to convert event:', err);
    } finally {
      setConvertingId(null);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/40 text-xs">CRITICAL (&ge;7.0)</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold border border-orange-500/40 text-xs">HIGH (6.0–6.9)</span>;
      case 'MODERATE':
        return <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-bold border border-yellow-500/40 text-xs">MODERATE (5.0–5.9)</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded bg-lime-500/20 text-lime-400 font-bold border border-lime-500/40 text-xs">LOW (3.0–4.9)</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-500/20 text-slate-400 font-bold border border-slate-500/40 text-xs">INFORMATIONAL (&lt;3.0)</span>;
    }
  };

  const maxMagEvent = events.reduce((max, e) => (e.magnitude > (max?.magnitude || 0) ? e : max), events[0]);

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
              <h2 className="text-base font-bold tracking-tight text-white uppercase font-archivo">LIVE EXTERNAL EVENTS</h2>
              <SourceTypeBadge source="REAL_TIME" />
            </div>
            <p className="text-xs text-slate-400">USGS Real-Time Global Earthquake Hazards GeoJSON Ingestion</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {providerStatus === 'OFFLINE' && (
            <span className="px-2.5 py-1 bg-red-500/20 text-red-400 border border-red-500/40 rounded text-xs font-bold flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>USGS live feed temporarily unavailable.</span>
            </span>
          )}
          {providerStatus === 'ONLINE' && (
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-xs font-bold flex items-center space-x-1.5">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>SUPABASE REALTIME ACTIVE</span>
            </span>
          )}
          <button
            onClick={fetchEarthquakes}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 text-[11px] block">Earthquakes Detected</span>
          <span className="text-2xl font-black text-white">{events.length}</span>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 text-[11px] block">Highest Magnitude</span>
          <span className="text-2xl font-black text-amber-400">
            {maxMagEvent ? `M ${maxMagEvent.magnitude.toFixed(1)}` : 'N/A'}
          </span>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 text-[11px] block">Data Source</span>
          <span className="text-sm font-bold text-cyan-400 mt-1 block">USGS GeoJSON</span>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400 text-[11px] block">Last Data Update</span>
          <span className="text-sm font-bold text-slate-300 mt-1 block">{lastUpdated || 'Just now'}</span>
        </div>
      </div>

      {/* Earthquakes Feed Table */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Seismic Activity Log</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Prototype Severity Classification Rules Enabled</span>
        </div>

        {events.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            {errorMessage || 'No recent seismic events detected.'}
          </div>
        ) : (
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      M {event.magnitude.toFixed(1)}
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

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  {event.status === 'CONVERTED_TO_INCIDENT' ? (
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold rounded flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Incident Created</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleConvert(event)}
                      disabled={convertingId === event.id}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold flex items-center space-x-1 whitespace-nowrap transition shadow-sm"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{convertingId === event.id ? 'Processing...' : 'Review & Dispatch'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
