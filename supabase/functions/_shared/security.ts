import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, x-cron-secret, content-type',
};

export type EdgeUserRole = 'ADMIN' | 'DISPATCHER' | 'FIELD_RESPONDER';

export interface AuthValidationResult {
  ok: boolean;
  status?: number;
  error?: string;
  userId?: string;
  role?: EdgeUserRole | 'SERVICE_ROLE' | 'CRON_SCHEDULER';
  isMachineCaller?: boolean;
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function normalizeEdgeRole(rawRole?: string | null): EdgeUserRole | null {
  if (!rawRole) return null;
  const upper = rawRole.trim().toUpperCase();
  if (upper === 'ADMIN') return 'ADMIN';
  if (upper === 'DISPATCHER' || upper === 'CONTROL_ROOM_OPERATOR') return 'DISPATCHER';
  if (upper === 'FIELD_RESPONDER') return 'FIELD_RESPONDER';
  return null;
}

/**
 * Compares two secrets in constant time over fixed-length 32-byte SHA-256 digests,
 * avoiding secret-length timing leaks and never logging secrets or hashes.
 */
export async function timingSafeEqualSecret(a: string, b: string): Promise<boolean> {
  if (!a || !b) return false;
  const encoder = new TextEncoder();
  const [digestA, digestB] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const bytesA = new Uint8Array(digestA);
  const bytesB = new Uint8Array(digestB);
  let diff = 0;
  for (let i = 0; i < bytesA.length; i++) {
    diff |= bytesA[i] ^ bytesB[i];
  }
  return diff === 0;
}

export function getServiceSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceKey) {
    throw new Error('Server configuration incomplete');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Validates either an interactive authenticated user (JWT + active profile + RBAC role)
 * OR, when `allowServiceOrCron` is true, a trusted internal service-role bearer token
 * or `x-cron-secret` matching `Deno.env.get('CRON_SECRET')`.
 */
export async function requireAuthenticatedUser(
  req: Request,
  allowedRoles: readonly EdgeUserRole[] = ['ADMIN', 'DISPATCHER'],
  options: { allowServiceOrCron?: boolean } = {}
): Promise<AuthValidationResult> {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const cronSecret = Deno.env.get('CRON_SECRET') || '';

  if (options.allowServiceOrCron) {
    const reqCronSecret = (req.headers.get('x-cron-secret') || '').trim();
    if (cronSecret && reqCronSecret && (await timingSafeEqualSecret(reqCronSecret, cronSecret))) {
      return {
        ok: true,
        userId: 'cron-scheduler',
        role: 'CRON_SCHEDULER',
        isMachineCaller: true,
      };
    }
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Missing bearer authorization token' };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return { ok: false, status: 401, error: 'Empty authorization token' };
  }

  if (options.allowServiceOrCron && serviceKey && (await timingSafeEqualSecret(token, serviceKey))) {
    return {
      ok: true,
      userId: 'service-role-internal',
      role: 'SERVICE_ROLE',
      isMachineCaller: true,
    };
  }

  const url = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || serviceKey;

  if (!url || !anonKey) {
    return { ok: false, status: 500, error: 'Auth service configuration unavailable' };
  }

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { ok: false, status: 401, error: 'Invalid or expired authentication token' };
  }

  const adminClient = createClient(url, serviceKey || anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile, error: profErr } = await adminClient
    .from('profiles')
    .select('role, is_active')
    .eq('id', userData.user.id)
    .single();

  if (profErr || !profile || profile.is_active === false) {
    return { ok: false, status: 403, error: 'Operator profile inactive or missing' };
  }

  const normalizedRole = normalizeEdgeRole(profile.role);
  if (!normalizedRole || !allowedRoles.includes(normalizedRole)) {
    return { ok: false, status: 403, error: 'Insufficient role privileges for this operation' };
  }

  return {
    ok: true,
    userId: userData.user.id,
    role: normalizedRole,
    isMachineCaller: false,
  };
}

export function checkRateLimit(
  subjectKey: string,
  maxRequests = 30,
  windowMs = 60_000
): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const entry = rateBuckets.get(subjectKey);

  if (!entry || now >= entry.resetAt) {
    rateBuckets.set(subjectKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return { allowed: true };
}

export function validateCoordinates(lat: unknown, lon: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

export const MAX_JSON_PAYLOAD_BYTES = 65_536;

export function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
  );
}

/**
 * Validates a comma-separated bounding box string "minLon,minLat,maxLon,maxLat"
 * and prevents path traversal or query injection into upstream API URLs.
 */
export function validateBbox(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const parts = raw.split(',').map((p) => p.trim());
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => Number(p));
  const [minLon, minLat, maxLon, maxLat] = nums;
  if (!validateCoordinates(minLat, minLon) || !validateCoordinates(maxLat, maxLon)) {
    return null;
  }
  if (minLon >= maxLon || minLat >= maxLat) {
    return null;
  }
  return `${minLon},${minLat},${maxLon},${maxLat}`;
}

/**
 * Redacts API keys, bearer tokens, and secret query/path values from diagnostic strings.
 */
export function scrubSecrets(raw: string): string {
  return raw
    .replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/(\/api\/area\/csv\/)[^/\s]+/gi, '$1[REDACTED]')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED]')
    .replace(/(sb_secret_|AIza)[A-Za-z0-9_-]{8,}/g, '[REDACTED]');
}

/**
 * Parses a JSON object body while enforcing a strict byte-size limit to prevent
 * oversized payload abuse or malformed JSON crashes.
 */
export async function parseJsonWithLimit(
  req: Request,
  maxBytes = MAX_JSON_PAYLOAD_BYTES,
  options: { allowEmpty?: boolean } = {}
): Promise<{ ok: boolean; data?: Record<string, any>; status?: number; error?: string }> {
  const allowEmpty = options.allowEmpty ?? true;
  const contentLenHeader = req.headers.get('content-length');
  if (contentLenHeader) {
    const declaredBytes = Number(contentLenHeader);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      return {
        ok: false,
        status: 413,
        error: `Request payload exceeds maximum allowed size (${maxBytes} bytes).`,
      };
    }
  }

  let rawText = '';
  try {
    rawText = await req.text();
  } catch {
    return { ok: false, status: 400, error: 'Unable to read request body.' };
  }

  const actualBytes = new TextEncoder().encode(rawText).byteLength;
  if (actualBytes > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: `Request payload exceeds maximum allowed size (${maxBytes} bytes).`,
    };
  }

  if (!rawText.trim()) {
    return allowEmpty
      ? { ok: true, data: {} }
      : { ok: false, status: 400, error: 'JSON request body is required.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, status: 400, error: 'Malformed JSON request body.' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, status: 400, error: 'JSON object payload expected.' };
  }

  return { ok: true, data: parsed as Record<string, any> };
}

export function sanitizeJsonError(
  status: number,
  publicMessage: string,
  extra: Record<string, unknown> = {}
) {
  return new Response(
    JSON.stringify({ success: false, error: publicMessage, ...extra }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}
