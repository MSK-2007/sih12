import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders,
  requireAuthenticatedUser,
  getServiceSupabaseClient,
  checkRateLimit,
  parseJsonWithLimit,
  validateCoordinates,
  sanitizeJsonError,
} from '../_shared/security.ts';

export function classifyEarthquakeSeverity(mag: number): 'INFORMATIONAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
  if (mag >= 7.0) return 'CRITICAL';
  if (mag >= 6.0) return 'HIGH';
  if (mag >= 5.0) return 'MODERATE';
  if (mag >= 3.0) return 'LOW';
  return 'INFORMATIONAL';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await requireAuthenticatedUser(req, ['ADMIN', 'DISPATCHER'], {
      allowServiceOrCron: true,
    });
    if (!auth.ok) {
      return sanitizeJsonError(auth.status || 401, auth.error || 'Unauthorized');
    }

    const rate = checkRateLimit(`ingest-earthquakes:${auth.userId}`, 20, 60_000);
    if (!rate.allowed) {
      return sanitizeJsonError(429, 'Rate limit exceeded.', { retryAfterSec: rate.retryAfterSec });
    }

    const parsedBody = await parseJsonWithLimit(req, 16_384, { allowEmpty: true });
    if (!parsedBody.ok) {
      return sanitizeJsonError(parsedBody.status || 400, parsedBody.error || 'Invalid request payload');
    }

    const supabase = getServiceSupabaseClient();

    let fetchedEventsCount = 0;
    let insertedCount = 0;
    let duplicatesSkippedCount = 0;
    let errorCount = 0;
    let lastError: string | null = null;

    // 1. Fetch live GeoJSON feed from official USGS Earthquake Hazards Program
    const usgsFeedUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';

    const response = await fetch(usgsFeedUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`USGS external endpoint returned HTTP status ${response.status}`);
    }

    const geoJson = await response.json();

    if (!geoJson || geoJson.type !== 'FeatureCollection' || !Array.isArray(geoJson.features)) {
      throw new Error('Invalid GeoJSON structure received from USGS feed');
    }

    fetchedEventsCount = geoJson.features.length;
    const events: any[] = [];

    // 2. Process and normalize each seismic event feature
    for (const feature of geoJson.features) {
      const props = feature.properties || {};
      const geom = feature.geometry || {};
      const coords = geom.coordinates || [];

      if (coords.length < 2 || !validateCoordinates(coords[1], coords[0])) {
        continue;
      }

      const longitude = coords[0];
      const latitude = coords[1];
      const magnitude = typeof props.mag === 'number' ? Math.max(0, props.mag) : 0.0;
      const sourceEventId = String(feature.id || `usgs-${props.time || Date.now()}`);
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
    }

    // 3. Insert events into external_events table
    if (events.length > 0) {
      for (const ev of events) {
        const { error: singleErr } = await supabase.from('external_events').insert(ev);
        if (!singleErr) {
          insertedCount++;
        } else if (singleErr.code === '23505' || singleErr.message?.includes('unique constraint') || singleErr.message?.includes('duplicate')) {
          duplicatesSkippedCount++;
        } else {
          errorCount++;
          lastError = singleErr.message;
        }
      }
    }

    // 4. Record audit log in external_ingestion_logs
    try {
      await supabase.from('external_ingestion_logs').insert({
        provider: 'USGS_EARTHQUAKE_HAZARDS',
        endpoint: usgsFeedUrl,
        records_ingested: insertedCount,
        processing_status: errorCount > 0 ? 'PARTIAL' : 'SUCCESS',
        error_message: lastError,
      });
    } catch (_) {}

    return new Response(
      JSON.stringify({
        success: true,
        provider: 'USGS Real-Time Earthquake Hazards Program',
        usgsRequestStatus: 'HTTP 200 OK',
        fetchedEventsCount,
        insertedCount,
        duplicatesSkippedCount,
        errorCount,
        events: events.slice(0, 50),
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (_error: unknown) {
    return sanitizeJsonError(500, 'USGS earthquake ingestion failed.', {
      provider: 'USGS Real-Time Earthquake Hazards Program',
    });
  }
});
