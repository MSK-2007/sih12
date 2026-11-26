import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders,
  requireAuthenticatedUser,
  getServiceSupabaseClient,
  checkRateLimit,
  parseJsonWithLimit,
  validateBbox,
  validateCoordinates,
  scrubSecrets,
  sanitizeJsonError,
} from '../_shared/security.ts';

const ALLOWED_FIRMS_SOURCES = new Set([
  'VIIRS_SNPP_NRT',
  'VIIRS_NOAA20_NRT',
  'VIIRS_NOAA21_NRT',
  'MODIS_NRT',
]);

/**
 * Prototype Severity Assessment Algorithm for NASA FIRMS Active Fire Events.
 * Evaluates Fire Radiative Power (FRP in Megawatts) and satellite detection confidence.
 * NOTE: This is a prototype decision-support classification for operational prioritization,
 * not an official emergency management fire rating.
 */
export function classifyFireSeverity(
  frp: number,
  confidence: string | number
): 'INFORMATIONAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
  const confStr = String(confidence).toLowerCase();
  const isHighConf = confStr === 'h' || confStr === 'high' || Number(confidence) >= 80;

  if (frp >= 50 || (frp >= 30 && isHighConf)) return 'CRITICAL';
  if (frp >= 20 || isHighConf) return 'HIGH';
  if (frp >= 5.0 || confStr === 'n' || confStr === 'nominal' || Number(confidence) >= 50) return 'MODERATE';
  if (frp >= 1.0) return 'LOW';
  return 'INFORMATIONAL';
}

/**
 * Parses NASA FIRMS CSV line response into structured objects.
 */
function parseCsvLine(header: string[], line: string) {
  const values = line.split(',');
  if (values.length < header.length) return null;

  const row: Record<string, string> = {};
  header.forEach((key, idx) => {
    row[key.trim()] = values[idx] ? values[idx].trim() : '';
  });

  return row;
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

    const rate = checkRateLimit(`ingest-fire-events:${auth.userId}`, 20, 60_000);
    if (!rate.allowed) {
      return sanitizeJsonError(429, 'Rate limit exceeded.', { retryAfterSec: rate.retryAfterSec });
    }

    const supabase = getServiceSupabaseClient();

    // 1. Retrieve secret NASA FIRMS MAP_KEY from environment
    const firmsMapKey = Deno.env.get('FIRMS_MAP_KEY');

    let fetchedEventsCount = 0;
    let insertedCount = 0;
    let duplicatesSkippedCount = 0;
    let errorCount = 0;
    let lastError: string | null = null;

    // Configurable operational region (Default: South India / Karnataka / Bengaluru bounding box: 74,11,79,16)
    let bbox = '74,11,79,16';
    let source = 'VIIRS_SNPP_NRT'; // Default satellite sensor

    const parsedBody = await parseJsonWithLimit(req, 16_384, { allowEmpty: true });
    if (!parsedBody.ok) {
      return sanitizeJsonError(parsedBody.status || 400, parsedBody.error || 'Invalid request payload');
    }

    if (parsedBody.data?.bbox !== undefined) {
      const validBbox = validateBbox(parsedBody.data.bbox);
      if (!validBbox) {
        return sanitizeJsonError(400, 'Invalid bounding box coordinates');
      }
      bbox = validBbox;
    }

    if (parsedBody.data?.source !== undefined) {
      const candidateSource = typeof parsedBody.data.source === 'string' ? parsedBody.data.source.trim() : '';
      if (!ALLOWED_FIRMS_SOURCES.has(candidateSource)) {
        return sanitizeJsonError(400, 'Unsupported NASA FIRMS satellite source');
      }
      source = candidateSource;
    }

    // Check if FIRMS_MAP_KEY secret is configured
    if (!firmsMapKey) {
      const missingKeyMsg = 'FIRMS_MAP_KEY secret is not configured in Supabase Edge Function secrets.';
      console.warn(`[ingest-fire-events] ${missingKeyMsg}`);

      // Log failure in external_ingestion_logs
      try {
        await supabase.from('external_ingestion_logs').insert({
          provider: 'NASA_FIRMS_ACTIVE_FIRE',
          endpoint: 'https://firms.modaps.eosdis.nasa.gov/api/area/',
          records_ingested: 0,
          processing_status: 'FAILED',
          error_message: missingKeyMsg,
        });
      } catch (_) {}

      return new Response(
        JSON.stringify({
          success: false,
          provider: 'NASA FIRMS Active Fire Data',
          error: missingKeyMsg,
          recommendation: 'Configure FIRMS_MAP_KEY in Supabase secrets via: supabase secrets set FIRMS_MAP_KEY=your_key',
          status: 'UNAVAILABLE',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // Graceful degrade without crashing
        }
      );
    }

    // 2. Build NASA FIRMS API Request URL
    // NASA FIRMS Area API: https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{BBOX}/{DAY_RANGE}
    const dayRange = '1'; // Last 24 hours
    const firmsUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${firmsMapKey}/${source}/${bbox}/${dayRange}`;

    console.log(`[ingest-fire-events] Fetching NASA FIRMS active fire data for bbox [${bbox}]...`);

    const response = await fetch(firmsUrl, { signal: AbortSignal.timeout(10_000) });

    if (!response.ok) {
      throw new Error(`NASA FIRMS API returned HTTP status ${response.status}`);
    }

    const csvText = await response.text();

    if (!csvText || csvText.includes('Invalid MAP_KEY') || csvText.includes('Transaction Failed')) {
      throw new Error('NASA FIRMS API rejected upstream query parameters or key');
    }

    const lines = csvText.split('\n').filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      // CSV has header only or no events in bbox
      console.log('[ingest-fire-events] No active fires detected in specified operational region.');
    } else {
      const header = lines[0].split(',');
      fetchedEventsCount = lines.length - 1;

      const events: any[] = [];

      // 3. Process and normalize each FIRMS fire detection row
      for (let i = 1; i < lines.length; i++) {
        const row = parseCsvLine(header, lines[i]);
        if (!row) continue;

        const latitude = parseFloat(row.latitude);
        const longitude = parseFloat(row.longitude);

        if (!validateCoordinates(latitude, longitude)) continue;

        const frp = parseFloat(row.frp || '0.0') || 0.0;
        const confidence = row.confidence || 'nominal';
        const acqDate = row.acq_date || new Date().toISOString().split('T')[0];
        const acqTime = row.acq_time ? row.acq_time.padStart(4, '0') : '0000';
        const satellite = row.satellite || 'VIIRS';
        const instrument = row.instrument || 'VIIRS';

        // Derive occurrence timestamp
        const timeFormatted = `${acqTime.slice(0, 2)}:${acqTime.slice(2, 4)}:00Z`;
        const occurredAt = new Date(`${acqDate}T${timeFormatted}`).toISOString();

        // Stable source_event_id fingerprint
        const sourceEventId = `FIRMS-${latitude.toFixed(4)}-${longitude.toFixed(4)}-${acqDate}-${acqTime}-${satellite}`;

        // Severity prototype calculation
        const severity = classifyFireSeverity(frp, confidence);

        events.push({
          source: 'NASA_FIRMS',
          source_event_id: sourceEventId,
          event_type: 'FIRE',
          latitude,
          longitude,
          magnitude: frp, // Storing Fire Radiative Power (MW) as magnitude
          title: `🔥 Active Fire Detected (FRP: ${frp.toFixed(1)} MW, Conf: ${confidence})`,
          severity,
          occurred_at: occurredAt,
          received_at: new Date().toISOString(),
          status: 'DETECTED',
          raw_data: {
            frp,
            confidence,
            satellite,
            instrument,
            bright_ti4: row.bright_ti4 || row.brightness || null,
            bright_ti5: row.bright_ti5 || row.bright_t31 || null,
            scan: row.scan || null,
            track: row.track || null,
            daynight: row.daynight || null,
            bbox,
            operational_region: 'South India / Karnataka',
            detection_freshness: `${acqDate} ${acqTime} UTC`,
          },
        });
      }

      // 4. Insert events into external_events table with duplicate handling
      if (events.length > 0) {
        for (const ev of events) {
          const { error: singleErr } = await supabase.from('external_events').insert(ev);
          if (!singleErr) {
            insertedCount++;
          } else if (
            singleErr.code === '23505' ||
            singleErr.message?.includes('unique constraint') ||
            singleErr.message?.includes('duplicate')
          ) {
            duplicatesSkippedCount++;
          } else {
            errorCount++;
            lastError = singleErr.message;
          }
        }
      }
    }

    // 5. Record audit log in external_ingestion_logs
    try {
      await supabase.from('external_ingestion_logs').insert({
        provider: 'NASA_FIRMS_ACTIVE_FIRE',
        endpoint: firmsUrl.replace(firmsMapKey || '', '[REDACTED]'),
        records_ingested: insertedCount,
        processing_status: errorCount > 0 ? 'PARTIAL' : 'SUCCESS',
        error_message: lastError,
      });
    } catch (_) {}

    return new Response(
      JSON.stringify({
        success: true,
        provider: 'NASA FIRMS Active Fire Data',
        operationalRegion: bbox,
        fetchedEventsCount,
        insertedCount,
        duplicatesSkippedCount,
        errorCount,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[ingest-fire-events] Error:', scrubSecrets(String(error?.message || 'unknown')));
    return sanitizeJsonError(500, 'NASA FIRMS fire event ingestion failed.', {
      provider: 'NASA FIRMS Active Fire Data',
    });
  }
});
