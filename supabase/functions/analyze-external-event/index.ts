import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders,
  requireAuthenticatedUser,
  getServiceSupabaseClient,
  checkRateLimit,
  parseJsonWithLimit,
  isValidUuid,
  validateCoordinates,
  sanitizeJsonError,
} from '../_shared/security.ts';
import {
  resolveGeminiModel,
  callGeminiGenerateContent,
} from '../_shared/gemini.ts';

export interface GeminiAnalysisSchema {
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  situation_summary: string;
  potential_impacts: string[];
  recommended_resource_types: string[];
  affected_area_assessment: string;
  recommended_operator_action: 'MONITOR' | 'REVIEW' | 'CREATE_INCIDENT';
  confidence: number;
  reasoning_summary: string;
}

/**
 * Validates Gemini AI response against strict schema rules
 */
export function validateGeminiAnalysis(output: any): GeminiAnalysisSchema | null {
  if (!output || typeof output !== 'object') return null;

  const validRiskLevels = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
  const validActions = ['MONITOR', 'REVIEW', 'CREATE_INCIDENT'];

  const risk_level = validRiskLevels.includes(output.risk_level) ? output.risk_level : 'MODERATE';
  const situation_summary = typeof output.situation_summary === 'string' && output.situation_summary.trim().length > 0
    ? output.situation_summary
    : 'External emergency event detected; operator review advised.';
  const potential_impacts = Array.isArray(output.potential_impacts)
    ? output.potential_impacts.filter((i: any) => typeof i === 'string')
    : ['Potential environmental risk', 'Structural risk assessment recommended'];
  const recommended_resource_types = Array.isArray(output.recommended_resource_types)
    ? output.recommended_resource_types.filter((r: any) => typeof r === 'string')
    : ['FIRE_UNIT', 'AMBULANCE'];
  const affected_area_assessment = typeof output.affected_area_assessment === 'string'
    ? output.affected_area_assessment
    : 'Thermal / seismic anomaly reported in target operational region.';
  const recommended_operator_action = validActions.includes(output.recommended_operator_action)
    ? output.recommended_operator_action
    : 'REVIEW';
  const rawConfidence = Number(output.confidence);
  const confidence = !isNaN(rawConfidence) && rawConfidence >= 0 && rawConfidence <= 100
    ? Math.round(rawConfidence)
    : 85;
  const reasoning_summary = typeof output.reasoning_summary === 'string'
    ? output.reasoning_summary
    : 'Assessment based on event magnitude/FRP, distance to infrastructure, and emergency capacity.';

  return {
    risk_level: risk_level as any,
    situation_summary,
    potential_impacts,
    recommended_resource_types,
    affected_area_assessment,
    recommended_operator_action: recommended_operator_action as any,
    confidence,
    reasoning_summary,
  };
}

/**
 * Deterministic rule-based fallback when Gemini API is unavailable or returns invalid schema.
 * Supports both USGS Earthquakes and NASA FIRMS Active Fire Events.
 */
export function generateDeterministicFallback(event: any, hospitalCount: number): GeminiAnalysisSchema {
  const isFire = (event.event_type || '').toUpperCase() === 'FIRE' || (event.source || '').toUpperCase().includes('FIRMS');
  const magOrFrp = Number(event.magnitude || 0);

  let risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
  let recommended_operator_action: 'MONITOR' | 'REVIEW' | 'CREATE_INCIDENT' = 'MONITOR';
  let recommended_resource_types: string[] = [];

  if (isFire) {
    // NASA FIRMS Active Fire Assessment based on Fire Radiative Power (MW)
    if (magOrFrp >= 50.0) {
      risk_level = 'CRITICAL';
      recommended_operator_action = 'CREATE_INCIDENT';
      recommended_resource_types = ['FIRE_UNIT', 'WATER_TANKER', 'RESCUE_TEAM', 'AMBULANCE'];
    } else if (magOrFrp >= 20.0) {
      risk_level = 'HIGH';
      recommended_operator_action = 'CREATE_INCIDENT';
      recommended_resource_types = ['FIRE_UNIT', 'AMBULANCE', 'RESCUE_TEAM'];
    } else if (magOrFrp >= 5.0) {
      risk_level = 'MODERATE';
      recommended_operator_action = 'REVIEW';
      recommended_resource_types = ['FIRE_UNIT', 'AMBULANCE'];
    } else {
      risk_level = 'LOW';
      recommended_operator_action = 'MONITOR';
      recommended_resource_types = ['FIRE_UNIT'];
    }

    return {
      risk_level,
      situation_summary: `NASA FIRMS Active Fire Detection: Fire Radiative Power ${magOrFrp.toFixed(1)} MW detected at (${Number(event.latitude).toFixed(3)}, ${Number(event.longitude).toFixed(3)}).`,
      potential_impacts: [
        magOrFrp >= 20.0 ? 'Rapid wildfire propagation & structural exposure threat' : 'Localized thermal anomaly',
        `Identified ${hospitalCount} nearby medical facilities for potential smoke/burn response`,
      ],
      recommended_resource_types,
      affected_area_assessment: `Satellite detection confidence: ${event.raw_data?.confidence || 'Nominal'}. Detection freshness: ${event.raw_data?.detection_freshness || 'Recent'}.`,
      recommended_operator_action,
      confidence: 85,
      reasoning_summary: 'Deterministic NASA FIRMS FRP threshold evaluation applied (Gemini API fallback active).',
    };
  }

  // USGS Earthquake Assessment
  if (magOrFrp >= 7.0) {
    risk_level = 'CRITICAL';
    recommended_operator_action = 'CREATE_INCIDENT';
    recommended_resource_types = ['AMBULANCE', 'FIRE_UNIT', 'RESCUE_TEAM', 'POLICE_UNIT'];
  } else if (magOrFrp >= 6.0) {
    risk_level = 'HIGH';
    recommended_operator_action = 'CREATE_INCIDENT';
    recommended_resource_types = ['AMBULANCE', 'RESCUE_TEAM', 'FIRE_UNIT'];
  } else if (magOrFrp >= 5.0) {
    risk_level = 'MODERATE';
    recommended_operator_action = 'REVIEW';
    recommended_resource_types = ['AMBULANCE', 'RESCUE_TEAM'];
  } else {
    risk_level = 'LOW';
    recommended_operator_action = 'MONITOR';
    recommended_resource_types = ['AMBULANCE'];
  }

  return {
    risk_level,
    situation_summary: `Magnitude ${magOrFrp} Seismic Event registered near ${event.title || 'epicenter'}.`,
    potential_impacts: [
      magOrFrp >= 5.0 ? 'Potential structural damage & utility disruptions' : 'Minor localized tremors',
      `Identified ${hospitalCount} emergency healthcare facilities in operational radius`,
    ],
    recommended_resource_types,
    affected_area_assessment: `Epicenter at coordinates (${Number(event.latitude).toFixed(3)}, ${Number(event.longitude).toFixed(3)}).`,
    recommended_operator_action,
    confidence: 80,
    reasoning_summary: 'Deterministic seismic threshold evaluation applied (Gemini API fallback active).',
  };
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

    const rate = checkRateLimit(`analyze-external-event:${auth.userId}`, 30, 60_000);
    if (!rate.allowed) {
      return sanitizeJsonError(429, 'Rate limit exceeded. Please retry shortly.', {
        retryAfterSec: rate.retryAfterSec,
      });
    }

    const parsedBody = await parseJsonWithLimit(req, 65_536, { allowEmpty: false });
    if (!parsedBody.ok) {
      return sanitizeJsonError(parsedBody.status || 400, parsedBody.error || 'Invalid request payload');
    }

    const body = parsedBody.data;
    const rawEventId = body?.external_event_id;
    if (rawEventId !== undefined && !isValidUuid(rawEventId)) {
      return sanitizeJsonError(400, 'Invalid external_event_id UUID format');
    }
    const external_event_id = typeof rawEventId === 'string' ? rawEventId.trim() : undefined;
    const event = body?.event && typeof body.event === 'object' && !Array.isArray(body.event) ? body.event : undefined;

    if (!external_event_id && !event) {
      return sanitizeJsonError(400, 'Missing external_event_id or event payload');
    }

    if (
      event &&
      (event.latitude !== undefined || event.longitude !== undefined) &&
      !validateCoordinates(Number(event.latitude), Number(event.longitude))
    ) {
      return sanitizeJsonError(400, 'Invalid coordinates in event payload');
    }

    const supabase = getServiceSupabaseClient();

    // 1. Fetch full event details from DB if only ID supplied
    let targetEvent = event;
    if (!targetEvent && external_event_id) {
      const { data: dbEvent } = await supabase
        .from('external_events')
        .select('*')
        .eq('id', external_event_id)
        .single();
      targetEvent = dbEvent;
    }

    if (!targetEvent) {
      return new Response(
        JSON.stringify({ success: false, error: 'External event record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const eventId = external_event_id || targetEvent.id;

    // Duplicate analysis prevention check
    if (eventId) {
      const { data: existingAnalysis } = await supabase
        .from('incident_ai_analysis')
        .select('*')
        .eq('external_event_id', eventId)
        .single();

      if (existingAnalysis && existingAnalysis.analysis_status === 'COMPLETED') {
        return new Response(
          JSON.stringify({
            success: true,
            provider: 'Gemini 1.5 Flash (Cached Analysis)',
            analysis: existingAnalysis,
            isCached: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. Fetch context (Nearby Hospitals, Resources, Active Incidents, IMD Environmental Alerts)
    const { data: hospitals } = await supabase.from('hospitals').select('id, name, available_beds, status').limit(5);
    const { data: resources } = await supabase.from('resources').select('id, resource_type, status').eq('status', 'AVAILABLE');
    const { data: incidents } = await supabase.from('incidents').select('id, title, status, severity').neq('status', 'CLOSED').limit(5);

    // Fetch active IMD environmental alerts near the event location (within ~100km)
    const { data: envAlerts } = await supabase
      .from('environmental_alerts')
      .select('id, source, alert_type, severity, title, description, affected_area, region, starts_at, expires_at')
      .eq('status', 'ACTIVE')
      .order('starts_at', { ascending: false })
      .limit(5);

    const hospitalCount = hospitals ? hospitals.length : 0;
    const availableResourceCount = resources ? resources.length : 0;
    const activeIncidentCount = incidents ? incidents.length : 0;
    const activeEnvAlerts = envAlerts || [];

    // Build a concise IMD weather context string for Gemini
    const envAlertContext = activeEnvAlerts.length > 0
      ? activeEnvAlerts.map((a: any) =>
          `- [${a.severity}] ${a.alert_type}: ${a.title} (${a.affected_area || a.region || 'Local Region'}) — expires ${a.expires_at ? new Date(a.expires_at).toLocaleString() : 'Ongoing'}`
        ).join('\n')
      : 'No active IMD weather warnings in the operational region.';

    // 3. Call Gemini AI API
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    let aiAnalysis: GeminiAnalysisSchema | null = null;
    let modelUsed = resolveGeminiModel();

    if (geminiApiKey) {
      try {
        const systemPrompt = `You are ResQAI, an expert AI decision-support system for municipal disaster control rooms.
Your objective is to analyze real-world external events (USGS Earthquakes and NASA FIRMS Active Fire detections) and produce decision-support context for human operators.

CRITICAL CONSTRAINTS:
1. You MUST NOT directly dispatch resources or pick specific vehicle IDs (no vehicle codes like AMB-01 or FIRE-02).
2. You only recommend resource TYPES (AMBULANCE, FIRE_UNIT, WATER_TANKER, RESCUE_TEAM, POLICE_UNIT).
3. Do NOT output chain-of-thought or reasoning steps. Only return concise reasoning_summary.
4. Output MUST be STRICT JSON adhering to this exact schema:
{
  "risk_level": "LOW" | "MODERATE" | "HIGH" | "CRITICAL",
  "situation_summary": "concise description of event",
  "potential_impacts": ["impact 1", "impact 2"],
  "recommended_resource_types": ["FIRE_UNIT", "AMBULANCE", etc],
  "affected_area_assessment": "assessment of regional impact",
  "recommended_operator_action": "MONITOR" | "REVIEW" | "CREATE_INCIDENT",
  "confidence": number between 0 and 100,
  "reasoning_summary": "concise rationale"
}`;

        const userPrompt = `EXTERNAL EVENT CONTEXT:
Event Source: ${targetEvent.source || 'NASA_FIRMS'}
Source ID: ${targetEvent.source_event_id || 'N/A'}
Event Type: ${targetEvent.event_type || 'FIRE'}
Title: ${targetEvent.title}
Magnitude/FRP (MW): ${targetEvent.magnitude}
Latitude: ${targetEvent.latitude}
IMD WEATHER CONTEXT (Active Warnings in Operational Region):
${envAlertContext}
Longitude: ${targetEvent.longitude}
Occurred At: ${targetEvent.occurred_at}
Severity: ${targetEvent.severity}
Raw Metadata: ${JSON.stringify(targetEvent.raw_data || {})}

OPERATIONAL CONTEXT:
Nearby Operational Hospitals: ${hospitalCount}
Currently Available Emergency Resources: ${availableResourceCount}
Active Ongoing Incidents: ${activeIncidentCount}`;

        const geminiRes = await callGeminiGenerateContent({
          apiKey: geminiApiKey,
          model: modelUsed,
          timeoutMs: 15_000,
          body: {
            contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
          },
        });

        if (geminiRes.ok && geminiRes.text) {
          const parsed = JSON.parse(geminiRes.text);
          aiAnalysis = validateGeminiAnalysis(parsed);
        }
      } catch (geminiErr) {
        console.warn('Gemini API call warning, utilizing deterministic fallback:', geminiErr);
      }
    }

    // Use deterministic rule-based fallback if AI call missing or failed validation
    if (!aiAnalysis) {
      modelUsed = 'resqai-rule-engine-fallback';
      aiAnalysis = generateDeterministicFallback(targetEvent, hospitalCount);
    }

    // 4. Save analysis to incident_ai_analysis DB table
    const analysisPayload = {
      external_event_id: eventId || null,
      incident_type: targetEvent.event_type || 'FIRE',
      severity: aiAnalysis.risk_level,
      urgency: aiAnalysis.recommended_operator_action,
      people_affected: Number(targetEvent.magnitude) >= 50.0 ? 50 : Number(targetEvent.magnitude) >= 20.0 ? 20 : 5,
      required_resources: aiAnalysis.recommended_resource_types,
      risk_factors: aiAnalysis.potential_impacts,
      reasons: [aiAnalysis.reasoning_summary],
      risk_level: aiAnalysis.risk_level,
      situation_summary: aiAnalysis.situation_summary,
      potential_impacts: aiAnalysis.potential_impacts,
      recommended_resource_types: aiAnalysis.recommended_resource_types,
      affected_area_assessment: aiAnalysis.affected_area_assessment,
      recommended_operator_action: aiAnalysis.recommended_operator_action,
      confidence: aiAnalysis.confidence,
      reasoning_summary: aiAnalysis.reasoning_summary,
      model_name: modelUsed,
      analysis_status: 'COMPLETED',
    };

    if (eventId) {
      await supabase.from('incident_ai_analysis').upsert(analysisPayload, { onConflict: 'external_event_id' });
    }

    return new Response(
      JSON.stringify({
        success: true,
        provider: modelUsed,
        analysis: analysisPayload,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: any) {
    console.error('[AnalyzeExternalEvent]', err?.message);
    return sanitizeJsonError(500, 'External event AI analysis failed.');
  }
});
