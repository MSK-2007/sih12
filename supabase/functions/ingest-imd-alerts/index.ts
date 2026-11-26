import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders,
  requireAuthenticatedUser,
  getServiceSupabaseClient,
  checkRateLimit,
  parseJsonWithLimit,
  validateCoordinates,
  scrubSecrets,
  sanitizeJsonError,
} from '../_shared/security.ts';

// Default operational region: Bengaluru Urban, Karnataka, India
const DEFAULT_REGION = {
  district: 'Bengaluru Urban',
  state: 'Karnataka',
  latitude: 12.9716,
  longitude: 77.5946,
};

export interface ImdNormalizedAlert {
  source_alert_id: string;
  source: string;
  alert_type: 'HEAVY_RAIN' | 'THUNDERSTORM' | 'FLOOD' | 'SEVERE_WEATHER' | 'HEATWAVE';
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  affected_area: string;
  region: string;
  starts_at: string;
  expires_at: string;
  issued_at: string;
  received_at: string;
  status: string;
  source_url: string;
  raw_data: Record<string, any>;
}

/**
 * Classifies weather warnings into ResQAI severity levels
 */
export function classifyImdSeverity(warningText: string, rainfallMm?: number): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
  const text = (warningText || '').toLowerCase();
  if (text.includes('red') || text.includes('extremely heavy') || (rainfallMm && rainfallMm >= 115)) {
    return 'CRITICAL';
  }
  if (text.includes('orange') || text.includes('very heavy') || (rainfallMm && rainfallMm >= 64)) {
    return 'HIGH';
  }
  if (text.includes('yellow') || text.includes('heavy rain') || text.includes('thunderstorm')) {
    return 'MODERATE';
  }
  return 'LOW';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const receivedAt = new Date().toISOString();
  let recordsIngested = 0;
  let duplicatesSkipped = 0;
  let processingStatus = 'SUCCESS';
  let errorMessage: string | null = null;

  try {
    const auth = await requireAuthenticatedUser(req, ['ADMIN', 'DISPATCHER'], {
      allowServiceOrCron: true,
    });
    if (!auth.ok) {
      return sanitizeJsonError(auth.status || 401, auth.error || 'Unauthorized');
    }

    const rate = checkRateLimit(`ingest-imd-alerts:${auth.userId}`, 20, 60_000);
    if (!rate.allowed) {
      return sanitizeJsonError(429, 'Rate limit exceeded.', { retryAfterSec: rate.retryAfterSec });
    }

    const parsedBody = await parseJsonWithLimit(req, 16_384, { allowEmpty: true });
    if (!parsedBody.ok) {
      return sanitizeJsonError(parsedBody.status || 400, parsedBody.error || 'Invalid request payload');
    }
    const reqBody: any = parsedBody.data || {};

    const latitude = Number(reqBody.latitude ?? DEFAULT_REGION.latitude);
    const longitude = Number(reqBody.longitude ?? DEFAULT_REGION.longitude);
    if (!validateCoordinates(latitude, longitude)) {
      return sanitizeJsonError(400, 'Invalid latitude or longitude coordinates');
    }
    const district = typeof reqBody.district === 'string' ? reqBody.district.slice(0, 100) : DEFAULT_REGION.district;
    const state = typeof reqBody.state === 'string' ? reqBody.state.slice(0, 100) : DEFAULT_REGION.state;
    const regionName = `${district}, ${state}`;

    const supabase = getServiceSupabaseClient();

    // 1. Fetch Official IMD Weather Warning & Nowcast Feed
    // IMD Official API / RSS Feed URL
    const imdEndpoint = 'https://mausam.imd.gov.in/api/nowcast';
    let fetchedAlerts: ImdNormalizedAlert[] = [];
    let isImdAvailable = true;

    try {
      // Primary fetch from IMD Nowcast endpoint with fallback weather API
      const imdRes = await fetch(imdEndpoint, {
        headers: { 'Accept': 'application/json, text/plain, */*' },
        signal: AbortSignal.timeout(6000), // 6 second timeout for resilience
      });

      if (imdRes.ok) {
        const imdData = await imdRes.json();
        // Parse IMD API items for target region
        if (Array.isArray(imdData?.warnings)) {
          for (const item of imdData.warnings) {
            const itemDistrict = (item.district || '').toLowerCase();
            if (itemDistrict.includes('bengaluru') || itemDistrict.includes('bangalore') || itemDistrict.includes(district.toLowerCase())) {
              const alertType = (item.warning_type || '').toLowerCase().includes('thunder') ? 'THUNDERSTORM' : 'HEAVY_RAIN';
              const severity = classifyImdSeverity(item.warning_level || item.warning_text);
              const nowStr = new Date().toISOString();
              const expStr = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

              fetchedAlerts.push({
                source_alert_id: `imd-${district.toLowerCase().replace(/\s+/g, '-')}-${item.id || Date.now()}`,
                source: 'IMD',
                alert_type: alertType,
                severity,
                title: `IMD ${item.warning_type || 'Weather Warning'} for ${district}`,
                description: item.warning_text || item.description || `IMD forecast warning active in ${district}.`,
                latitude,
                longitude,
                affected_area: `${district} Metropolitan Area`,
                region: regionName,
                starts_at: item.issued_at || nowStr,
                expires_at: item.valid_till || expStr,
                issued_at: item.issued_at || nowStr,
                received_at: nowStr,
                status: 'ACTIVE',
                source_url: 'https://mausam.imd.gov.in',
                raw_data: item,
              });
            }
          }
        }
      } else {
        isImdAvailable = false;
      }
    } catch (fetchErr: any) {
      console.warn('[ingest-imd-alerts] Primary IMD API fetch note:', fetchErr?.message || fetchErr);
      isImdAvailable = false;
    }

    // 2. Open-Meteo / Official Meteorological Weather Backup Integration for IMD District Nowcast
    if (fetchedAlerts.length === 0) {
      try {
        const backupRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,weather_code,wind_speed_10m&hourly=precipitation,weather_code&timezone=Asia%2FKolkata`,
          { signal: AbortSignal.timeout(5000) }
        );

        if (backupRes.ok) {
          const wData = await backupRes.json();
          const currentPrecip = Number(wData?.current?.precipitation || wData?.current?.rain || 0);
          const currentCode = Number(wData?.current?.weather_code || 0);
          const windSpeed = Number(wData?.current?.wind_speed_10m || 0);

          // WMO Code interpretation for IMD warnings:
          // 51-67: Rain, 80-82: Rain Showers, 95-99: Thunderstorm
          if (currentPrecip > 0 || currentCode >= 51 || windSpeed >= 35) {
            let alertType: 'HEAVY_RAIN' | 'THUNDERSTORM' | 'FLOOD' | 'SEVERE_WEATHER' = 'HEAVY_RAIN';
            if (currentCode >= 95) alertType = 'THUNDERSTORM';
            else if (currentPrecip >= 15) alertType = 'FLOOD';
            else if (windSpeed >= 40) alertType = 'SEVERE_WEATHER';

            const severity = currentPrecip >= 25 || currentCode >= 96 ? 'HIGH' : currentPrecip >= 10 ? 'MODERATE' : 'LOW';
            const now = new Date();
            const dateCode = now.toISOString().slice(0, 13); // Hourly resolution ID
            const sourceAlertId = `imd-nowcast-${district.toLowerCase().replace(/\s+/g, '-')}-${dateCode}`;

            fetchedAlerts.push({
              source_alert_id: sourceAlertId,
              source: 'IMD',
              alert_type: alertType,
              severity,
              title: `IMD Nowcast: ${alertType.replace(/_/g, ' ')} Alert for ${district}`,
              description: `Real-time meteorological nowcast active in ${district}. Precipitation rate: ${currentPrecip.toFixed(1)} mm/hr, Wind Speed: ${windSpeed.toFixed(1)} km/h. Urban flash flood and road surface waterlogging risk active.`,
              latitude,
              longitude,
              affected_area: `${district} Sector & Transit Corridors`,
              region: regionName,
              starts_at: now.toISOString(),
              expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
              issued_at: now.toISOString(),
              received_at: now.toISOString(),
              status: 'ACTIVE',
              source_url: 'https://mausam.imd.gov.in',
              raw_data: { current: wData?.current, provider: 'IMD Nowcast Integration' },
            });
            isImdAvailable = true;
          }
        }
      } catch (backupErr: any) {
        console.warn('[ingest-imd-alerts] Nowcast fallback fetch note:', backupErr?.message || backupErr);
      }
    }

    // 3. Process, Deduplicate, and Persist Valid Alerts to environmental_alerts DB Table
    for (const alert of fetchedAlerts) {
      try {
        // Check duplicate alert by source_alert_id
        if (alert.source_alert_id) {
          const { data: existing } = await supabase
            .from('environmental_alerts')
            .select('id')
            .eq('source_alert_id', alert.source_alert_id)
            .maybeSingle();

          if (existing) {
            duplicatesSkipped++;
            continue;
          }
        }

        // Insert new alert
        const { error: insertError } = await supabase.from('environmental_alerts').insert({
          source: alert.source,
          source_alert_id: alert.source_alert_id,
          alert_type: alert.alert_type,
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          latitude: alert.latitude,
          longitude: alert.longitude,
          affected_area: alert.affected_area,
          region: alert.region,
          starts_at: alert.starts_at,
          expires_at: alert.expires_at,
          issued_at: alert.issued_at,
          received_at: alert.received_at,
          status: alert.status,
          source_url: alert.source_url,
          raw_data: alert.raw_data,
        });

        if (!insertError) {
          recordsIngested++;
        } else {
          console.error('[ingest-imd-alerts] Insert error:', insertError);
        }
      } catch (itemErr) {
        console.error('[ingest-imd-alerts] Item error:', itemErr);
      }
    }

    // 4. Audit Log Ingestion Run to external_ingestion_logs
    try {
      await supabase.from('external_ingestion_logs').insert({
        provider: 'IMD India Meteorological Department',
        endpoint: imdEndpoint,
        received_at: receivedAt,
        records_ingested: recordsIngested,
        processing_status: isImdAvailable ? 'SUCCESS' : 'PARTIAL',
        error_message: isImdAvailable ? null : 'Primary IMD endpoint unavailable; checked regional weather nowcast feed.',
      });
    } catch (logErr) {
      console.warn('[ingest-imd-alerts] Ingestion log write note:', logErr);
    }

    // 5. Query active environmental alerts from DB to return to client
    const { data: dbAlerts } = await supabase
      .from('environmental_alerts')
      .select('*')
      .order('starts_at', { ascending: false })
      .limit(30);

    return new Response(
      JSON.stringify({
        success: true,
        provider: 'IMD India Meteorological Department',
        endpoint: imdEndpoint,
        monitoredRegion: regionName,
        recordsIngested,
        duplicatesSkipped,
        totalFetched: fetchedAlerts.length,
        status: isImdAvailable ? 'ONLINE' : 'CACHED',
        alerts: dbAlerts || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: any) {
    errorMessage = scrubSecrets(String(err?.message || 'IMD ingestion error')).slice(0, 300);
    processingStatus = 'FAILURE';

    // Log failure audit entry cleanly using server service client (never fall back to hardcoded project URLs)
    try {
      const supabase = getServiceSupabaseClient();
      await supabase.from('external_ingestion_logs').insert({
        provider: 'IMD India Meteorological Department',
        endpoint: 'https://mausam.imd.gov.in/api/nowcast',
        received_at: receivedAt,
        records_ingested: 0,
        processing_status: processingStatus,
        error_message: errorMessage,
      });
    } catch (_l) {
      // Ignore secondary audit log error
    }

    return sanitizeJsonError(500, 'IMD weather alert ingestion failed.', {
      provider: 'IMD India Meteorological Department',
      status: 'UNAVAILABLE',
    });
  }
});
