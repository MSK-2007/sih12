import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const mockSupabaseState = vi.hoisted(() => ({
  isConfigured: false,
  user: null as { id: string } | null,
  profile: null as { role: string; is_active: boolean } | null,
  auditInserts: [] as any[],
  profileUpdates: [] as any[],
  from: vi.fn(),
  rpc: vi.fn(),
  functions: { invoke: vi.fn() },
  auth: { getUser: vi.fn() },
}));

vi.mock('../../src/services/supabase', () => ({
  get isSupabaseConfigured() {
    return mockSupabaseState.isConfigured;
  },
  supabase: {
    rpc: (...args: any[]) => mockSupabaseState.rpc(...args),
    from: (...args: any[]) => mockSupabaseState.from(...args),
    functions: { invoke: (...args: any[]) => mockSupabaseState.functions.invoke(...args) },
    auth: { getUser: (...args: any[]) => mockSupabaseState.auth.getUser(...args) },
  },
  markBackendLive: vi.fn(),
  markBackendOffline: vi.fn(),
}));

import {
  hasPermission,
  hasAnyRole,
  normalizeUserRole,
  validateSelfSignupRole,
  canAccessRoute,
} from '../../src/security/rbac';
import { assertAuthorizedActor, updateUserRoleAsAdmin } from '../../src/services/authGuard';
import { createIncident } from '../../src/services/incidents';
import { createResource, updateResourceStatus } from '../../src/services/resources';
import { confirmDispatch } from '../../src/services/allocation';
import { confirmReallocation } from '../../src/services/reallocation';

const ADMIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DISPATCHER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const RESPONDER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function configureMockSession(user: { id: string } | null, profile: { role: string; is_active: boolean } | null) {
  mockSupabaseState.isConfigured = true;
  mockSupabaseState.user = user;
  mockSupabaseState.profile = profile;
  mockSupabaseState.auth.getUser.mockResolvedValue({
    data: { user },
    error: user ? null : { message: 'No active session' },
  });
}

describe('Phase 28 Security, RBAC, RLS & Edge Function Guard Tests', () => {
  beforeEach(() => {
    mockSupabaseState.isConfigured = false;
    mockSupabaseState.user = null;
    mockSupabaseState.profile = null;
    mockSupabaseState.auditInserts = [];
    mockSupabaseState.profileUpdates = [];
    vi.clearAllMocks();

    mockSupabaseState.from.mockImplementation((table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        limit: () => chain,
        single: async () => {
          if (table === 'profiles') {
            return mockSupabaseState.profile
              ? { data: mockSupabaseState.profile, error: null }
              : { data: null, error: { message: 'Profile not found' } };
          }
          if (table === 'resources') {
            return {
              data: {
                id: 'res-1',
                resource_code: 'AMB-01',
                name: 'Ambulance 1',
                resource_type: 'AMBULANCE',
                status: 'AVAILABLE',
                latitude: 12.97,
                longitude: 77.59,
                capability: [],
                capacity: 2,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              error: null,
            };
          }
          return { data: null, error: null };
        },
        insert: (payload: any) => {
          if (table === 'audit_logs') {
            mockSupabaseState.auditInserts.push(payload);
          }
          return {
            select: () => ({
              single: async () => ({
                data: { id: `row-${Date.now()}`, ...payload, created_at: new Date().toISOString() },
                error: null,
              }),
            }),
          };
        },
        update: (payload: any) => {
          if (table === 'profiles') {
            mockSupabaseState.profileUpdates.push(payload);
          }
          const updateChain: any = {
            eq: () => updateChain,
            select: () => ({
              single: async () => ({
                data: {
                  id: 'res-1',
                  resource_code: 'AMB-01',
                  name: 'Ambulance 1',
                  resource_type: 'AMBULANCE',
                  status: payload.status || 'BUSY',
                  latitude: 12.97,
                  longitude: 77.59,
                  capability: [],
                  capacity: 2,
                  is_active: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
            then: (resolve: any) => resolve({ error: null }),
          };
          return updateChain;
        },
      };
      return chain;
    });
  });

  it('denies unauthenticated route access and blocks unauthenticated mutations with audit logs', async () => {
    expect(canAccessRoute(null, '/')).toBe(true);
    expect(canAccessRoute(null, '/login')).toBe(true);
    expect(canAccessRoute(null, '/control-center')).toBe(false);
    expect(canAccessRoute(null, '/incidents')).toBe(false);
    expect(canAccessRoute(null, '/resources')).toBe(false);
    expect(canAccessRoute(null, '/driver')).toBe(false);
    expect(canAccessRoute(null, '/reallocation')).toBe(false);

    configureMockSession(null, null);

    await expect(assertAuthorizedActor('INCIDENT_CREATE', 'createIncident')).rejects.toThrow(
      /Authentication required/i
    );
    await expect(
      createIncident({
        emergencyType: 'FIRE',
        title: 'Unauth Incident Attempt',
        description: 'Should fail',
        address: 'Sector 1',
        latitude: 12.97,
        longitude: 77.59,
        peopleAffected: 1,
        injuryLevel: 'MINOR',
      })
    ).rejects.toThrow(/Authentication required/i);

    const dispatchRes = await confirmDispatch('inc-1', ['res-1'], { operatorApproved: true });
    expect(dispatchRes.success).toBe(false);
    expect(dispatchRes.message).toMatch(/Authentication required/i);

    const reallocRes = await confirmReallocation('realloc-1', { operatorApproved: true });
    expect(reallocRes.success).toBe(false);
    expect(reallocRes.message).toMatch(/Authentication required/i);

    expect(mockSupabaseState.auditInserts.some((a) => a.action === 'ACCESS_DENIED')).toBe(true);
  });

  it('enforces DISPATCHER permissions while blocking ADMIN-only governance actions', async () => {
    expect(hasPermission('DISPATCHER', 'INCIDENT_CREATE')).toBe(true);
    expect(hasPermission('DISPATCHER', 'DISPATCH_CONFIRM')).toBe(true);
    expect(hasPermission('DISPATCHER', 'REALLOCATION_APPROVE')).toBe(true);
    expect(hasPermission('DISPATCHER', 'ADMIN_USER_MANAGE')).toBe(false);
    expect(hasPermission('DISPATCHER', 'AUDIT_LOG_VIEW')).toBe(false);

    expect(canAccessRoute('DISPATCHER', '/control-center')).toBe(true);
    expect(canAccessRoute('DISPATCHER', '/reallocation')).toBe(true);
    expect(normalizeUserRole('CONTROL_ROOM_OPERATOR')).toBe('DISPATCHER');

    configureMockSession({ id: DISPATCHER_ID }, { role: 'DISPATCHER', is_active: true });

    const actor = await assertAuthorizedActor('DISPATCH_CONFIRM', 'confirmDispatch');
    expect(actor).toEqual({ userId: DISPATCHER_ID, role: 'DISPATCHER' });

    const adminAttempt = await updateUserRoleAsAdmin(RESPONDER_ID, 'ADMIN');
    expect(adminAttempt.success).toBe(false);
    expect(adminAttempt.error).toMatch(/Forbidden/i);
    expect(mockSupabaseState.profileUpdates).toHaveLength(0);
    expect(mockSupabaseState.auditInserts.some((a) => a.action === 'ACCESS_DENIED')).toBe(true);
  });

  it('restricts FIELD_RESPONDER from dispatch, reallocation, incident creation, and admin routes', async () => {
    expect(hasAnyRole('FIELD_RESPONDER', ['ADMIN', 'DISPATCHER'])).toBe(false);
    expect(hasPermission('FIELD_RESPONDER', 'FIELD_STATUS_UPDATE')).toBe(true);
    expect(hasPermission('FIELD_RESPONDER', 'DISPATCH_CONFIRM')).toBe(false);
    expect(hasPermission('FIELD_RESPONDER', 'REALLOCATION_APPROVE')).toBe(false);

    expect(canAccessRoute('FIELD_RESPONDER', '/driver')).toBe(true);
    expect(canAccessRoute('FIELD_RESPONDER', '/incidents')).toBe(true);
    expect(canAccessRoute('FIELD_RESPONDER', '/incidents/create')).toBe(false);
    expect(canAccessRoute('FIELD_RESPONDER', '/resources/create')).toBe(false);
    expect(canAccessRoute('FIELD_RESPONDER', '/reallocation')).toBe(false);
    expect(canAccessRoute('FIELD_RESPONDER', '/control-center')).toBe(false);

    configureMockSession({ id: RESPONDER_ID }, { role: 'FIELD_RESPONDER', is_active: true });

    await expect(
      createResource({
        resourceCode: 'AMB-UNAUTH',
        name: 'Unauthorized Unit',
        resourceType: 'AMBULANCE',
        capability: [],
        capacity: 1,
        latitude: 12.97,
        longitude: 77.59,
      })
    ).rejects.toThrow(/Forbidden/i);

    const dispatchAttempt = await confirmDispatch('inc-1', ['res-1'], { operatorApproved: true });
    expect(dispatchAttempt.success).toBe(false);
    expect(dispatchAttempt.message).toMatch(/Forbidden/i);

    const reallocAttempt = await confirmReallocation('realloc-1', { operatorApproved: true });
    expect(reallocAttempt.success).toBe(false);
    expect(reallocAttempt.message).toMatch(/Forbidden/i);

    // Permitted field telemetry status transition succeeds
    const fieldStatusUpdate = await updateResourceStatus('res-1', 'BUSY', 'asgn-1', 'AVAILABLE');
    expect(fieldStatusUpdate.success).toBe(true);
  });

  it('allows ADMIN role governance updates and records ROLE_CHANGED audit logs', async () => {
    expect(hasPermission('ADMIN', 'ADMIN_USER_MANAGE')).toBe(true);
    expect(hasPermission('ADMIN', 'AUDIT_LOG_VIEW')).toBe(true);
    expect(hasPermission('ADMIN', 'DISPATCH_CONFIRM')).toBe(true);

    configureMockSession({ id: ADMIN_ID }, { role: 'ADMIN', is_active: true });
    mockSupabaseState.profile = { role: 'ADMIN', is_active: true };

    const res = await updateUserRoleAsAdmin(RESPONDER_ID, 'DISPATCHER');
    expect(res.success).toBe(true);
    expect(mockSupabaseState.profileUpdates.length).toBe(1);
    expect(mockSupabaseState.auditInserts.some((a) => a.action === 'ROLE_CHANGED')).toBe(true);
  });

  it('blocks self-role escalation attempts and removes unsafe demo-profile or hardcoded password fallbacks', () => {
    expect(validateSelfSignupRole('ADMIN').allowed).toBe(false);
    expect(validateSelfSignupRole('DISPATCHER').allowed).toBe(false);
    expect(validateSelfSignupRole('CONTROL_ROOM_OPERATOR').allowed).toBe(false);
    expect(validateSelfSignupRole('FIELD_RESPONDER')).toEqual({ allowed: true, role: 'FIELD_RESPONDER' });
    expect(validateSelfSignupRole(undefined)).toEqual({ allowed: true, role: 'FIELD_RESPONDER' });

    const authSrc = readFileSync(resolve(process.cwd(), 'src/context/AuthContext.tsx'), 'utf8');
    expect(authSrc).not.toContain('DEFAULT_DEMO_PROFILE');

    const loginSrc = readFileSync(resolve(process.cwd(), 'src/pages/LoginPage.tsx'), 'utf8');
    expect(loginSrc).not.toContain('demo123456');
  });

  it('enforces least-privilege RLS, cross-user isolation, and Edge Function auth across source artifacts', () => {
    const rlsSql = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/022_rbac_security_rls_hardening.sql'),
      'utf8'
    );
    expect(rlsSql).toContain('guard_profile_privilege_columns');
    expect(rlsSql).toContain('guard_incident_protected_columns');
    expect(rlsSql).toContain('is_responder_assigned_to_incident');
    expect(rlsSql).toContain('assigned_user_id = auth.uid()');
    expect(rlsSql).toContain('user_id = auth.uid()');
    expect(rlsSql).toContain('Admin select audit_logs');
    expect(rlsSql).toContain('Authenticated read resqai storage objects');
    expect(rlsSql).not.toMatch(/FOR ALL[\s\S]{0,60}USING\s*\(\s*true\s*\)/i);

    const fnDir = resolve(process.cwd(), 'supabase/functions');
    const fnFolders = readdirSync(fnDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== '_shared')
      .map((d) => d.name);

    const interactiveOnlyFns = new Set(['analyze-incident', 'explain-reallocation', 'gemini-assistant']);
    const dualUseCronOrServiceFns = new Set([
      'analyze-external-event',
      'ingest-alerts',
      'ingest-earthquakes',
      'ingest-fire-events',
      'ingest-imd-alerts',
      'ingest-weather',
      'monitor-data-providers',
      'process-live-events',
    ]);

    expect(fnFolders.length).toBe(11);
    for (const fn of fnFolders) {
      const src = readFileSync(resolve(fnDir, fn, 'index.ts'), 'utf8');
      expect(src, `${fn} must verify JWT & role`).toContain('requireAuthenticatedUser');
      expect(src, `${fn} must enforce rate limiting`).toContain('checkRateLimit');
      expect(src, `${fn} must not embed hardcoded publishable keys`).not.toContain('sb_publishable_');
      if (interactiveOnlyFns.has(fn)) {
        expect(src, `${fn} must remain interactive-only`).not.toContain('allowServiceOrCron: true');
      }
      if (dualUseCronOrServiceFns.has(fn)) {
        expect(src, `${fn} must allow scheduled cron / service-to-service callers`).toContain(
          'allowServiceOrCron: true'
        );
      }
    }
  });
});
