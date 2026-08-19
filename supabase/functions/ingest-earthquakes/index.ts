import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function classifyEarthquakeSeverity(mag: number): 'INFORMATIONAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
  if (mag >= 7.0) return 'CRITICAL';
  if (mag >= 6.0) return 'HIGH';
  if (mag >= 5.0) return 'MODERATE';
  if (mag >= 3.0) return 'LOW';
  return 'INFORMATIONAL';
}

/**
 * Server-side Edge Function to ingest official USGS real-time earthquake GeoJSON feeds.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Fetch live GeoJSON feed from official USGS Earthquake Hazards Program
    // Feed URL: All Earthquakes in Past Day (or Past Hour)
    const usgsFeedUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';

    const response = await fetch(usgsFeedUrl, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`USGS external endpoint returned HTTP status ${response.status}`);
    }

    const geoJson = await response.json();

    // 2. Validate GeoJSON payload structure
    if (!geoJson || geoJson.type !== 'FeatureCollection' || !Array.isArray(geoJson.features)) {
      throw new Error('Invalid GeoJSON structure received from USGS feed');
    }

    const events: any[] = [];
    let processedCount = 0;

    // 3. Process and normalize each seismic event feature
    for (const feature of geoJson.features) {
      const props = feature.properties || {};
      const geom = feature.geometry || {};
      const coords = geom.coordinates || [];

      // Validate required spatial & magnitude coordinates: [longitude, latitude, depth]
      if (coords.length < 2 || typeof coords[0] !== 'number' || typeof coords[1] !== 'number') {
        continue; // Skip malformed feature missing valid coordinates
      }

      const longitude = coords[0];
      const latitude = coords[1];
      const magnitude = typeof props.mag === 'number' ? Math.max(0, props.mag) : 0.0;
      const sourceEventId = feature.id || `usgs-${props.time || Date.now()}`;
      const title = props.title || props.place || 'Unspecified Seismic Event';
      const occurredAt = props.time ? new Date(props.time).toISOString() : new Date().toISOString();
      const severity = classifyEarthquakeSeverity(magnitude);

      events.push({
        source: 'USGS',
        source_event_id: sourceEventId,
        event_type: 'EARTHQUAKE',
        latitude,
        longitude,
        magnitude,
        title,
        severity,
        occurred_at: occurredAt,
        received_at: new Date().toISOString(),
        status: 'DETECTED',
        raw_data: {
          url: props.url,
          tsunami: props.tsunami || 0,
          alert: props.alert || null,
          felt: props.felt || null,
          cdi: props.cdi || null,
          mmi: props.mmi || null,
          sig: props.sig || 0,
        },
      });

      processedCount++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        provider: 'USGS Real-Time Earthquake Hazards Program',
        totalEventsIngested: processedCount,
        events: events.slice(0, 50), // Return top 50 normalized events
        timestamp: new Date().toISOString(),
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
        error: error?.message || 'USGS ingestion failed',
        provider: 'USGS Real-Time Earthquake Hazards Program',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
