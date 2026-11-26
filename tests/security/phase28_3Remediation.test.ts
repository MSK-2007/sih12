import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Hoisted Mocks for Frontend Services & Edge Function Security Runtime
// ---------------------------------------------------------------------------
const mockClientState = vi.hoisted(() => ({
  isConfigured: false,
  user: null as { id: string } | null,
  profile: null as { role: string; is_active: boolean } | null,
  auditInserts: [] as any[],
  resourceUpdates: [] as any[],
  incidentInserts: [] as any[],
  edgeAuthUsers: new Map<string, { id: string }>(),
  edgeProfiles: new Map<string, { role: string; is_active: boolean }>(),
  denoEnv: new Map<string, string>(),
}));

vi.mock('../../src/services/supabase', () => ({
  get isSupabaseConfigured() {
    return mockClientState.isConfigured;
  },
  supabase: {
    rpc: vi.fn(async () => ({ data: 'INC-2026-0999', error: null })),
    from: (table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        limit: () => chain,
        single: async () => {
          if (table === 'profiles') {
            return mockClientState.profile
              ? { data: mockClientState.profile, error: null }
              : { data: null, error: { message: 'Profile not found' } };
          }
          if (table === 'resources') {
            return {
              data: {
                id: 'res-assigned-1',
                resource_code: 'AMB-09',
                name: 'Ambulance 9',
                resource_type: 'AMBULANCE',
                status: 'AVAILABLE',
                latitude: 12.9716,
                longitude: 77.5946,
                capability: ['BASIC_LIFE_SUPPORT'],
                capacity: 2,
                assigned_user_id: RESPONDER_ID,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              error: null,
            };
          }
          if (table === 'incidents') {
            return {
              data: {
                id: 'inc-1',
                incident_number: 'INC-2026-0001',
                emergency_type: 'MEDICAL',
                title: 'Road Traffic Injury',
                description: 'Two-vehicle collision',
                location: 'MG Road',
                address: 'MG Road',
                latitude: 12.97,
                longitude: 77.59,
                people_affected: 2,
                injury_severity: 'MODERATE',
                priority_score: 72,
                priority: 'HIGH',
                status: 'REPORTED',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              error: null,
            };
          }
          if (table === 'reallocation_events') {
            return {
              data: {
                id: 'realloc-1',
                trigger_incident_id: 'inc-1',
                donor_incident_id: 'inc-0',
                reallocated_resource_id: 'res-assigned-1',
                status: 'PENDING',
              },
              error: null,
            };
          }
          return { data: null, error: null };
        },
        insert: (payload: any) => {
          if (table === 'audit_logs') {
            mockClientState.auditInserts.push(payload);
          }
          if (table === 'incidents') {
            mockClientState.incidentInserts.push(payload);
          }
          return {
            select: () => ({
              single: async () => ({
                data: {
                  id: `${table}-${Date.now()}`,
                  ...payload,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          };
        },
        update: (payload: any) => {
          if (table === 'resources') {
            mockClientState.resourceUpdates.push(payload);
          }
          const updateChain: any = {
            eq: () => updateChain,
            select: () => ({
              single: async () => ({
                data: {
                  id: 'res-assigned-1',
                  resource_code: 'AMB-09',
                  name: 'Ambulance 9',
                  resource_type: 'AMBULANCE',
                  status: payload.status || 'AVAILABLE',
                  latitude: payload.latitude ?? 12.9716,
                  longitude: payload.longitude ?? 77.5946,
                  last_location_update: payload.last_location_update,
                  capability: ['BASIC_LIFE_SUPPORT'],
                  capacity: 2,
                  assigned_user_id: RESPONDER_ID,
                  is_active: true,
                  created_at: new Date().toISOString(),
                  updated_at: payload.updated_at || new Date().toISOString(),
                },
                error: null,
              }),
            }),
            then: (resolveFn: any) => resolveFn({ error: null }),
          };
          return updateChain;
        },
      };
      return chain;
    },
    functions: { invoke: vi.fn(async () => ({ data: {}, error: null })) },
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: mockClientState.user },
        error: mockClientState.user ? null : { message: 'No active session' },
      })),
    },
  },
  markBackendLive: vi.fn(),
  markBackendOffline: vi.fn(),
}));

// Mock Deno ESM Supabase client import inside supabase/functions/_shared/security.ts
vi.mock('https://esm.sh/@supabase/supabase-js@2.39.8', () => ({
  createClient: () => ({
    auth: {
      getUser: async (token: string) => {
        const user = mockClientState.edgeAuthUsers.get(token) || null;
        return {
          data: { user },
          error: user ? null : { message: 'Invalid JWT' },
        };
      },
    },
    from: (table: string) => {
      let lookupId = '';
      const chain: any = {
        select: () => chain,
        eq: (col: string, val: string) => {
          if (col === 'id') lookupId = val;
          return chain;
        },
        single: async () => {
          if (table === 'profiles') {
            const prof = mockClientState.edgeProfiles.get(lookupId) || null;
            return prof ? { data: prof, error: null } : { data: null, error: { message: 'Not found' } };
          }
          return { data: null, error: null };
        },
      };
      return chain;
    },
  }),
}));

import { updateResourceLocation, updateResourceStatus } from '../../src/services/resources';
import { createIncident } from '../../src/services/incidents';
import { confirmDispatch } from '../../src/services/allocation';
import { updateUserRoleAsAdmin } from '../../src/services/authGuard';
import {
  timingSafeEqualSecret,
  requireAuthenticatedUser,
} from '../../supabase/functions/_shared/security';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const DISPATCHER_ID = '22222222-2222-4222-8222-222222222222';
const RESPONDER_ID = '33333333-3333-4333-8333-333333333333';
const INACTIVE_ID = '44444444-4444-4444-8444-444444444444';

function setMockSession(
  user: { id: string } | null,
  profile: { role: string; is_active: boolean } | null
) {
  mockClientState.isConfigured = true;
  mockClientState.user = user;
  mockClientState.profile = profile;
}

describe('Phase 28.3 Critical Security Remediation Verification', () => {
  beforeEach(() => {
    mockClientState.isConfigured = false;
    mockClientState.user = null;
    mockClientState.profile = null;
    mockClientState.auditInserts = [];
    mockClientState.resourceUpdates = [];
    mockClientState.incidentInserts = [];
    mockClientState.edgeAuthUsers.clear();
    mockClientState.edgeProfiles.clear();
    mockClientState.denoEnv.clear();

    mockClientState.denoEnv.set('SUPABASE_URL', 'https://itmeoierfppvoaljebco.supabase.co');
    mockClientState.denoEnv.set('SUPABASE_ANON_KEY', 'test-anon-key');
    mockClientState.denoEnv.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-secret-value');
    mockClientState.denoEnv.set('CRON_SECRET', 'test-cron-secret-32-bytes-minimum');

    vi.stubGlobal('Deno', {
      env: {
        get: (key: string) => mockClientState.denoEnv.get(key) ?? '',
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Static SQL Migration 022 Verification (Not executed remotely yet)
  // -------------------------------------------------------------------------
  it('1. [SQL Contract] fixes guard_profile_privilege_columns SECURITY DEFINER current_user bypass', () => {
    const sql = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/022_rbac_security_rls_hardening.sql'),
      'utf8'
    );

    const fnStart = sql.indexOf('CREATE OR REPLACE FUNCTION public.guard_profile_privilege_columns()');
    const fnEnd = sql.indexOf('CREATE TRIGGER trg_guard_profile_privilege_columns');
    expect(fnStart).toBeGreaterThan(-1);
    expect(fnEnd).toBeGreaterThan(fnStart);

    const guardBody = sql.slice(fnStart, fnEnd);
    expect(guardBody).toContain('SECURITY DEFINER');
    expect(guardBody).toContain("SET search_path = ''");
    expect(guardBody).toContain("auth.role() = 'service_role'");
    expect(guardBody).toContain("session_user IN ('postgres', 'supabase_admin') AND auth.uid() IS NULL");
    expect(guardBody).not.toMatch(/current_user\s+IN/i);
    expect(guardBody).toContain('public.is_admin()');
    expect(guardBody).toContain('INSERT INTO public.audit_logs');
  });

  it('2. [SQL Contract] adds guard_assignment_protected_columns blocking unauthorized responder mutations', () => {
    const sql = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/022_rbac_security_rls_hardening.sql'),
      'utf8'
    );

    const fnStart = sql.indexOf('CREATE OR REPLACE FUNCTION public.guard_assignment_protected_columns()');
    const fnEnd = sql.indexOf('CREATE TRIGGER trg_guard_assignment_protected_columns');
    expect(fnStart).toBeGreaterThan(-1);
    expect(fnEnd).toBeGreaterThan(fnStart);

    const body = sql.slice(fnStart, fnEnd);
    expect(body).toContain("SET search_path = ''");
    expect(body).toContain('public.resources');
    expect(body).toContain('r.assigned_user_id = auth.uid()');
    expect(body).toContain('NEW.incident_id IS DISTINCT FROM OLD.incident_id');
    expect(body).toContain('NEW.resource_id IS DISTINCT FROM OLD.resource_id');
    expect(body).toContain('NEW.distance_km IS DISTINCT FROM OLD.distance_km');
    expect(body).toContain('NEW.allocation_score IS DISTINCT FROM OLD.allocation_score');
    expect(body).toContain('NEW.recommendation_reason IS DISTINCT FROM OLD.recommendation_reason');
    expect(body).toContain('NEW.assigned_by IS DISTINCT FROM OLD.assigned_by');
    expect(body).toContain("'CANCELLED'");
    expect(body).toContain("'REJECTED'");
    expect(body).toContain("'RECOMMENDED'");
    expect(body).toContain("WHEN 'DISPATCHED' THEN v_allowed := NEW.assignment_status::text IN ('IN_PROGRESS', 'COMPLETED')");
    expect(body).toContain("WHEN 'IN_PROGRESS' THEN v_allowed := NEW.assignment_status::text = 'COMPLETED'");
  });

  it('3. [SQL Contract] adds guard_resource_protected_columns strict allowlist & current_assignment_id check', () => {
    const sql = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/022_rbac_security_rls_hardening.sql'),
      'utf8'
    );

    const fnStart = sql.indexOf('CREATE OR REPLACE FUNCTION public.guard_resource_protected_columns()');
    const fnEnd = sql.indexOf('CREATE TRIGGER trg_guard_resource_protected_columns');
    expect(fnStart).toBeGreaterThan(-1);
    expect(fnEnd).toBeGreaterThan(fnStart);

    const body = sql.slice(fnStart, fnEnd);
    expect(body).toContain("SET search_path = ''");
    expect(body).toContain('OLD.assigned_user_id IS DISTINCT FROM auth.uid()');
    expect(body).toContain('NEW.resource_code IS DISTINCT FROM OLD.resource_code');
    expect(body).toContain('NEW.assigned_user_id IS DISTINCT FROM OLD.assigned_user_id');
    expect(body).toContain('NEW.is_active IS DISTINCT FROM OLD.is_active');
    expect(body).toContain('NEW.capability IS DISTINCT FROM OLD.capability');
    expect(body).toContain('NEW.capacity IS DISTINCT FROM OLD.capacity');
    expect(body).toContain('NEW.current_assignment_id');
    expect(body).toContain('public.resource_assignments ra');
  });

  it('4. [SQL Contract] tightens guard_incident_protected_columns to strict status/resolved_at/updated_at allowlist', () => {
    const sql = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/022_rbac_security_rls_hardening.sql'),
      'utf8'
    );

    const fnStart = sql.indexOf('CREATE OR REPLACE FUNCTION public.guard_incident_protected_columns()');
    const fnEnd = sql.indexOf('CREATE TRIGGER trg_guard_incident_protected_columns');
    expect(fnStart).toBeGreaterThan(-1);
    expect(fnEnd).toBeGreaterThan(fnStart);

    const body = sql.slice(fnStart, fnEnd);
    expect(body).toContain("SET search_path = ''");
    expect(body).toContain('v_allowed := to_jsonb(OLD) || jsonb_build_object(');
    expect(body).toContain("'status', NEW.status");
    expect(body).toContain("'resolved_at', NEW.resolved_at");
    expect(body).toContain("'updated_at', NEW.updated_at");
    expect(body).toContain('IF to_jsonb(NEW) IS DISTINCT FROM v_allowed THEN');
    expect(sql).toContain('public.is_responder_assigned_to_incident(id)');
  });

  it('5. [SQL Contract] hardens all 5 SECURITY DEFINER RBAC helpers with SET search_path and REVOKE/GRANT', () => {
    const sql = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/022_rbac_security_rls_hardening.sql'),
      'utf8'
    );

    const helpers = [
      'get_auth_user_role()',
      'is_admin()',
      'is_dispatcher_or_admin()',
      'is_field_responder()',
      'is_responder_assigned_to_incident(',
    ];

    for (const helper of helpers) {
      expect(sql, `${helper} must revoke from PUBLIC, anon`).toContain(
        `REVOKE ALL ON FUNCTION public.${helper.replace('(', '(uuid').replace('(uuid)', '()')}`
      );
    }
    expect(sql).toContain("SET search_path = ''");
    expect(sql).toContain('FROM public.profiles');
    expect(sql).toContain('FROM public.resource_assignments ra');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.get_auth_user_role() TO authenticated, service_role;');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.is_dispatcher_or_admin() TO authenticated, service_role;');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.is_field_responder() TO authenticated, service_role;');
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.is_responder_assigned_to_incident(uuid) TO authenticated, service_role;'
    );
  });

  it('6. [SQL Contract] enforces explicit table/sequence/function REVOKE/GRANT and ALTER DEFAULT PRIVILEGES', () => {
    const sql = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/022_rbac_security_rls_hardening.sql'),
      'utf8'
    );

    expect(sql).toContain('REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;');
    expect(sql).toContain('REVOKE USAGE ON SCHEMA public FROM anon;');
    expect(sql).toContain('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;');
    expect(sql).toContain('GRANT SELECT, INSERT ON public.audit_logs TO authenticated;');
    expect(sql).toContain('GRANT SELECT, INSERT ON public.incident_updates TO authenticated;');
    expect(sql).toContain(
      'GRANT SELECT ON public.external_ingestion_logs, public.provider_health, public.ai_event_timeline TO authenticated;'
    );
    expect(sql).toContain('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;');
    expect(sql).toContain(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;'
    );
    expect(sql).toContain(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;'
    );
  });

  // -------------------------------------------------------------------------
  // Service-Layer Unit Tests (Mocked Supabase Client)
  // -------------------------------------------------------------------------
  it('7. [Mocked Service] enforces auth & GPS validation on updateResourceLocation while permitting responder field updates', async () => {
    // Unauthenticated rejected
    setMockSession(null, null);
    await expect(updateResourceLocation('res-assigned-1', 12.9716, 77.5946)).rejects.toThrow(
      /Authentication required/i
    );
    expect(mockClientState.auditInserts.some((a) => a.action === 'ACCESS_DENIED')).toBe(true);

    // Authenticated FIELD_RESPONDER with invalid coordinates rejected
    setMockSession({ id: RESPONDER_ID }, { role: 'FIELD_RESPONDER', is_active: true });
    await expect(updateResourceLocation('res-assigned-1', 190, 77.59)).rejects.toThrow(/Invalid GPS/i);
    await expect(updateResourceLocation('res-assigned-1', Number.NaN, 77.59)).rejects.toThrow(/Invalid GPS/i);
    expect(mockClientState.resourceUpdates).toHaveLength(0);

    // Authenticated FIELD_RESPONDER with valid coordinates succeeds
    const updated = await updateResourceLocation('res-assigned-1', 12.9811, 77.6012);
    expect(updated).not.toBeNull();
    expect(updated?.latitude).toBeCloseTo(12.9811, 4);
    expect(updated?.longitude).toBeCloseTo(77.6012, 4);
    expect(mockClientState.resourceUpdates).toHaveLength(1);

    // Valid FIELD_RESPONDER status update succeeds
    const statusRes = await updateResourceStatus('res-assigned-1', 'BUSY', 'asgn-1', 'AVAILABLE');
    expect(statusRes.success).toBe(true);
  });

  it('8. [Mocked Service] preserves DISPATCHER and ADMIN operational permissions without regression', async () => {
    // DISPATCHER permissions
    setMockSession({ id: DISPATCHER_ID }, { role: 'DISPATCHER', is_active: true });
    const dispLoc = await updateResourceLocation('res-assigned-1', 12.95, 77.58);
    expect(dispLoc).not.toBeNull();

    const inc = await createIncident({
      emergencyType: 'MEDICAL',
      title: 'Dispatcher Created Incident',
      description: 'Urgent medical emergency',
      address: 'Indiranagar',
      latitude: 12.9784,
      longitude: 77.6408,
      peopleAffected: 1,
      injuryLevel: 'SEVERE',
    });
    expect(inc.title).toBe('Dispatcher Created Incident');

    const dispDispatch = await confirmDispatch('inc-1', ['res-assigned-1'], { operatorApproved: true });
    expect(dispDispatch.success).toBe(true);

    // DISPATCHER cannot promote ADMIN
    const nonAdminPromo = await updateUserRoleAsAdmin(RESPONDER_ID, 'ADMIN');
    expect(nonAdminPromo.success).toBe(false);

    // ADMIN retains role governance + operational dispatch permissions
    setMockSession({ id: ADMIN_ID }, { role: 'ADMIN', is_active: true });
    const adminPromo = await updateUserRoleAsAdmin(RESPONDER_ID, 'DISPATCHER');
    expect(adminPromo.success).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Edge Function _shared/security.ts Runtime Verification (Mocked ESM Supabase + Deno.env)
  // -------------------------------------------------------------------------
  it('9. [Edge Runtime] enforces constant-time SHA-256 secret checks and cron/service_role allowServiceOrCron rules', async () => {
    expect(await timingSafeEqualSecret('abc-123', 'abc-123')).toBe(true);
    expect(await timingSafeEqualSecret('abc-123', 'abc-124')).toBe(false);
    expect(await timingSafeEqualSecret('short', 'much-longer-secret-value')).toBe(false);
    expect(await timingSafeEqualSecret('', '')).toBe(false);

    // Matching CRON_SECRET allowed when allowServiceOrCron = true
    const cronOkReq = new Request('https://example.test/fn', {
      headers: { 'x-cron-secret': 'test-cron-secret-32-bytes-minimum' },
    });
    const cronOkRes = await requireAuthenticatedUser(cronOkReq, ['ADMIN', 'DISPATCHER'], {
      allowServiceOrCron: true,
    });
    expect(cronOkRes.ok).toBe(true);
    expect(cronOkRes.role).toBe('CRON_SCHEDULER');
    expect(cronOkRes.isMachineCaller).toBe(true);

    // Wrong CRON_SECRET rejected
    const cronBadReq = new Request('https://example.test/fn', {
      headers: { 'x-cron-secret': 'wrong-cron-secret' },
    });
    const cronBadRes = await requireAuthenticatedUser(cronBadReq, ['ADMIN', 'DISPATCHER'], {
      allowServiceOrCron: true,
    });
    expect(cronBadRes.ok).toBe(false);
    expect(cronBadRes.status).toBe(401);

    // Valid service_role token allowed when allowServiceOrCron = true
    const svcOkReq = new Request('https://example.test/fn', {
      headers: { Authorization: 'Bearer test-service-role-secret-value' },
    });
    const svcOkRes = await requireAuthenticatedUser(svcOkReq, ['ADMIN', 'DISPATCHER'], {
      allowServiceOrCron: true,
    });
    expect(svcOkRes.ok).toBe(true);
    expect(svcOkRes.role).toBe('SERVICE_ROLE');

    // Wrong service_role token rejected
    const svcBadReq = new Request('https://example.test/fn', {
      headers: { Authorization: 'Bearer wrong-service-role-token' },
    });
    const svcBadRes = await requireAuthenticatedUser(svcBadReq, ['ADMIN', 'DISPATCHER'], {
      allowServiceOrCron: true,
    });
    expect(svcBadRes.ok).toBe(false);
    expect(svcBadRes.status).toBe(401);
  });

  it('10. [Edge Runtime] blocks machine-only credentials and lower/inactive roles on interactive-only functions', async () => {
    // Interactive-only omits allowServiceOrCron -> rejects x-cron-secret and service_role bearer
    const cronOnInteractive = new Request('https://example.test/analyze-incident', {
      headers: { 'x-cron-secret': 'test-cron-secret-32-bytes-minimum' },
    });
    const r1 = await requireAuthenticatedUser(cronOnInteractive, ['ADMIN', 'DISPATCHER']);
    expect(r1.ok).toBe(false);
    expect(r1.status).toBe(401);

    const serviceOnInteractive = new Request('https://example.test/analyze-incident', {
      headers: { Authorization: 'Bearer test-service-role-secret-value' },
    });
    const r2 = await requireAuthenticatedUser(serviceOnInteractive, ['ADMIN', 'DISPATCHER']);
    expect(r2.ok).toBe(false);
    expect(r2.status).toBe(401);

    // Valid DISPATCHER user JWT succeeds
    mockClientState.edgeAuthUsers.set('jwt-dispatcher', { id: DISPATCHER_ID });
    mockClientState.edgeProfiles.set(DISPATCHER_ID, { role: 'DISPATCHER', is_active: true });
    const dispatcherReq = new Request('https://example.test/analyze-incident', {
      headers: { Authorization: 'Bearer jwt-dispatcher' },
    });
    const r3 = await requireAuthenticatedUser(dispatcherReq, ['ADMIN', 'DISPATCHER']);
    expect(r3.ok).toBe(true);
    expect(r3.role).toBe('DISPATCHER');
    expect(r3.isMachineCaller).toBe(false);

    // Valid FIELD_RESPONDER JWT denied on ADMIN/DISPATCHER endpoint
    mockClientState.edgeAuthUsers.set('jwt-responder', { id: RESPONDER_ID });
    mockClientState.edgeProfiles.set(RESPONDER_ID, { role: 'FIELD_RESPONDER', is_active: true });
    const responderReq = new Request('https://example.test/analyze-incident', {
      headers: { Authorization: 'Bearer jwt-responder' },
    });
    const r4 = await requireAuthenticatedUser(responderReq, ['ADMIN', 'DISPATCHER']);
    expect(r4.ok).toBe(false);
    expect(r4.status).toBe(403);

    // Inactive user denied
    mockClientState.edgeAuthUsers.set('jwt-inactive', { id: INACTIVE_ID });
    mockClientState.edgeProfiles.set(INACTIVE_ID, { role: 'ADMIN', is_active: false });
    const inactiveReq = new Request('https://example.test/analyze-incident', {
      headers: { Authorization: 'Bearer jwt-inactive' },
    });
    const r5 = await requireAuthenticatedUser(inactiveReq, ['ADMIN', 'DISPATCHER']);
    expect(r5.ok).toBe(false);
    expect(r5.status).toBe(403);
  });

  // -------------------------------------------------------------------------
  // Gateway config.toml & Admin Bootstrap Auditability Checks
  // -------------------------------------------------------------------------
  it('11. [Config] aligns supabase/config.toml verify_jwt across all 11 Edge Functions', () => {
    const configToml = readFileSync(resolve(process.cwd(), 'supabase/config.toml'), 'utf8');
    expect(configToml).toContain('project_id = "itmeoierfppvoaljebco"');

    const fnDir = resolve(process.cwd(), 'supabase/functions');
    const fnFolders = readdirSync(fnDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== '_shared')
      .map((d) => d.name)
      .sort();

    expect(fnFolders).toHaveLength(11);

    const interactiveOnly = ['analyze-incident', 'explain-reallocation', 'gemini-assistant'];
    for (const fn of fnFolders) {
      const escaped = fn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const expectedJwt = interactiveOnly.includes(fn) ? 'true' : 'false';
      const sectionRegex = new RegExp(
        `\\[functions\\.${escaped}\\]\\s*\\r?\\nverify_jwt\\s*=\\s*${expectedJwt}`
      );
      expect(configToml, `config.toml must configure ${fn} with verify_jwt = ${expectedJwt}`).toMatch(
        sectionRegex
      );
    }
  });

  it('12. [Runbook] verifies First ADMIN Bootstrap derives email from confirmed auth.users and audits session_user cleanly', () => {
    const auditDoc = readFileSync(resolve(process.cwd(), 'docs/PHASE_28_1_DEPLOYMENT_AUDIT.md'), 'utf8');
    expect(auditDoc).toContain('FROM auth.users');
    expect(auditDoc).toContain('email_confirmed_at IS NOT NULL');
    expect(auditDoc).toContain('deleted_at IS NULL');
    expect(auditDoc).toContain("'actor_session_user', session_user");
    expect(auditDoc).toContain("'FIRST_ADMIN_BOOTSTRAP'");
    expect(auditDoc).not.toContain('admin@resqai.local');
  });
});
