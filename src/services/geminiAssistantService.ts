import { supabase, isSupabaseConfigured } from './supabase';
import { DEFAULT_GEMINI_MODEL } from '../config/ai';

export interface GeminiAssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
  isGemini?: boolean;
  toolsUsed?: string[];
  isStreaming?: boolean;
  isError?: boolean;
}

export interface AssistantResponse {
  success: boolean;
  response: string;
  model: string;
  isGemini: boolean;
  toolsUsed: string[];
}

/**
 * Sends a message to the Gemini AI Assistant via Edge Function.
 * The assistant has access to controlled read-only tools to query live operational data.
 * Never exposes Gemini API key to the browser.
 */
export async function sendAssistantMessage(
  message: string,
  sessionId: string,
  history: Array<{ role: string; content: string }>
): Promise<AssistantResponse> {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      response: 'Gemini AI Assistant is unavailable in offline/demo mode. The deterministic ResQAI engines remain operational for emergency management.',
      model: 'offline-fallback',
      isGemini: false,
      toolsUsed: [],
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('gemini-assistant', {
      body: {
        message,
        session_id: sessionId,
        history: history.slice(-8), // last 8 turns for context
      },
    });

    if (error) throw error;

    return {
      success: data?.success ?? false,
      response: data?.response || 'No response received.',
      model: data?.model || DEFAULT_GEMINI_MODEL,
      isGemini: data?.isGemini ?? false,
      toolsUsed: data?.toolsUsed || [],
    };
  } catch (err: any) {
    console.error('[GeminiAssistantService] Error:', err?.message);
    return {
      success: false,
      response: 'Gemini AI is temporarily unavailable. The deterministic emergency management engines remain fully operational.',
      model: 'error-fallback',
      isGemini: false,
      toolsUsed: [],
    };
  }
}

/**
 * Fetches conversation history for a session from the database.
 */
export async function getConversationHistory(sessionId: string): Promise<GeminiAssistantMessage[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data } = await supabase
      .from('ai_assistant_conversations')
      .select('role, message, model_name, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(50);

    return (data || []).map((row: any) => ({
      role: row.role,
      content: row.message,
      timestamp: row.created_at,
      model: row.model_name,
      isGemini: row.model_name !== 'fallback' && row.model_name !== 'offline-fallback',
    }));
  } catch {
    return [];
  }
}

/**
 * Generate a unique session ID for a new conversation.
 */
export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
