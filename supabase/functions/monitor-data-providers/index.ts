import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders,
  requireAuthenticatedUser,
  getServiceSupabaseClient,
  checkRateLimit,
  parseJsonWithLimit,
  validateCoordinates,
  validateBbox,
  scrubSecrets,
  sanitizeJsonError,
} from '../_shared/security.ts';
import {
  GEMINI_API_BASE_URL,
  callGeminiGenerateContent,
} from '../_shared/gemini.ts';

const ALLOWED_MONITOR_PROVIDERS = new Set(['imd', 'usgs', 'nasa_firms', 'gemini', 'supabase_realtime']);

interface ProviderResult {
  providerKey: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  recordsCount: number;
  responseTimeMs: number;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const auth = await requireAuthenticatedUser(req, ['ADMIN', 'DISPATCHER'], {
    allowServiceOrCron: true,
  });
  if (!auth.ok) {
    return sanitizeJsonError(auth.status || 401, auth.error || 'Unauthorized');
  }

  const rate = checkRateLimit(`monitor-data-providers:${auth.userId}`, 15, 60_000);
  if (!rate.allowed) {
    return sanitizeJsonError(429, 'Rate limit exceeded for health monitor.', {
      retryAfterSec: rate.retryAfterSec,
    });
  }

  const supabase = getServiceSupabaseClient();
  const results: ProviderResult[] = [];
  const now = new Date().toISOString();

  const parsedBody = await parseJsonWithLimit(req, 16_384, { allowEmpty: true });
  if (!parsedBody.ok) {
    return sanitizeJsonError(parsedBody.status || 400, parsedBody.error || 'Invalid request payload');
  }
  const body: any = parsedBody.data || {};

  if (body.latitude !== undefined || body.longitude !== undefined) {
    const lat = Number(body.latitude);
    const lon = Number(body.longitude);
    if (!validateCoordinates(lat, lon)) {
      return sanitizeJsonError(400, 'Invalid coordinates provided');
    }
    body.latitude = lat;
    body.longitude = lon;
  }

  if (body.bbox !== undefined) {
    const validBbox = validateBbox(body.bbox);
    if (!validBbox) {
      return sanitizeJsonError(400, 'Invalid bounding box coordinates');
    }
    body.bbox = validBbox;
  }

  const targetProviders: string[] = Array.isArray(body?.providers)
    ? body.providers.filter((p: unknown): p is string => typeof p === 'string' && ALLOWED_MONITOR_PROVIDERS.has(p))
    : ['imd', 'usgs', 'nasa_firms', 'gemini'];

  if (Array.isArray(body?.providers) && targetProviders.length === 0) {
    return sanitizeJsonError(400, 'No valid providers specified');
  }

  // ─────────────────────────────────────────────
  // 1. USGS EARTHQUAKE HAZARDS PROGRAM
  // ─────────────────────────────────────────────
  if (targetProviders.includes('usgs')) {
    const t0 = Date.now();
    try {
      const { data: ingestResult, error } = await supabase.functions.invoke('ingest-earthquakes', {
        body: {},
      });

      const responseTimeMs = Date.now() - t0;

      if (!error && ingestResult?.success) {
        const recordsCount = ingestResult.insertedCount + ingestResult.duplicatesSkippedCount || 0;
        results.push({
          providerKey: 'usgs',
          status: 'ONLINE',
          recordsCount,
          responseTimeMs,
        });

        await supabase.from('provider_health').upsert({
          provider_key: 'usgs',
          provider_name: 'USGS Earthquake Hazards Program',
          status: 'ONLINE',
          last_successful_update: now,
          last_attempt: now,
          last_error: null,
          consecutive_failures: 0,
          records_last_fetch: recordsCount,
          response_time_ms: responseTimeMs,
          endpoint: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
          updated_at: now,
        }, { onConflict: 'provider_key' });

      } else {
        const errMsg = error?.message || ingestResult?.error || 'USGS ingestion failed';
        results.push({ providerKey: 'usgs', status: 'OFFLINE', recordsCount: 0, responseTimeMs: Date.now() - t0, error: errMsg });

        await supabase.from('provider_health').upsert({
          provider_key: 'usgs',
          provider_name: 'USGS Earthquake Hazards Program',
          status: 'OFFLINE',
          last_attempt: now,
          last_error: errMsg,
          last_error_at: now,
          updated_at: now,
        }, { onConflict: 'provider_key' });
      }
    } catch (err: any) {
      const errMsg = err?.message || 'USGS fetch exception';
      results.push({ providerKey: 'usgs', status: 'OFFLINE', recordsCount: 0, responseTimeMs: Date.now() - t0, error: errMsg });
      await supabase.from('provider_health').upsert({
        provider_key: 'usgs', status: 'OFFLINE', last_attempt: now, last_error: errMsg, last_error_at: now, updated_at: now,
      }, { onConflict: 'provider_key' });
    }
  }

  // ─────────────────────────────────────────────
  // 2. IMD ENVIRONMENTAL ALERTS
  // ─────────────────────────────────────────────
  if (targetProviders.includes('imd')) {
    const t0 = Date.now();
    try {
      const { data: ingestResult, error } = await supabase.functions.invoke('ingest-imd-alerts', {
        body: { latitude: body.latitude ?? 12.9716, longitude: body.longitude ?? 77.5946, district: body.district ?? 'Bengaluru Urban', state: body.state ?? 'Karnataka' },
      });

      const responseTimeMs = Date.now() - t0;

      if (!error && ingestResult?.success) {
        const recordsCount = ingestResult.recordsIngested || (ingestResult.alerts?.length ?? 0);
        results.push({ providerKey: 'imd', status: 'ONLINE', recordsCount, responseTimeMs });

        await supabase.from('provider_health').upsert({
          provider_key: 'imd',
          provider_name: 'IMD India Meteorological Department',
          status: ingestResult.status === 'CACHED' ? 'DEGRADED' : 'ONLINE',
          last_successful_update: now,
          last_attempt: now,
          last_error: null,
          consecutive_failures: 0,
          records_last_fetch: recordsCount,
          response_time_ms: responseTimeMs,
          endpoint: 'https://mausam.imd.gov.in',
          updated_at: now,
        }, { onConflict: 'provider_key' });

      } else {
        const errMsg = error?.message || ingestResult?.error || 'IMD ingestion failed';
        results.push({ providerKey: 'imd', status: 'OFFLINE', recordsCount: 0, responseTimeMs: Date.now() - t0, error: errMsg });
        await supabase.from('provider_health').upsert({
          provider_key: 'imd', status: 'OFFLINE', last_attempt: now, last_error: errMsg, last_error_at: now, updated_at: now,
        }, { onConflict: 'provider_key' });
      }
    } catch (err: any) {
      const errMsg = err?.message || 'IMD fetch exception';
      results.push({ providerKey: 'imd', status: 'OFFLINE', recordsCount: 0, responseTimeMs: Date.now() - t0, error: errMsg });
      await supabase.from('provider_health').upsert({
        provider_key: 'imd', status: 'OFFLINE', last_attempt: now, last_error: errMsg, last_error_at: now, updated_at: now,
      }, { onConflict: 'provider_key' });
    }
  }

  // ─────────────────────────────────────────────
  // 3. NASA FIRMS ACTIVE FIRE
  // ─────────────────────────────────────────────
  if (targetProviders.includes('nasa_firms')) {
    const t0 = Date.now();
    try {
      const { data: ingestResult, error } = await supabase.functions.invoke('ingest-fire-events', {
        body: { bbox: body.bbox ?? '74,11,79,16' },
      });

      const responseTimeMs = Date.now() - t0;

      if (!error && ingestResult?.success) {
        const recordsCount = ingestResult.insertedCount || 0;
        results.push({ providerKey: 'nasa_firms', status: 'ONLINE', recordsCount, responseTimeMs });

        await supabase.from('provider_health').upsert({
          provider_key: 'nasa_firms',
          provider_name: 'NASA FIRMS Active Fire',
          status: 'ONLINE',
          last_successful_update: now,
          last_attempt: now,
          last_error: null,
          consecutive_failures: 0,
          records_last_fetch: recordsCount,
          response_time_ms: responseTimeMs,
          endpoint: 'https://firms.modaps.eosdis.nasa.gov',
          updated_at: now,
        }, { onConflict: 'provider_key' });

      } else {
        // NASA FIRMS often requires API key — treat as DEGRADED not OFFLINE
        const status = ingestResult?.status === 'UNAVAILABLE' ? 'DEGRADED' : 'OFFLINE';
        const errMsg = error?.message || ingestResult?.error || 'FIRMS_MAP_KEY not configured';
        results.push({ providerKey: 'nasa_firms', status, recordsCount: 0, responseTimeMs: Date.now() - t0, error: errMsg });
        await supabase.from('provider_health').upsert({
          provider_key: 'nasa_firms', status, last_attempt: now, last_error: errMsg, last_error_at: now, updated_at: now,
        }, { onConflict: 'provider_key' });
      }
    } catch (err: any) {
      const errMsg = err?.message || 'NASA FIRMS fetch exception';
      results.push({ providerKey: 'nasa_firms', status: 'DEGRADED', recordsCount: 0, responseTimeMs: Date.now() - t0, error: errMsg });
      await supabase.from('provider_health').upsert({
        provider_key: 'nasa_firms', status: 'DEGRADED', last_attempt: now, last_error: errMsg, last_error_at: now, updated_at: now,
      }, { onConflict: 'provider_key' });
    }
  }

  // ─────────────────────────────────────────────
  // 4. GEMINI AI STATUS CHECK
  // ─────────────────────────────────────────────
  if (targetProviders.includes('gemini')) {
    const t0 = Date.now();
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      results.push({ providerKey: 'gemini', status: 'OFFLINE', recordsCount: 0, responseTimeMs: 0, error: 'GEMINI_API_KEY not configured in Edge Function secrets' });
      await supabase.from('provider_health').upsert({
        provider_key: 'gemini',
        provider_name: 'Google Gemini AI',
        status: 'OFFLINE',
        last_attempt: now,
        last_error: 'GEMINI_API_KEY not configured',
        last_error_at: now,
        updated_at: now,
      }, { onConflict: 'provider_key' });
    } else {
      try {
        // Lightweight ping to Gemini API via centralized model & x-goog-api-key header
        const geminiRes = await callGeminiGenerateContent({
          apiKey: geminiApiKey,
          timeoutMs: 8_000,
          body: {
            contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
            generationConfig: { maxOutputTokens: 5 },
          },
        });

        const responseTimeMs = Date.now() - t0;

        if (geminiRes.ok) {
          results.push({ providerKey: 'gemini', status: 'ONLINE', recordsCount: 0, responseTimeMs });
          await supabase.from('provider_health').upsert({
            provider_key: 'gemini',
            provider_name: 'Google Gemini AI',
            status: 'ONLINE',
            last_successful_update: now,
            last_attempt: now,
            last_error: null,
            consecutive_failures: 0,
            response_time_ms: responseTimeMs,
            endpoint: GEMINI_API_BASE_URL,
            updated_at: now,
          }, { onConflict: 'provider_key' });
        } else {
          const errMsg = geminiRes.error || `Gemini API HTTP ${geminiRes.status}`;
          results.push({ providerKey: 'gemini', status: 'DEGRADED', recordsCount: 0, responseTimeMs, error: errMsg });
          await supabase.from('provider_health').upsert({
            provider_key: 'gemini', status: 'DEGRADED', last_attempt: now, last_error: errMsg, last_error_at: now, updated_at: now,
          }, { onConflict: 'provider_key' });
        }
      } catch (err: any) {
        const errMsg = scrubSecrets(String(err?.message || 'Gemini connectivity error'));
        results.push({ providerKey: 'gemini', status: 'OFFLINE', recordsCount: 0, responseTimeMs: Date.now() - t0, error: errMsg });
        await supabase.from('provider_health').upsert({
          provider_key: 'gemini', status: 'OFFLINE', last_attempt: now, last_error: errMsg, last_error_at: now, updated_at: now,
        }, { onConflict: 'provider_key' });
      }
    }
  }

  // ─────────────────────────────────────────────
  // 5. SUPABASE REALTIME STATUS (self-check)
  // ─────────────────────────────────────────────
  if (targetProviders.includes('supabase_realtime')) {
    await supabase.from('provider_health').upsert({
      provider_key: 'supabase_realtime',
      provider_name: 'Supabase Realtime',
      status: 'ONLINE',
      last_successful_update: now,
      last_attempt: now,
      updated_at: now,
    }, { onConflict: 'provider_key' });
    results.push({ providerKey: 'supabase_realtime', status: 'ONLINE', recordsCount: 0, responseTimeMs: 1 });
  }

  const overallStatus = results.every(r => r.status === 'ONLINE')
    ? 'OPERATIONAL'
    : results.some(r => r.status === 'ONLINE')
    ? 'DEGRADED'
    : 'OFFLINE';

  return new Response(
    JSON.stringify({
      success: true,
      timestamp: now,
      overallStatus,
      providers: results,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
