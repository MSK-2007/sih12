import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  requireAuthenticatedUser,
  checkRateLimit,
  parseJsonWithLimit,
  validateCoordinates,
  sanitizeJsonError,
} from "../_shared/security.ts";
import {
  resolveGeminiModel,
  callGeminiGenerateContent,
} from "../_shared/gemini.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await requireAuthenticatedUser(req, ['ADMIN', 'DISPATCHER']);
    if (!auth.ok) {
      return sanitizeJsonError(auth.status || 401, auth.error || 'Unauthorized');
    }

    const rate = checkRateLimit(`analyze-incident:${auth.userId}`, 30, 60_000);
    if (!rate.allowed) {
      return sanitizeJsonError(429, 'Rate limit exceeded. Please retry shortly.', {
        retryAfterSec: rate.retryAfterSec,
      });
    }

    const parsedBody = await parseJsonWithLimit(req, 65_536, { allowEmpty: false });
    if (!parsedBody.ok) {
      return sanitizeJsonError(parsedBody.status || 400, parsedBody.error || 'Invalid request payload');
    }

    const incident = parsedBody.data?.incident;
    if (
      !incident ||
      typeof incident !== 'object' ||
      typeof incident.title !== 'string' ||
      incident.title.trim().length === 0 ||
      incident.title.length > 300
    ) {
      return sanitizeJsonError(400, 'Invalid or missing incident payload');
    }

    if (
      (incident.latitude !== undefined || incident.longitude !== undefined) &&
      !validateCoordinates(Number(incident.latitude), Number(incident.longitude))
    ) {
      return sanitizeJsonError(400, 'Invalid incident coordinates');
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      console.warn('GEMINI_API_KEY not configured in Supabase Edge Function secrets. Returning fallback response.');
      return new Response(
        JSON.stringify({
          fallback: true,
          message: 'GEMINI_API_KEY environment variable missing in Edge Function secrets.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiModel = resolveGeminiModel();
    const systemPrompt = `You are ResQAI, an expert emergency incident assessment AI for municipal emergency control rooms.
Your job is to analyze incoming 112 emergency reported incidents and determine:
1. WHAT is happening (summary of incident nature)?
2. HOW severe is it (SEVERITY: CRITICAL, HIGH, MEDIUM, LOW | URGENCY score 1-10)?
3. WHAT TYPES of resources are required? (Choose from: AMBULANCE, FIRE_UNIT, POLICE_UNIT, RESCUE_TEAM)?
4. What are the key RISK FACTORS to monitor?
5. REASONS for your evaluation.

CRITICAL INSTRUCTION: You MUST NOT pick specific resource unit codes or vehicle IDs (such as AMB-01 or FIRE-02). You only determine resource TYPES and required capabilities.

Return strictly valid JSON matching this schema:
{
  "incident_type": "string",
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "urgency": "string",
  "people_affected": number,
  "required_resources": ["AMBULANCE", "FIRE_UNIT", etc],
  "risk_factors": ["risk 1", "risk 2"],
  "reasons": ["reason 1", "reason 2"],
  "model_name": "${geminiModel}"
}`;

    const userPrompt = `Analyze this incident report:
Title: ${incident.title}
Emergency Type: ${incident.emergencyType}
Description: ${incident.description || 'N/A'}
Location/Address: ${incident.address || 'N/A'}
People Affected: ${incident.peopleAffected || 1}
Injury Level: ${incident.injuryLevel || 'MODERATE'}
Reported At: ${incident.reportedAt || new Date().toISOString()}`;

    const geminiResult = await callGeminiGenerateContent({
      apiKey: geminiApiKey,
      model: geminiModel,
      timeoutMs: 15_000,
      body: {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      },
    });

    if (!geminiResult.ok) {
      console.error('Gemini API call error status:', geminiResult.status);
      return new Response(
        JSON.stringify({ fallback: true, error: 'AI service unavailable; deterministic fallback active.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawText = geminiResult.text || '';

    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText);
    } catch {
      parsedResult = {
        incident_type: incident.emergencyType,
        severity: incident.priorityLevel || 'MEDIUM',
        urgency: 'HIGH_PRIORITY_DISPATCH',
        people_affected: incident.peopleAffected || 1,
        required_resources: ['AMBULANCE'],
        risk_factors: ['Potential traffic delay', 'Escalating casualty condition'],
        reasons: ['Initial rule-based AI triage applied'],
        model_name: geminiModel,
      };
    }

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (_err: unknown) {
    return sanitizeJsonError(500, 'AI incident analysis failed.', { fallback: true });
  }
});
