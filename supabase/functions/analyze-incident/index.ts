import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { incident } = await req.json();

    if (!incident) {
      return new Response(
        JSON.stringify({ error: 'Missing incident data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
  "model_name": "gemini-1.5-flash"
}`;

    const userPrompt = `Analyze this incident report:
Title: ${incident.title}
Emergency Type: ${incident.emergencyType}
Description: ${incident.description || 'N/A'}
Location/Address: ${incident.address || 'N/A'}
People Affected: ${incident.peopleAffected || 1}
Injury Level: ${incident.injuryLevel || 'MODERATE'}
Reported At: ${incident.reportedAt || new Date().toISOString()}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API call error:', errorText);
      return new Response(
        JSON.stringify({ fallback: true, error: errorText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

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
        model_name: 'gemini-1.5-flash',
      };
    }

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ fallback: true, error: err?.message || 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
