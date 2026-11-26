/**
 * Shared Gemini Developer API model configuration and REST request helpers
 * for ResQAI Supabase Edge Functions.
 */

export const GEMINI_DEFAULT_MODEL = 'gemini-3.8-flash';
export const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

const SAFE_MODEL_SLUG_RE = /^[a-z0-9][a-z0-9.-]{1,63}$/i;

/**
 * Resolves the active Gemini model ID, allowing an optional validated
 * `GEMINI_MODEL` Edge Function secret override while defaulting to `gemini-3.8-flash`.
 */
export function resolveGeminiModel(): string {
  try {
    const rawOverride =
      typeof Deno !== 'undefined' && typeof Deno.env?.get === 'function'
        ? Deno.env.get('GEMINI_MODEL')
        : '';
    const trimmed = (rawOverride || '').trim();
    if (trimmed && SAFE_MODEL_SLUG_RE.test(trimmed)) {
      return trimmed;
    }
  } catch {
    // Ignore env read errors and fall back to default model
  }
  return GEMINI_DEFAULT_MODEL;
}

export function getGeminiGenerateContentUrl(model: string = resolveGeminiModel()): string {
  const safeModel = SAFE_MODEL_SLUG_RE.test(model) ? model : GEMINI_DEFAULT_MODEL;
  return `${GEMINI_API_BASE_URL}/models/${safeModel}:generateContent`;
}

/**
 * Extracts visible text parts from a Gemini generateContent response while
 * excluding internal reasoning/thought parts (`part.thought === true`).
 */
export function extractGeminiResponseText(geminiData: any): string {
  const parts = geminiData?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .filter((p: any) => p && p.thought !== true && typeof p.text === 'string')
    .map((p: any) => p.text)
    .join('');
}

export interface GeminiCallResult {
  ok: boolean;
  status: number;
  model: string;
  data?: any;
  text?: string;
  error?: string;
}

/**
 * Calls the Gemini REST `generateContent` endpoint using the `x-goog-api-key`
 * header (never embedding the API key in the request URL) with an explicit timeout.
 */
export async function callGeminiGenerateContent(params: {
  apiKey: string;
  body: Record<string, unknown>;
  timeoutMs?: number;
  model?: string;
  fetchImpl?: typeof fetch;
}): Promise<GeminiCallResult> {
  const model = params.model || resolveGeminiModel();
  const url = getGeminiGenerateContentUrl(model);
  const fetchFn = params.fetchImpl || fetch;
  const timeoutMs = params.timeoutMs ?? 15_000;

  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': params.apiKey,
      },
      body: JSON.stringify(params.body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        model,
        error: `Gemini API HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const text = extractGeminiResponseText(data);
    return {
      ok: true,
      status: res.status,
      model,
      data,
      text,
    };
  } catch (err: unknown) {
    const isTimeout =
      err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return {
      ok: false,
      status: isTimeout ? 504 : 502,
      model,
      error: isTimeout ? 'Gemini API request timed out' : 'Gemini API network error',
    };
  }
}
