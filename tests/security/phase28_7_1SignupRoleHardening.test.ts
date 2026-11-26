import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateSelfSignupRole } from '../../src/security/rbac';

/**
 * Simulates the exact relational logic of public.handle_new_user() in 023_signup_role_hardening.sql
 * so tests verify new-user defaults and conflict preservation across forged metadata inputs.
 */
function simulateHardenedHandleNewUser(
  existingProfiles: Map<string, { id: string; full_name: string; email: string; role: string; is_active: boolean }>,
  newAuthUser: { id: string; email: string; raw_user_meta_data?: Record<string, unknown> | null }
) {
  const email = (newAuthUser.email || '').trim();
  const rawName =
    typeof newAuthUser.raw_user_meta_data?.full_name === 'string'
      ? newAuthUser.raw_user_meta_data.full_name.trim()
      : '';
  const emailPrefix = email.split('@')[0] || '';
  const fullName = rawName || emailPrefix || 'ResQAI Responder';

  const existing = existingProfiles.get(newAuthUser.id);
  if (!existing) {
    const inserted = {
      id: newAuthUser.id,
      full_name: fullName,
      email,
      role: 'FIELD_RESPONDER',
      is_active: true,
    };
    existingProfiles.set(newAuthUser.id, inserted);
    return inserted;
  }

  // ON CONFLICT (id) DO UPDATE updates only full_name, email, updated_at — preserves role & is_active
  const updated = {
    ...existing,
    full_name: fullName || existing.full_name,
    email: email || existing.email,
  };
  existingProfiles.set(newAuthUser.id, updated);
  return updated;
}

describe('Phase 28.7.1 Database & Client Signup Privilege Hardening', () => {
  const migration023Path = resolve(process.cwd(), 'supabase/migrations/023_signup_role_hardening.sql');

  it('rejects all forged privileged or non-responder roles in client validateSelfSignupRole()', () => {
    const forgedRoles = [
      'ADMIN',
      'admin',
      '  ADMIN ',
      'DISPATCHER',
      'dispatcher',
      'CONTROL_ROOM_OPERATOR',
      'RESOURCE_OFFICER',
      'VIEWER',
      'SUPERADMIN',
      'SERVICE_ROLE',
    ];

    for (const forged of forgedRoles) {
      const result = validateSelfSignupRole(forged);
      expect(result.allowed, `Role '${forged}' must be rejected on public signup`).toBe(false);
      expect(result.role).toBe('FIELD_RESPONDER');
    }

    expect(validateSelfSignupRole('FIELD_RESPONDER')).toEqual({ allowed: true, role: 'FIELD_RESPONDER' });
    expect(validateSelfSignupRole(undefined)).toEqual({ allowed: true, role: 'FIELD_RESPONDER' });
    expect(validateSelfSignupRole(null)).toEqual({ allowed: true, role: 'FIELD_RESPONDER' });
  });

  it('hardens public.handle_new_user() in migration 023 to ignore raw_user_meta_data role claims', () => {
    const sql023 = readFileSync(migration023Path, 'utf8');

    const fnStart = sql023.indexOf('CREATE OR REPLACE FUNCTION public.handle_new_user()');
    const fnEnd = sql023.indexOf('REVOKE ALL ON FUNCTION public.handle_new_user()');
    expect(fnStart).toBeGreaterThan(-1);
    expect(fnEnd).toBeGreaterThan(fnStart);

    const fnBlock = sql023.slice(fnStart, fnEnd);

    // Must be SECURITY DEFINER with empty search_path and explicit public.* qualification
    expect(fnBlock).toContain('SECURITY DEFINER');
    expect(fnBlock).toContain("SET search_path = ''");
    expect(fnBlock).toContain('INSERT INTO public.profiles (id, full_name, email, role)');
    expect(fnBlock).toContain("'FIELD_RESPONDER'::public.user_role");

    // Must NOT cast or trust client-supplied role metadata
    expect(fnBlock).not.toContain("raw_user_meta_data->>'role'");
    expect(fnBlock).not.toContain('requested_role');
    expect(fnBlock).not.toContain("'ADMIN'");
    expect(fnBlock).not.toContain("'DISPATCHER'");
    expect(fnBlock).not.toContain("'CONTROL_ROOM_OPERATOR'");
    expect(fnBlock).not.toContain("'RESOURCE_OFFICER'");
    expect(fnBlock).not.toContain("'VIEWER'");

    // ON CONFLICT (id) DO UPDATE must preserve role and is_active
    const conflictIdx = fnBlock.indexOf('ON CONFLICT (id) DO UPDATE SET');
    expect(conflictIdx).toBeGreaterThan(-1);
    const conflictClause = fnBlock.slice(conflictIdx);
    expect(conflictClause).toContain('full_name');
    expect(conflictClause).toContain('email');
    expect(conflictClause).toContain('updated_at');
    expect(conflictClause).not.toMatch(/\brole\s*=/i);
    expect(conflictClause).not.toMatch(/\bis_active\s*=/i);
  });

  it('revokes public/anon/authenticated EXECUTE on handle_new_user() and preserves on_auth_user_created trigger', () => {
    const sql023 = readFileSync(migration023Path, 'utf8');

    expect(sql023).toContain('REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;');
    expect(sql023).toContain('GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;');
    expect(sql023).toContain("t.tgname = 'on_auth_user_created'");
    expect(sql023).toContain('CREATE TRIGGER on_auth_user_created');
    expect(sql023).toContain('AFTER INSERT ON auth.users');
    expect(sql023).toContain('EXECUTE FUNCTION public.handle_new_user()');

    // Must not weaken RLS or touch 022 guard functions
    expect(sql023).not.toMatch(/DISABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(sql023).not.toContain('guard_profile_privilege_columns');
    expect(sql023).not.toMatch(/DROP\s+POLICY/i);
  });

  it('assigns FIELD_RESPONDER on forged/missing signup metadata while preserving existing role & is_active on conflict', () => {
    const store = new Map<string, { id: string; full_name: string; email: string; role: string; is_active: boolean }>();

    const forgedPayloads = [
      { role: 'ADMIN', full_name: 'Attacker Admin' },
      { role: 'DISPATCHER', full_name: 'Attacker Dispatcher' },
      { role: 'CONTROL_ROOM_OPERATOR', full_name: 'Attacker Legacy Op' },
      { role: 'RESOURCE_OFFICER', full_name: 'Attacker Resource' },
      { role: 'VIEWER', full_name: 'Attacker Viewer' },
      { role: 'invalid-role' },
      {},
      null,
    ];

    for (let i = 0; i < forgedPayloads.length; i++) {
      const uid = `new-user-${i}`;
      const row = simulateHardenedHandleNewUser(store, {
        id: uid,
        email: `user${i}@example.test`,
        raw_user_meta_data: forgedPayloads[i],
      });
      expect(row.role).toBe('FIELD_RESPONDER');
      expect(row.is_active).toBe(true);
    }

    // Existing ADMIN and deactivated DISPATCHER must preserve role and is_active on conflict
    store.set('admin-uuid', {
      id: 'admin-uuid',
      full_name: 'Existing Admin',
      email: 'admin@resqai.test',
      role: 'ADMIN',
      is_active: true,
    });
    store.set('inactive-disp-uuid', {
      id: 'inactive-disp-uuid',
      full_name: 'Suspended Dispatcher',
      email: 'suspended@resqai.test',
      role: 'DISPATCHER',
      is_active: false,
    });

    const afterAdminConflict = simulateHardenedHandleNewUser(store, {
      id: 'admin-uuid',
      email: 'admin@resqai.test',
      raw_user_meta_data: { role: 'FIELD_RESPONDER', full_name: 'Existing Admin Updated' },
    });
    expect(afterAdminConflict.role).toBe('ADMIN');
    expect(afterAdminConflict.is_active).toBe(true);

    const afterSuspendedConflict = simulateHardenedHandleNewUser(store, {
      id: 'inactive-disp-uuid',
      email: 'suspended@resqai.test',
      raw_user_meta_data: { role: 'ADMIN', full_name: 'Reactivation Attempt' },
    });
    expect(afterSuspendedConflict.role).toBe('DISPATCHER');
    expect(afterSuspendedConflict.is_active).toBe(false);
  });
});
