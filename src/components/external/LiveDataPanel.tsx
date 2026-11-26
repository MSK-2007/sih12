import React, { useEffect, useState } from 'react';
import {
  CloudRain,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Navigation,
  Radio,
  Cloud,
} from 'lucide-react';
import { WeatherObservation, EnvironmentalAlert, DataSourceType } from '../../types/externalData';
import { getLatestWeatherObservation } from '../../services/weatherService';
import {
  getImdAlerts,
  convertAlertToIncident,
  subscribeToEnvironmentalAlertsRealtime,
} from '../../services/environmentalAlertsService';

interface LiveDataPanelProps {
  onAlertConvertedToIncident?: () => void;
}

export const SourceTypeBadge: React.FC<{ source?: DataSourceType | string }> = ({
  source = 'MANUAL',
}) => {
  const badgeStyles: Record<string, string> = {
    REAL_TIME: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    HISTORICAL: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    SIMULATED: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    MANUAL: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    EXTERNAL_ALERT: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  };

  const currentStyle = badgeStyles[source] || badgeStyles.MANUAL;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${currentStyle}`}
    >
      {source}
    </span>
  );
};

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case 'CRITICAL':
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-500/20 text-red-400 border border-red-500/40 uppercase">
          CRITICAL
        </span>
      );
    case 'HIGH':
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-orange-500/20 text-orange-400 border border-orange-500/40 uppercase">
          HIGH
        </span>
      );
    case 'MODERATE':
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 uppercase">
          MODERATE
        </span>
      );
    default:
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-lime-500/20 text-lime-400 border border-lime-500/40 uppercase">
          LOW
        </span>
      );
  }
};

const ALERT_EMOJI: Record<string, string> = {
  HEAVY_RAIN: '🌧',
  FLOOD: '🌊',
  THUNDERSTORM: '⚡',
  CYCLONE: '🌀',
  HEATWAVE: '🌡️',
  FIRE_HAZARD: '🔥',
  SEVERE_WEATHER: '🌪',
};

export const LiveDataPanel: React.FC<LiveDataPanelProps> = ({ onAlertConvertedToIncident }) => {
  const [weather, setWeather] = useState<WeatherObservation | null>(null);
  const [weatherStatus, setWeatherStatus] = useState<'ONLINE' | 'CACHED' | 'STALE' | 'OFFLINE'>(
    'ONLINE'
  );
  const [alerts, setAlerts] = useState<EnvironmentalAlert[]>([]);
  const [imdStatus, setImdStatus] = useState<'ONLINE' | 'CACHED' | 'UNAVAILABLE' | 'OFFLINE'>(
    'ONLINE'
  );
  const [imdRegion, setImdRegion] = useState<string>('Bengaluru Urban, Karnataka');
  const [loading, setLoading] = useState<boolean>(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const fetchLiveData = async () => {
    setLoading(true);
    try {
      const [weatherRes, imdRes] = await Promise.all([
        getLatestWeatherObservation(),
        getImdAlerts({ district: 'Bengaluru Urban', state: 'Karnataka' }),
      ]);

      setWeather(weatherRes.observation);
      setWeatherStatus(weatherRes.status);
      setAlerts(imdRes.alerts);
      setImdStatus(imdRes.status);
      if (imdRes.monitoredRegion) setImdRegion(imdRes.monitoredRegion);
    } catch (err) {
      console.error('[LiveDataPanel] Error fetching live data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();

    // Realtime subscription for instant IMD alert pushes
    const unsubAlerts = subscribeToEnvironmentalAlertsRealtime((newAlert) => {
      setAlerts((prev) => {
        const exists = prev.some((a) => a.sourceAlertId === newAlert.sourceAlertId);
        if (exists) return prev;
        return [newAlert, ...prev];
      });
    });

    const interval = setInterval(fetchLiveData, 5 * 60 * 1000);
    return () => {
      unsubAlerts();
      clearInterval(interval);
    };
  }, []);

  const handleConvertAlert = async (alert: EnvironmentalAlert) => {
    setConvertingId(alert.id);
    try {
      await convertAlertToIncident(alert);
      if (onAlertConvertedToIncident) onAlertConvertedToIncident();
    } catch (err) {
      console.error('[LiveDataPanel] Failed to convert alert:', err);
    } finally {
      setConvertingId(null);
    }
  };

  const getWarningLevelBadge = (level: string) => {
    switch (level) {
      case 'RED':
        return (
          <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/40 text-xs">
            🔴 RED WARNING
          </span>
        );
      case 'ORANGE':
        return (
          <span className="px-2.5 py-1 rounded bg-orange-500/20 text-orange-400 font-bold border border-orange-500/40 text-xs">
            🟠 ORANGE WARNING
          </span>
        );
      case 'YELLOW':
        return (
          <span className="px-2.5 py-1 rounded bg-yellow-500/20 text-yellow-400 font-bold border border-yellow-500/40 text-xs">
            🟡 YELLOW WATCH
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40 text-xs">
            🟢 NORMAL
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
            <CloudRain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold tracking-tight text-white">
                IMD LIVE WEATHER & ALERTS
              </h2>
              <SourceTypeBadge source="REAL_TIME" />
            </div>
            <p className="text-xs text-slate-400">
              India Meteorological Department · Monitored Region:{' '}
              <strong className="text-slate-300">{imdRegion}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {imdStatus === 'ONLINE' && (
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-xs font-bold flex items-center space-x-1.5">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>REALTIME ACTIVE</span>
            </span>
          )}
          {imdStatus === 'CACHED' && (
            <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded text-xs font-bold">
              CACHED DATA
            </span>
          )}
          {(imdStatus === 'UNAVAILABLE' || imdStatus === 'OFFLINE') && (
            <span className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded text-xs font-bold flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3" />
              <span>IMD UNAVAILABLE</span>
            </span>
          )}
          {weatherStatus === 'STALE' && (
            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded text-xs font-bold animate-pulse">
              STALE DATA
            </span>
          )}
          <button
            onClick={fetchLiveData}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weather Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Nowcast Conditions
              </span>
              <h3 className="text-sm font-semibold text-white mt-0.5">
                {weather?.locationName || 'Bengaluru Urban'}
              </h3>
            </div>
            {weather && getWarningLevelBadge(weather.warningLevel)}
          </div>

          {weather ? (
            <div className="space-y-3">
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-extrabold text-white">{weather.temperature}°C</span>
                <span className="text-sm text-slate-400 font-medium">{weather.weatherCondition}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs border-t border-slate-800/80 pt-3 text-slate-300">
                <div>
                  <div className="text-slate-500">Rainfall</div>
                  <div className="font-semibold text-blue-400">{weather.rainfall} mm/h</div>
                </div>
                <div>
                  <div className="text-slate-500">Humidity</div>
                  <div className="font-semibold">{weather.humidity}%</div>
                </div>
                <div>
                  <div className="text-slate-500">Wind</div>
                  <div className="font-semibold">{weather.windSpeed} km/h</div>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                <span>
                  Source: <strong className="text-slate-400">{weather.source}</strong>
                </span>
                <span>Observed: {new Date(weather.observedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500">
              Loading weather nowcast...
            </div>
          )}
        </div>

        {/* Environmental Alerts Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 col-span-1 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Cloud className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">
                IMD Active Weather Warnings
              </h3>
              <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded">
                📡 REAL EXTERNAL DATA
              </span>
            </div>
            <span className="text-xs text-slate-400">{alerts.length} active warning(s)</span>
          </div>

          {alerts.length === 0 ? (
            <div className="py-6 text-center space-y-1">
              <div className="text-2xl">🟢</div>
              <p className="text-xs text-slate-400 font-medium">
                No active weather warnings for {imdRegion}
              </p>
              <p className="text-[10px] text-slate-600">
                {imdStatus === 'ONLINE'
                  ? 'IMD live feed checked — conditions normal'
                  : 'Data fetched from database cache'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-slate-900 border border-slate-800/90 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-sm">
                        {ALERT_EMOJI[alert.alertType] || '⛅'}
                      </span>
                      {getSeverityBadge(alert.severity)}
                      <span className="text-xs font-semibold text-white truncate max-w-[200px]">
                        {alert.title}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{alert.description}</p>
                    <div className="text-[10px] text-slate-500 flex flex-wrap gap-2">
                      <span>
                        Source: <strong className="text-slate-400">IMD</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Area: <strong className="text-slate-400">{alert.affectedArea}</strong>
                      </span>
                      {alert.expiresAt && (
                        <>
                          <span>•</span>
                          <span>
                            Expires:{' '}
                            <strong className="text-amber-400">
                              {new Date(alert.expiresAt).toLocaleTimeString()}
                            </strong>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleConvertAlert(alert)}
                    disabled={convertingId === alert.id}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded text-xs font-semibold flex items-center space-x-1 whitespace-nowrap transition shrink-0"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{convertingId === alert.id ? 'Creating...' : 'Create Incident'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Routing & Traffic Status */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <Navigation className="w-4 h-4 text-cyan-400" />
          <span>
            <strong>Routing Engine Status:</strong> OSRM Route Calculation Active
          </span>
        </div>
        <span className="text-amber-400/90 font-medium">
          Routing ETA — live traffic feed unconfigured. Using normal OSRM profile.
        </span>
      </div>
    </div>
  );
};
