import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  requireAuthenticatedUser,
  checkRateLimit,
  parseJsonWithLimit,
  sanitizeJsonError,
} from "../_shared/security.ts";
import { callGeminiGenerateContent } from "../_shared/gemini.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await requireAuthenticatedUser(req, ['ADMIN', 'DISPATCHER']);
    if (!auth.ok) {
      return sanitizeJsonError(auth.status || 401, auth.error || 'Unauthorized');
    }

    const rate = checkRateLimit(`explain-reallocation:${auth.userId}`, 30, 60_000);
    if (!rate.allowed) {
      return sanitizeJsonError(429, 'Rate limit exceeded. Please retry shortly.', {
        retryAfterSec: rate.retryAfterSec,
      });
    }

    const parsedBody = await parseJsonWithLimit(req, 65_536, { allowEmpty: false });
    if (!parsedBody.ok) {
      return sanitizeJsonError(parsedBody.status || 400, parsedBody.error || 'Invalid request payload');
    }

    const payload = parsedBody.data;
    if (
      !payload ||
      !payload.triggerIncident ||
      typeof payload.triggerIncident !== 'object' ||
      typeof payload.triggerIncident.title !== 'string' ||
      payload.triggerIncident.title.trim().length === 0 ||
      payload.triggerIncident.title.length > 300
    ) {
      return sanitizeJsonError(400, 'Invalid reallocation explanation payload');
    }
    const { recommendation, triggerIncident, donorIncident, resource } = payload;

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      console.warn('GEMINI_API_KEY not configured. Returning deterministic fallback summary.');
      return new Response(
        JSON.stringify({
          fallback: true,
          summary: `${triggerIncident?.title || 'Higher Priority Emergency'} requires emergency response reallocation.`,
          reason: `Higher priority incident (${triggerIncident?.priorityLevel || 'CRITICAL'}) outweighs lower priority assignment.`,
          operator_action: `Review and confirm reassignment of ${resource?.resourceCode || 'unit'}.`,
          risk: `Response time for ${donorIncident?.title || 'displaced incident'} may increase.`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are ResQAI, an emergency decision-support AI for control room operators.
Your role is to summarize and explain a proposed DYNAMIC RESOURCE REALLOCATION recommended by ResQAI's deterministic optimization engine.

STRICT MANDATORY RULES:
1. You MUST NOT choose resource IDs or change dispatch choices.
2. You MUST NOT dispatch resources or modify assignments directly.
3. You MUST NOT override the deterministic engine's scores.
4. You MUST provide a clear, professional, human-in-the-loop explanation for operator decision-making.

Return strictly valid JSON matching this exact structure:
{
  "summary": "Concise summary of why dynamic reallocation was triggered",
  "reason": "Detailed explanation of priority differences, emergency severity, and system response efficiency gain",
  "operator_action": "Clear actionable instruction for control room operator review",
  "risk": "Assessment of potential trade-off or risk for the displaced/donor incident"
}`;

    const userPrompt = `Reallocation Scenario:
- Trigger Incident: ${triggerIncident?.incidentNumber || 'N/A'} - "${triggerIncident?.title}" (Priority: ${triggerIncident?.priorityLevel}, Score: ${triggerIncident?.priorityScore}/100)
- Displaced/Donor Incident: ${donorIncident?.incidentNumber || 'N/A'} - "${donorIncident?.title}" (Priority: ${donorIncident?.priorityLevel}, Score: ${donorIncident?.priorityScore}/100)
- Reassigned Unit: ${resource?.resourceCode || 'Emergency Unit'} (${resource?.type || 'RESOURCE'})
- System Quality Improvement: +${recommendation?.improvement || 15} points
- Reason from Engine: ${recommendation?.explanation || 'Deterministic Pareto Optimization'}`;

    const geminiResponse = await callGeminiGenerateContent({
      apiKey: geminiApiKey,
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

    if (!geminiResponse.ok) {
      console.warn('Gemini API returned HTTP status:', geminiResponse.status);
      return new Response(
        JSON.stringify({
          fallback: true,
          summary: `${triggerIncident?.title || 'Critical Incident'} triggered dynamic reallocation.`,
          reason: `System quality improvement +${recommendation?.improvement || 10} pts.`,
          operator_action: `Review proposed reassignment of ${resource?.resourceCode || 'unit'}.`,
          risk: `Displaced incident ${donorIncident?.incidentNumber || ''} will await replacement unit.`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawText = geminiResponse.text || '';

    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText);
    } catch {
      parsedResult = {
        summary: `${triggerIncident?.incidentNumber || 'Emergency'} requires high-priority response unit reallocation.`,
        reason: `Deterministic engine calculated higher overall response efficiency.`,
        operator_action: `Operator review required for unit ${resource?.resourceCode || ''}.`,
        risk: `Donor incident response time extended.`,
      };
    }

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        fallback: true,
        summary: 'Dynamic reallocation recommendation ready.',
        reason: 'Rule engine optimization applied.',
        operator_action: 'Operator review requested.',
        risk: 'Standard dispatch queue active.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
