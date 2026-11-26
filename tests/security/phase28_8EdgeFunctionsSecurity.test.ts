import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Mocked Supabase ESM client + Deno.env for Edge Security Module Runtime Tests
// ---------------------------------------------------------------------------
const edgeMockState = vi.hoisted(() => ({
  tokens: new Map<string, { user?: { id: string }; error?: string }>(),
  profiles: new Map<string, { role: string; is_active: boolean }>(),
  env: new Map<string, string>(),
}));

vi.mock('https://esm.sh/@supabase/supabase-js@2.39.8', () => ({
  createClient: () => ({
    auth: {
      getUser: async (token: string) => {
        const entry = edgeMockState.tokens.get(token);
        if (!entry || entry.error || !entry.user) {
          return {
            data: { user: null },
            error: { message: entry?.error || 'Invalid or expired JWT' },
          };
        }
        return { data: { user: entry.user }, error: null };
      },
    },
    from: (table: string) => {
      let idFilter = '';
      const chain: any = {
        select: () => chain,
        eq: (col: string, val: string) => {
          if (col === 'id') idFilter = val;
          return chain;
        },
        single: async () => {
          if (table === 'profiles') {
            const prof = edgeMockState.profiles.get(idFilter);
            return prof ? { data: prof, error: null } : { data: null, error: { message: 'Profile not found' } };
          }
          return { data: null, error: null };
        },
      };
      return chain;
    },
  }),
}));

import {
  requireAuthenticatedUser,
  parseJsonWithLimit,
  validateCoordinates,
  validateBbox,
  isValidUuid,
  scrubSecrets,
  sanitizeJsonError,
} from '../../supabase/functions/_shared/security';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const DISPATCHER_ID = '22222222-2222-4222-8222-222222222222';
const RESPONDER_ID = '33333333-3333-4333-8333-333333333333';
const INACTIVE_ID = '44444444-4444-4444-8444-444444444444';

describe('Phase 28.8 Edge Function Security Audit & Hardening Tests (Mocked Runtime + Source Contracts)', () => {
  beforeEach(() => {
    edgeMockState.tokens.clear();
    edgeMockState.profiles.clear();
    edgeMockState.env.clear();

    edgeMockState.env.set('SUPABASE_URL', 'https://itmeoierfppvoaljebco.supabase.co');
    edgeMockState.env.set('SUPABASE_ANON_KEY', 'mock-anon-key');
    edgeMockState.env.set('SUPABASE_SERVICE_ROLE_KEY', 'mock-service-role-secret-12345');
    edgeMockState.env.set('CRON_SECRET', 'mock-cron-secret-32-chars-minimum!!');

    edgeMockState.tokens.set('jwt-admin', { user: { id: ADMIN_ID } });
    edgeMockState.profiles.set(ADMIN_ID, { role: 'ADMIN', is_active: true });

    edgeMockState.tokens.set('jwt-dispatcher', { user: { id: DISPATCHER_ID } });
    edgeMockState.profiles.set(DISPATCHER_ID, { role: 'DISPATCHER', is_active: true });

    edgeMockState.tokens.set('jwt-responder', { user: { id: RESPONDER_ID } });
    edgeMockState.profiles.set(RESPONDER_ID, { role: 'FIELD_RESPONDER', is_active: true });

    edgeMockState.tokens.set('jwt-inactive', { user: { id: INACTIVE_ID } });
    edgeMockState.profiles.set(INACTIVE_ID, { role: 'ADMIN', is_active: false });

    edgeMockState.tokens.set('jwt-expired', { error: 'JWT expired' });

    vi.stubGlobal('Deno', {
      env: {
        get: (k: string) => edgeMockState.env.get(k) ?? '',
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('rejects missing, invalid, and expired JWTs with HTTP 401', async () => {
    const missingJwt = new Request('https://edge.test/fn', { method: 'POST' });
    const rMissing = await requireAuthenticatedUser(missingJwt, ['ADMIN', 'DISPATCHER']);
    expect(rMissing.ok).toBe(false);
    expect(rMissing.status).toBe(401);

    const invalidJwt = new Request('https://edge.test/fn', {
      method: 'POST',
      headers: { Authorization: 'Bearer not-a-real-jwt' },
    });
    const rInvalid = await requireAuthenticatedUser(invalidJwt, ['ADMIN', 'DISPATCHER']);
    expect(rInvalid.ok).toBe(false);
    expect(rInvalid.status).toBe(401);

    const expiredJwt = new Request('https://edge.test/fn', {
      method: 'POST',
      headers: { Authorization: 'Bearer jwt-expired' },
    });
    const rExpired = await requireAuthenticatedUser(expiredJwt, ['ADMIN', 'DISPATCHER']);
    expect(rExpired.ok).toBe(false);
    expect(rExpired.status).toBe(401);
  });

  it('rejects inactive profiles and unauthorized FIELD_RESPONDER while authorizing DISPATCHER and ADMIN', async () => {
    const inactiveReq = new Request('https://edge.test/fn', {
      headers: { Authorization: 'Bearer jwt-inactive' },
    });
    const rInactive = await requireAuthenticatedUser(inactiveReq, ['ADMIN', 'DISPATCHER']);
    expect(rInactive.ok).toBe(false);
    expect(rInactive.status).toBe(403);

    // FIELD_RESPONDER denied on dispatcher/admin endpoints
    const responderReq = new Request('https://edge.test/fn', {
      headers: { Authorization: 'Bearer jwt-responder' },
    });
    const rResponderDenied = await requireAuthenticatedUser(responderReq, ['ADMIN', 'DISPATCHER']);
    expect(rResponderDenied.ok).toBe(false);
    expect(rResponderDenied.status).toBe(403);

    // FIELD_RESPONDER permitted on weather ingestion explicitly listing FIELD_RESPONDER
    const rResponderWeather = await requireAuthenticatedUser(
      responderReq,
      ['ADMIN', 'DISPATCHER', 'FIELD_RESPONDER'],
      { allowServiceOrCron: true }
    );
    expect(rResponderWeather.ok).toBe(true);
    expect(rResponderWeather.role).toBe('FIELD_RESPONDER');

    // DISPATCHER & ADMIN authorized
    const dispatcherReq = new Request('https://edge.test/fn', {
      headers: { Authorization: 'Bearer jwt-dispatcher' },
    });
    const rDispatcher = await requireAuthenticatedUser(dispatcherReq, ['ADMIN', 'DISPATCHER']);
    expect(rDispatcher.ok).toBe(true);
    expect(rDispatcher.role).toBe('DISPATCHER');

    const adminReq = new Request('https://edge.test/fn', {
      headers: { Authorization: 'Bearer jwt-admin' },
    });
    const rAdmin = await requireAuthenticatedUser(adminReq, ['ADMIN', 'DISPATCHER']);
    expect(rAdmin.ok).toBe(true);
    expect(rAdmin.role).toBe('ADMIN');
  });

  it('rejects missing/invalid CRON_SECRET and allows valid CRON_SECRET only on allowServiceOrCron endpoints', async () => {
    const missingCronReq = new Request('https://edge.test/ingest-earthquakes', { method: 'POST' });
    const rMissing = await requireAuthenticatedUser(missingCronReq, ['ADMIN', 'DISPATCHER'], {
      allowServiceOrCron: true,
    });
    expect(rMissing.ok).toBe(false);
    expect(rMissing.status).toBe(401);

    const invalidCronReq = new Request('https://edge.test/ingest-earthquakes', {
      method: 'POST',
      headers: { 'x-cron-secret': 'wrong-cron-secret' },
    });
    const rInvalid = await requireAuthenticatedUser(invalidCronReq, ['ADMIN', 'DISPATCHER'], {
      allowServiceOrCron: true,
    });
    expect(rInvalid.ok).toBe(false);
    expect(rInvalid.status).toBe(401);

    const validCronReq = new Request('https://edge.test/ingest-earthquakes', {
      method: 'POST',
      headers: { 'x-cron-secret': 'mock-cron-secret-32-chars-minimum!!' },
    });
    const rValidHybrid = await requireAuthenticatedUser(validCronReq, ['ADMIN', 'DISPATCHER'], {
      allowServiceOrCron: true,
    });
    expect(rValidHybrid.ok).toBe(true);
    expect(rValidHybrid.role).toBe('CRON_SCHEDULER');

    // Interactive-only endpoint must reject CRON_SECRET
    const rRejectedInteractive = await requireAuthenticatedUser(validCronReq, ['ADMIN', 'DISPATCHER']);
    expect(rRejectedInteractive.ok).toBe(false);
    expect(rRejectedInteractive.status).toBe(401);
  });

  it('blocks malformed payloads, non-object JSON, and oversized payloads via parseJsonWithLimit()', async () => {
    const malformedReq = new Request('https://edge.test/fn', {
      method: 'POST',
      body: '{"incident": { broken json',
    });
    const rMalformed = await parseJsonWithLimit(malformedReq, 1024, { allowEmpty: false });
    expect(rMalformed.ok).toBe(false);
    expect(rMalformed.status).toBe(400);

    const arrayReq = new Request('https://edge.test/fn', {
      method: 'POST',
      body: '[1, 2, 3]',
    });
    const rArray = await parseJsonWithLimit(arrayReq, 1024, { allowEmpty: false });
    expect(rArray.ok).toBe(false);
    expect(rArray.status).toBe(400);

    const oversizedReq = new Request('https://edge.test/fn', {
      method: 'POST',
      body: JSON.stringify({ data: 'x'.repeat(2000) }),
    });
    const rOversized = await parseJsonWithLimit(oversizedReq, 512, { allowEmpty: false });
    expect(rOversized.ok).toBe(false);
    expect(rOversized.status).toBe(413);

    const spoofedLenReq = new Request('https://edge.test/fn', {
      method: 'POST',
      headers: { 'content-length': '999999' },
      body: '{}',
    });
    const rHeaderTooBig = await parseJsonWithLimit(spoofedLenReq, 1024, { allowEmpty: true });
    expect(rHeaderTooBig.ok).toBe(false);
    expect(rHeaderTooBig.status).toBe(413);
  });

  it('rejects invalid coordinates, path-traversal bbox strings, and invalid UUIDs', () => {
    expect(validateCoordinates(12.9716, 77.5946)).toBe(true);
    expect(validateCoordinates(95, 77.59)).toBe(false);
    expect(validateCoordinates(12.97, -185)).toBe(false);
    expect(validateCoordinates(Number.NaN, 77.59)).toBe(false);
    expect(validateCoordinates('12.97' as unknown, '77.59' as unknown)).toBe(false);

    expect(validateBbox('74,11,79,16')).toBe('74,11,79,16');
    expect(validateBbox('../../etc/passwd')).toBeNull();
    expect(validateBbox('79,11,74,16')).toBeNull(); // minLon >= maxLon
    expect(validateBbox('74,16,79,11')).toBeNull(); // minLat >= maxLat
    expect(validateBbox('74,11,200,16')).toBeNull(); // out of range longitude
    expect(validateBbox('74,11,79,16?key=leak')).toBeNull();

    expect(isValidUuid(ADMIN_ID)).toBe(true);
    expect(isValidUuid('INC-101,status.eq.REPORTED')).toBe(false);
  });

  it('prevents secret leakage in diagnostic scrubbers, error responses, and Edge Function handlers', async () => {
    const dirty =
      'Fetch failed on https://firms.modaps.eosdis.nasa.gov/api/area/csv/SECRET123/VIIRS_SNPP_NRT/74,11,79,16/1 and https://generativelanguage.googleapis.com/v1beta?key=AIzaSyDummySecretValue1234567890 with Authorization: Bearer sb_secret_AbCdEfGhIjKlMnOp';
    const clean = scrubSecrets(dirty);
    expect(clean).not.toContain('SECRET123');
    expect(clean).not.toContain('AIzaSyDummySecretValue1234567890');
    expect(clean).not.toContain('sb_secret_AbCdEfGhIjKlMnOp');
    expect(clean).toContain('[REDACTED]');

    const sanitizedResp = sanitizeJsonError(500, 'Internal request failed.');
    expect(sanitizedResp.status).toBe(500);
    const bodyText = await sanitizedResp.text();
    expect(bodyText).not.toMatch(/GEMINI_API_KEY|FIRMS_MAP_KEY|SUPABASE_SERVICE_ROLE_KEY/);

    // Verify remediations across all 11 Edge Function files
    const fnDir = resolve(process.cwd(), 'supabase/functions');
    const fnFolders = readdirSync(fnDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== '_shared')
      .map((d) => d.name);
    expect(fnFolders).toHaveLength(11);

    for (const fn of fnFolders) {
      const src = readFileSync(resolve(fnDir, fn, 'index.ts'), 'utf8');
      expect(src, `${fn} must use parseJsonWithLimit`).toContain('parseJsonWithLimit');
      expect(src, `${fn} must not instantiate raw createClient without import`).not.toContain('createClient(');
      expect(src, `${fn} must not hardcode service keys`).not.toMatch(/sb_secret_|AIza[0-9A-Za-z_-]{15,}/);
    }

    // Specific injection remediations
    const fireSrc = readFileSync(resolve(fnDir, 'ingest-fire-events/index.ts'), 'utf8');
    expect(fireSrc).toContain('validateBbox');
    expect(fireSrc).toContain('ALLOWED_FIRMS_SOURCES');

    const assistantSrc = readFileSync(resolve(fnDir, 'gemini-assistant/index.ts'), 'utf8');
    expect(assistantSrc).not.toMatch(/\.or\s*\(/);
    expect(assistantSrc).toContain('isValidUuid');
  });
});
