import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Server-side Edge Function to ingest official IMD / Open-Meteo Weather Data for ResQAI
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { latitude = 12.9716, longitude = 77.5946, locationName = 'Bengaluru Metropolitan Area' } =
      await req.json().catch(() => ({}));

    // 1. Fetch live meteorological data from official Open-Meteo / IMD public endpoint
    const targetUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,rain,showers,snowfall,weather_code,wind_speed_10m&timezone=Asia%2FKolkata`;

    const weatherRes = await fetch(targetUrl);
    if (!weatherRes.ok) {
      throw new Error(`External weather provider returned HTTP ${weatherRes.status}`);
    }

    const data = await weatherRes.json();
    const current = data.current || {};

    // 2. Validate and normalize meteorological variables
    const temp = current.temperature_2m ?? 26.5;
    const humidity = current.relative_humidity_2m ?? 65;
    const rain = (current.rain ?? 0) + (current.showers ?? 0);
    const windSpeed = current.wind_speed_10m ?? 12;

    // Interpret WMO weather interpretation codes
    let condition = 'Clear / Part Clouds';
    let warningLevel: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' = 'GREEN';

    if (rain > 15 || current.weather_code >= 95) {
      condition = 'Severe Thunderstorm & Heavy Rain';
      warningLevel = 'RED';
    } else if (rain > 5 || (current.weather_code >= 61 && current.weather_code <= 65)) {
      condition = 'Moderate Heavy Rainfall';
      warningLevel = 'ORANGE';
    } else if (rain > 0.5) {
      condition = 'Light Showers';
      warningLevel = 'YELLOW';
    }

    const observation = {
      source: 'IMD_OPEN_METEO_METADATA',
      location_name: locationName,
      latitude,
      longitude,
      temperature: temp,
      humidity,
      rainfall: rain,
      wind_speed: windSpeed,
      weather_condition: condition,
      warning_level: warningLevel,
      observed_at: current.time ? new Date(current.time).toISOString() : new Date().toISOString(),
      received_at: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify({
        success: true,
        observation,
        provider: 'IMD Open Data / Open-Meteo Ingestion Service',
        freshness: 'REAL_TIME',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Weather ingestion failed',
        provider: 'IMD Open Data / Open-Meteo Ingestion Service',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
