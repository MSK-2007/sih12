import { supabase, isSupabaseConfigured, markBackendLive, markBackendOffline } from './supabase';
import { WeatherObservation } from '../types/externalData';

const DEFAULT_WEATHER: WeatherObservation = {
  id: 'weather-default-01',
  source: 'IMD_OPEN_DATA',
  locationName: 'Bengaluru Command Sector',
  latitude: 12.9716,
  longitude: 77.5946,
  temperature: 27.2,
  humidity: 78,
  rainfall: 18.5, // mm/hr - Heavy rain
  windSpeed: 16.4,
  weatherCondition: 'Heavy Monsoon Downpour',
  warningLevel: 'ORANGE',
  observedAt: new Date().toISOString(),
  receivedAt: new Date().toISOString(),
  isStale: false,
};

/**
 * Fetches latest weather observation with server-side fallback resilience.
 */
export async function getLatestWeatherObservation(
  lat: number = 12.9716,
  lng: number = 77.5946
): Promise<{ observation: WeatherObservation; status: 'ONLINE' | 'CACHED' | 'STALE' | 'OFFLINE' }> {
  if (isSupabaseConfigured) {
    try {
      // 1. Try calling Supabase Edge Function ingest-weather
      const { data, error } = await supabase.functions.invoke('ingest-weather', {
        body: { latitude: lat, longitude: lng, locationName: 'Bengaluru Metropolitan Area' },
      });

      if (!error && data?.success && data.observation) {
        markBackendLive();
        const obs = data.observation;
        const normalized: WeatherObservation = {
          id: obs.id || `weather-${Date.now()}`,
          source: obs.source || 'IMD_OPEN_METEO',
          locationName: obs.location_name || 'Bengaluru Urban Sector',
          latitude: obs.latitude,
          longitude: obs.longitude,
          temperature: Number(obs.temperature),
          humidity: Number(obs.humidity),
          rainfall: Number(obs.rainfall),
          windSpeed: Number(obs.wind_speed),
          weatherCondition: obs.weather_condition,
          warningLevel: obs.warning_level || 'GREEN',
          observedAt: obs.observed_at,
          receivedAt: obs.received_at,
          isStale: false,
        };

        // Best-effort persistence to Supabase weather_observations table (only if authenticated or permitted by RLS)
        try {
          await supabase.from('weather_observations').insert({
            source: normalized.source,
            location_name: normalized.locationName,
            latitude: normalized.latitude,
            longitude: normalized.longitude,
            temperature: normalized.temperature,
            humidity: normalized.humidity,
            rainfall: normalized.rainfall,
            wind_speed: normalized.windSpeed,
            weather_condition: normalized.weatherCondition,
            warning_level: normalized.warningLevel,
            observed_at: normalized.observedAt,
          });
        } catch {
          // ignore if RLS rejects client anon insert
        }

        return { observation: normalized, status: 'ONLINE' };
      }
    } catch (err) {
      console.warn('[WeatherService] Server ingestion unavailable, falling back to DB cache:', err);
    }

    // 2. Try querying Supabase weather_observations table
    try {
      const { data: dbRows, error: dbErr } = await supabase
        .from('weather_observations')
        .select('*')
        .order('observed_at', { ascending: false })
        .limit(1);

      if (!dbErr && dbRows && dbRows.length > 0) {
        markBackendLive();
        const row = dbRows[0];
        const observedTime = new Date(row.observed_at).getTime();
        const ageMinutes = (Date.now() - observedTime) / 60000;
        const isStale = ageMinutes > 30;

        return {
          observation: {
            id: row.id,
            source: row.source,
            locationName: row.location_name,
            latitude: row.latitude,
            longitude: row.longitude,
            temperature: Number(row.temperature),
            humidity: Number(row.humidity),
            rainfall: Number(row.rainfall),
            windSpeed: Number(row.wind_speed),
            weatherCondition: row.weather_condition,
            warningLevel: row.warning_level,
            observedAt: row.observed_at,
            receivedAt: row.received_at,
            isStale,
          },
          status: isStale ? 'STALE' : 'CACHED',
        };
      }
      if (dbErr) markBackendOffline(dbErr.message);
    } catch (dbErr) {
      markBackendOffline(dbErr instanceof Error ? dbErr.message : 'Weather DB query failed');
      console.warn('[WeatherService] DB query failed:', dbErr);
    }
  }

  // 3. Offline Fallback (Never pretends to be ONLINE)
  return {
    observation: {
      ...DEFAULT_WEATHER,
      observedAt: new Date(Date.now() - 5 * 60000).toISOString(),
      isStale: true,
    },
    status: 'OFFLINE',
  };
}
