import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders,
  requireAuthenticatedUser,
  getServiceSupabaseClient,
  checkRateLimit,
  parseJsonWithLimit,
  isValidUuid,
  sanitizeJsonError,
} from '../_shared/security.ts';
import {
  resolveGeminiModel,
  callGeminiGenerateContent,
  extractGeminiResponseText,
} from '../_shared/gemini.ts';

/**
 * Gemini AI Conversational Assistant for ResQAI Operations
 * 
 * Provides operators with natural language answers about the live operational state.
 * Uses controlled read-only function tools — Gemini CANNOT modify any data.
 * 
 * Supports streaming SSE responses.
 */

// ─── CONTROLLED READ-ONLY TOOL DEFINITIONS ─────────────────────────────────

const TOOL_DECLARATIONS = [
  {
    name: 'get_active_incidents',
    description: 'Get all currently active incidents with their priority scores, status, and location. Returns incidents that are not RESOLVED or CLOSED.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_incident_details',
    description: 'Get detailed information about a specific incident by its ID or incident number.',
    parameters: {
      type: 'object',
      properties: {
        incident_id: { type: 'string', description: 'The incident UUID or incident number (e.g. INC-204)' },
      },
      required: ['incident_id'],
    },
  },
  {
    name: 'get_available_resources',
    description: 'Get all available emergency resources (AMBULANCE, FIRE_UNIT, POLICE_UNIT, RESCUE_TEAM) with their location and capabilities.',
    parameters: {
      type: 'object',
      properties: {
        resource_type: { type: 'string', description: 'Optional: filter by resource type (AMBULANCE, FIRE_UNIT, POLICE_UNIT, RESCUE_TEAM)' },
      },
      required: [],
    },
  },
  {
    name: 'get_environmental_events',
    description: 'Get recent environmental events (earthquakes from USGS, active fires from NASA FIRMS, weather alerts from IMD) from the last 6 hours.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Optional: filter by source (USGS, NASA_FIRMS, IMD)' },
        limit: { type: 'number', description: 'Maximum events to return (default: 10, max: 20)' },
      },
      required: [],
    },
  },
  {
    name: 'get_current_weather',
    description: 'Get the latest IMD weather observation for the operational area.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_current_system_quality',
    description: 'Get current system metrics: active incident count, critical incidents, available resources, resource utilization, etc.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_recent_reallocation_events',
    description: 'Get the most recent dynamic resource reallocation events and their operator decisions.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of events to return (default: 5)' },
      },
      required: [],
    },
  },
  {
    name: 'get_incident_timeline',
    description: 'Get the operational event timeline showing recent activity: incident creations, priority changes, environmental events, AI analyses, operator actions.',
    parameters: {
      type: 'object',
      properties: {
        incident_id: { type: 'string', description: 'Optional: filter timeline for a specific incident' },
        limit: { type: 'number', description: 'Number of events to return (default: 20)' },
      },
      required: [],
    },
  },
];

// ─── TOOL EXECUTION (READ-ONLY DATABASE ACCESS) ─────────────────────────────

async function executeTool(toolName: string, toolArgs: Record<string, any>, supabase: any): Promise<any> {
  switch (toolName) {
    case 'get_active_incidents': {
      const { data } = await supabase
        .from('incidents')
        .select('id, incident_number, title, emergency_type, status, priority_level, priority_score, people_affected, injury_level, latitude, longitude, address, reported_at')
        .not('status', 'in', '("RESOLVED","CLOSED")')
        .order('priority_score', { ascending: false })
        .limit(20);
      return { incidents: data || [], count: (data || []).length };
    }

    case 'get_incident_details': {
      const rawQuery = typeof toolArgs.incident_id === 'string' ? toolArgs.incident_id.trim() : '';
      if (isValidUuid(rawQuery)) {
        const { data } = await supabase
          .from('incidents')
          .select('*')
          .eq('id', rawQuery)
          .limit(1)
          .single();
        return data || { error: 'Incident not found' };
      }
      const safeCode = rawQuery.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
      if (!safeCode) {
        return { error: 'Invalid incident identifier' };
      }
      const { data } = await supabase
        .from('incidents')
        .select('*')
        .ilike('incident_number', `%${safeCode}%`)
        .limit(1)
        .single();
      return data || { error: 'Incident not found' };
    }

    case 'get_available_resources': {
      let q = supabase
        .from('resources')
        .select('id, resource_code, resource_type, status, latitude, longitude, station_name, capabilities, is_active')
        .eq('is_active', true);
      if (toolArgs.resource_type) q = q.eq('resource_type', toolArgs.resource_type);
      q = q.in('status', ['AVAILABLE', 'ASSIGNED', 'BUSY']).order('status').limit(30);
      const { data } = await q;
      const resources = data || [];
      return {
        available: resources.filter((r: any) => r.status === 'AVAILABLE'),
        assigned: resources.filter((r: any) => r.status === 'ASSIGNED'),
        busy: resources.filter((r: any) => r.status === 'BUSY'),
        total: resources.length,
      };
    }

    case 'get_environmental_events': {
      const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const limit = Math.min(toolArgs.limit || 10, 20);
      let q = supabase
        .from('external_events')
        .select('id, source, event_type, title, magnitude, severity, latitude, longitude, occurred_at, status')
        .gte('occurred_at', cutoff)
        .order('occurred_at', { ascending: false })
        .limit(limit);
      if (toolArgs.source) q = q.eq('source', toolArgs.source);
      const { data: eventsData } = await q;

      // Also fetch IMD environmental alerts
      const { data: alertsData } = await supabase
        .from('environmental_alerts')
        .select('id, source, alert_type, severity, title, description, affected_area, starts_at')
        .eq('status', 'ACTIVE')
        .order('starts_at', { ascending: false })
        .limit(5);

      return { external_events: eventsData || [], imd_alerts: alertsData || [] };
    }

    case 'get_current_weather': {
      const { data } = await supabase
        .from('weather_observations')
        .select('*')
        .order('observed_at', { ascending: false })
        .limit(1)
        .single();
      return data || { message: 'No weather observation available' };
    }

    case 'get_current_system_quality': {
      const [incidentsRes, resourcesRes] = await Promise.all([
        supabase.from('incidents').select('id, priority_level, status').not('status', 'in', '("RESOLVED","CLOSED")'),
        supabase.from('resources').select('id, status, is_active').eq('is_active', true),
      ]);
      const incidents = incidentsRes.data || [];
      const resources = resourcesRes.data || [];
      return {
        activeIncidents: incidents.length,
        criticalIncidents: incidents.filter((i: any) => i.priority_level === 'CRITICAL').length,
        highIncidents: incidents.filter((i: any) => i.priority_level === 'HIGH').length,
        availableResources: resources.filter((r: any) => r.status === 'AVAILABLE').length,
        assignedResources: resources.filter((r: any) => r.status === 'ASSIGNED' || r.status === 'BUSY').length,
        totalActiveResources: resources.length,
        utilizationPercent: resources.length > 0
          ? Math.round((resources.filter((r: any) => r.status !== 'AVAILABLE').length / resources.length) * 100)
          : 0,
      };
    }

    case 'get_recent_reallocation_events': {
      const limit = Math.min(toolArgs.limit || 5, 10);
      const { data } = await supabase
        .from('reallocation_events')
        .select('id, trigger_incident_id, current_quality, proposed_quality, improvement, status, created_at, recommendation_data')
        .order('created_at', { ascending: false })
        .limit(limit);
      return { reallocationEvents: data || [] };
    }

    case 'get_incident_timeline': {
      const limit = Math.min(toolArgs.limit || 20, 50);
      let q = supabase
        .from('ai_event_timeline')
        .select('id, event_type, title, description, severity, source, incident_id, occurred_at')
        .order('occurred_at', { ascending: false })
        .limit(limit);
      if (toolArgs.incident_id && isValidUuid(toolArgs.incident_id)) {
        q = q.eq('incident_id', toolArgs.incident_id.trim());
      }
      const { data } = await q;
      return { timeline: data || [] };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await requireAuthenticatedUser(req, ['ADMIN', 'DISPATCHER']);
    if (!auth.ok) {
      return sanitizeJsonError(auth.status || 401, auth.error || 'Unauthorized');
    }

    const rate = checkRateLimit(`gemini-assistant:${auth.userId}`, 25, 60_000);
    if (!rate.allowed) {
      return sanitizeJsonError(429, 'Rate limit exceeded. Please wait before sending more messages.', {
        retryAfterSec: rate.retryAfterSec,
      });
    }

    const parsedBody = await parseJsonWithLimit(req, 65_536, { allowEmpty: false });
    if (!parsedBody.ok) {
      return sanitizeJsonError(parsedBody.status || 400, parsedBody.error || 'Invalid request payload');
    }

    const body = parsedBody.data;
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const rawSessionId = typeof body?.session_id === 'string' ? body.session_id.trim() : '';
    const session_id = rawSessionId && /^[A-Za-z0-9_-]{1,100}$/.test(rawSessionId) ? rawSessionId : undefined;
    const history = Array.isArray(body?.history) ? body.history : [];

    if (!message || message.length > 4000) {
      return sanitizeJsonError(400, 'Missing or invalid message (1-4000 characters required)');
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabase = getServiceSupabaseClient();

    // Persist user message
    if (session_id) {
      await supabase.from('ai_assistant_conversations').insert({
        session_id,
        role: 'user',
        message,
        created_at: new Date().toISOString(),
      });
    }

    if (!geminiApiKey) {
      const fallbackMsg = 'Gemini AI is currently unavailable (API key not configured). The deterministic ResQAI engines remain operational for emergency management.';
      if (session_id) {
        await supabase.from('ai_assistant_conversations').insert({
          session_id, role: 'assistant', message: fallbackMsg, model_name: 'fallback',
        });
      }
      return new Response(
        JSON.stringify({ success: true, response: fallbackMsg, model: 'fallback', isGemini: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemInstruction = `You are ResQAI Assistant — an AI decision-support tool for emergency control room operators.

Your role:
- Answer questions about the current live operational state using the provided tools
- Provide clear, factual analysis based on ACTUAL data retrieved via tools
- Support operators in making better decisions — you do NOT make operational decisions

CRITICAL CONSTRAINTS:
1. You CANNOT dispatch resources, approve reallocations, or modify any operational data
2. Every factual claim must come from tool results — do NOT invent data
3. If data is unavailable, say so explicitly
4. Clearly distinguish: SYSTEM FACT vs AI INTERPRETATION vs RECOMMENDATION
5. Keep responses concise and actionable for a control room operator

When asked about incidents, resources, or environmental events — ALWAYS use your tools to get current data.`;

    // Build conversation history for multi-turn (strictly sanitized roles and bounded text)
    const contents: any[] = [];
    for (const turn of history.slice(-10)) {
      const normalizedRole =
        turn?.role === 'assistant' || turn?.role === 'model'
          ? 'model'
          : turn?.role === 'user'
          ? 'user'
          : null;
      if (
        normalizedRole &&
        typeof turn.content === 'string' &&
        turn.content.trim().length > 0
      ) {
        contents.push({ role: normalizedRole, parts: [{ text: turn.content.slice(0, 2000) }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    // ── Gemini multi-turn with function calling ──
    let response = '';
    let modelUsed = resolveGeminiModel();
    const toolResults: Array<{ name: string; result: any }> = [];
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    let currentContents = [...contents];

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const geminiResult = await callGeminiGenerateContent({
        apiKey: geminiApiKey,
        model: modelUsed,
        timeoutMs: 25_000,
        body: {
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: currentContents,
          tools: [{ function_declarations: TOOL_DECLARATIONS }],
          tool_config: { function_calling_config: { mode: 'AUTO' } },
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
          },
        },
      });

      if (!geminiResult.ok) {
        throw new Error(geminiResult.error || `Gemini API error: ${geminiResult.status}`);
      }

      const geminiData = geminiResult.data;
      const candidate = geminiData?.candidates?.[0];

      if (!candidate) throw new Error('No response from Gemini');

      // Check if Gemini wants to call a function
      const functionCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall) || [];

      if (functionCalls.length === 0) {
        // Final text response (excludes any internal thought parts)
        response = extractGeminiResponseText(geminiData);
        break;
      }

      // Execute function calls (read-only tools)
      const functionResponses: any[] = [];

      for (const part of candidate.content.parts) {
        if (!part.functionCall) continue;
        const { name, args } = part.functionCall;
        const toolResult = await executeTool(name, args || {}, supabase);
        toolResults.push({ name, result: toolResult });

        functionResponses.push({
          functionResponse: {
            name,
            response: { result: toolResult },
          },
        });
      }

      // Continue conversation with function results
      currentContents = [
        ...currentContents,
        { role: 'model', parts: candidate.content.parts },
        { role: 'user', parts: functionResponses },
      ];
    }

    // Persist assistant response
    if (session_id && response) {
      await supabase.from('ai_assistant_conversations').insert({
        session_id,
        role: 'assistant',
        message: response,
        model_name: modelUsed,
        context_snapshot: { toolsUsed: toolResults.map(t => t.name), toolCount: toolResults.length },
        created_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        response,
        model: modelUsed,
        isGemini: true,
        toolsUsed: toolResults.map(t => t.name),
        toolResults: toolResults.slice(0, 3), // return first 3 for transparency
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[GeminiAssistant]', err?.message);
    return new Response(
      JSON.stringify({
        success: false,
        response: 'Gemini AI is temporarily unavailable. The deterministic emergency management engines remain operational.',
        error: 'Assistant request could not be processed.',
        isGemini: false,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
