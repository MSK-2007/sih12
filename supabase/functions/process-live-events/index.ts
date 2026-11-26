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

const HAVERSINE_MATCH_KM = 100; // match incidents within 100km of external event

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

  const rate = checkRateLimit(`process-live-events:${auth.userId}`, 15, 60_000);
  if (!rate.allowed) {
    return sanitizeJsonError(429, 'Rate limit exceeded for live event pipeline.', {
      retryAfterSec: rate.retryAfterSec,
    });
  }

  const parsedBody = await parseJsonWithLimit(req, 16_384, { allowEmpty: true });
  if (!parsedBody.ok) {
    return sanitizeJsonError(parsedBody.status || 400, parsedBody.error || 'Invalid request payload');
  }

  const supabase = getServiceSupabaseClient();
  const now = new Date().toISOString();
  const processingLog: string[] = [];
  let eventsProcessed = 0;
  let incidentsAffected = 0;
  let geminiAnalysesTriggered = 0;

  try {
    // ── Step 1: Fetch recent unprocessed external events (last 60 minutes, not yet analyzed) ──
    const cutoffTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: recentEvents, error: eventsErr } = await supabase
      .from('external_events')
      .select('*')
      .gte('received_at', cutoffTime)
      .neq('status', 'CONVERTED_TO_INCIDENT')
      .order('received_at', { ascending: false })
      .limit(20);

    if (eventsErr) throw new Error('Failed to fetch recent external events: ' + eventsErr.message);

    const events = recentEvents || [];
    processingLog.push(`Fetched ${events.length} recent external events`);

    // ── Step 2: Fetch active incidents for geospatial matching ──
    const { data: activeIncidents } = await supabase
      .from('incidents')
      .select('id, title, incident_number, latitude, longitude, priority_score, priority_level, status, emergency_type, people_affected')
      .not('status', 'in', '("RESOLVED","CLOSED")')
      .order('priority_score', { ascending: false })
      .limit(50);

    const incidents = activeIncidents || [];
    processingLog.push(`Active incidents for geospatial matching: ${incidents.length}`);

    // ── Step 3: Process each event ──
    for (const event of events) {
      // Skip low-significance events (INFORMATIONAL earthquakes, very low FRP fires)
      const magnitude = Number(event.magnitude || 0);
      const isEarthquake = (event.event_type || '').toUpperCase() === 'EARTHQUAKE';
      const isFire = (event.event_type || '').toUpperCase() === 'FIRE';

      const isSignificant = (isEarthquake && magnitude >= 3.0) || (isFire && magnitude >= 5.0);
      if (!isSignificant) continue;

      // Deduplicate: check if Gemini analysis already exists for this event
      const { data: existingAnalysis } = await supabase
        .from('incident_ai_analysis')
        .select('id, analysis_status')
        .eq('external_event_id', event.id)
        .eq('analysis_status', 'COMPLETED')
        .single();

      if (existingAnalysis) {
        processingLog.push(`Skipping ${event.id} — analysis already exists`);
        continue;
      }

      eventsProcessed++;

      // ── Geospatial match to incidents ──
      const matchedIncidentIds: string[] = [];
      if (validateCoordinates(Number(event.latitude), Number(event.longitude))) {
        for (const incident of incidents) {
          if (!validateCoordinates(Number(incident.latitude), Number(incident.longitude))) continue;
          const distKm = haversineKm(
            Number(event.latitude),
            Number(event.longitude),
            Number(incident.latitude),
            Number(incident.longitude)
          );
          if (distKm <= HAVERSINE_MATCH_KM) {
            matchedIncidentIds.push(incident.id);
          }
        }
      }

      processingLog.push(`Event ${event.source}/${event.id} matched ${matchedIncidentIds.length} incidents`);

      // ── Write to AI event timeline ──
      const eventTitle = isEarthquake
        ? `M${magnitude.toFixed(1)} Earthquake Detected — ${event.title}`
        : `Active Fire Detected — FRP ${magnitude.toFixed(1)}MW`;

      await supabase.from('ai_event_timeline').insert({
        event_type: 'ENV_EVENT_DETECTED',
        title: eventTitle,
        description: event.title,
        severity: event.severity,
        source: event.source,
        external_event_id: event.id,
        incident_id: matchedIncidentIds[0] || null,
        metadata: {
          latitude: event.latitude,
          longitude: event.longitude,
          magnitude,
          matchedIncidentCount: matchedIncidentIds.length,
        },
        occurred_at: event.occurred_at || now,
      });

      // ── Trigger Gemini AI analysis (non-blocking) ──
      try {
        const { data: analysisResult, error: analysisErr } = await supabase.functions.invoke('analyze-external-event', {
          body: { external_event_id: event.id, event },
        });

        if (!analysisErr && analysisResult?.success) {
          geminiAnalysesTriggered++;
          const analysisData = analysisResult.analysis;

          // Write AI analysis completion to timeline
          await supabase.from('ai_event_timeline').insert({
            event_type: 'GEMINI_ANALYSIS_COMPLETED',
            title: `Gemini AI Analysis — ${event.source} Event`,
            description: analysisData?.situation_summary || 'AI analysis completed',
            severity: analysisData?.risk_level || 'MODERATE',
            source: 'GEMINI',
            external_event_id: event.id,
            incident_id: matchedIncidentIds[0] || null,
            metadata: {
              model: analysisResult.provider,
              confidence: analysisData?.confidence,
              recommendedAction: analysisData?.recommended_operator_action,
            },
            occurred_at: now,
          });

          // ── Priority recalculation for matched incidents ──
          if (matchedIncidentIds.length > 0 && analysisData?.risk_level) {
            const envBoost = { LOW: 10, MODERATE: 40, HIGH: 70, CRITICAL: 90 }[analysisData.risk_level as string] || 30;

            for (const incidentId of matchedIncidentIds.slice(0, 5)) {
              const inc = incidents.find(i => i.id === incidentId);
              if (!inc) continue;

              incidentsAffected++;

              // Add incident update note about environmental context
              try {
                await supabase.from('incident_updates').insert({
                  incident_id: incidentId,
                  message: `Environmental Intelligence: ${eventTitle}. Gemini AI Risk Level: ${analysisData.risk_level}. ${analysisData.situation_summary || ''}`,
                  status: inc.status || 'IN_PROGRESS',
                  created_at: now,
                });
              } catch {
                // non-blocking update note
              }

              // Record in timeline
              await supabase.from('ai_event_timeline').insert({
                event_type: 'PRIORITY_CALCULATED',
                title: `Environmental Risk Applied — ${inc.incident_number || inc.id}`,
                description: `${eventTitle} applies ${analysisData.risk_level} environmental risk to this incident`,
                severity: analysisData.risk_level,
                source: 'SYSTEM',
                incident_id: incidentId,
                external_event_id: event.id,
                metadata: { envBoost, currentPriorityScore: inc.priority_score },
                occurred_at: now,
              });
            }
          }

          // ── Check for resource conflicts if CRITICAL event ──
          if (analysisData?.risk_level === 'CRITICAL' && matchedIncidentIds.length > 0) {
            await supabase.from('ai_event_timeline').insert({
              event_type: 'RESOURCE_CONFLICT',
              title: 'Critical Environmental Event — Resource Evaluation Required',
              description: `${eventTitle} may require resource reallocation review for ${matchedIncidentIds.length} affected incident(s)`,
              severity: 'CRITICAL',
              source: 'SYSTEM',
              external_event_id: event.id,
              incident_id: matchedIncidentIds[0] || null,
              metadata: { affectedIncidents: matchedIncidentIds.slice(0, 5) },
              occurred_at: now,
            });
          }
        }
      } catch (analysisErr: any) {
        processingLog.push(`Gemini analysis error for ${event.id}: ${analysisErr?.message}`);
      }
    }

    // ── Update Supabase Realtime provider health ──
    await supabase.from('provider_health').upsert({
      provider_key: 'supabase_realtime',
      provider_name: 'Supabase Realtime',
      status: 'ONLINE',
      last_successful_update: now,
      last_attempt: now,
      updated_at: now,
    }, { onConflict: 'provider_key' });

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now,
        eventsProcessed,
        incidentsAffected,
        geminiAnalysesTriggered,
        processingLog,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[ProcessLiveEvents]', err?.message);
    return sanitizeJsonError(500, 'Live event processing failed.');
  }
});

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
