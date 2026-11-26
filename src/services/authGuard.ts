import { supabase, isSupabaseConfigured } from './supabase';
import { UserRole, Permission, hasPermission, normalizeUserRole } from '../security/rbac';
import { logSecurityAuditEvent } from './auditLogs';

export interface VerifiedActor {
  userId: string;
  role: UserRole;
}

/**
 * Verifies the active Supabase authenticated user & profile role before allowing
 * privileged mutations (`DISPATCH_CONFIRM`, `REALLOCATION_APPROVE`, `INCIDENT_CREATE`, etc.).
 * Note: Database RLS and Edge Functions still enforce authorization server-side.
 */
export async function assertAuthorizedActor(
  permission: Permission,
  actionContext: string
): Promise<VerifiedActor | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const { data: userRes, error: authErr } = await supabase.auth.getUser();
  const user = userRes?.user;

  if (authErr || !user) {
    await logSecurityAuditEvent({
      action: 'ACCESS_DENIED',
      entityType: 'service_action',
      entityId: actionContext,
      newValue: { reason: 'Unauthenticated request blocked', permission },
    });
    throw new Error(`Authentication required for ${actionContext}.`);
  }

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profErr || !profile) {
    await logSecurityAuditEvent({
      action: 'ACCESS_DENIED',
      entityType: 'service_action',
      entityId: actionContext,
      newValue: { reason: 'Missing operator profile', permission },
      userId: user.id,
    });
    throw new Error('Authenticated operator profile not found.');
  }

  if (profile.is_active === false) {
    await logSecurityAuditEvent({
      action: 'ACCESS_DENIED',
      entityType: 'service_action',
      entityId: actionContext,
      newValue: { reason: 'Inactive account', permission },
      userId: user.id,
    });
    throw new Error('Account is deactivated.');
  }

  const normalizedRole = normalizeUserRole(profile.role);
  if (!normalizedRole || !hasPermission(normalizedRole, permission)) {
    await logSecurityAuditEvent({
      action: 'ACCESS_DENIED',
      entityType: 'service_action',
      entityId: actionContext,
      newValue: { role: profile.role, requiredPermission: permission },
      userId: user.id,
    });
    throw new Error(
      `Forbidden: role '${normalizedRole || profile.role}' lacks '${permission}' permission.`
    );
  }

  return {
    userId: user.id,
    role: normalizedRole,
  };
}

/**
 * Administrative role update function (ADMIN-only, paired with DB RLS & trigger).
 */
export async function updateUserRoleAsAdmin(
  targetUserId: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await assertAuthorizedActor('ADMIN_USER_MANAGE', 'updateUserRoleAsAdmin');
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase not configured' };
    }

    const { data: existing } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', targetUserId)
      .single();

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', targetUserId);

    if (error) {
      return { success: false, error: error.message };
    }

    await logSecurityAuditEvent({
      action: 'ROLE_CHANGED',
      entityType: 'profile',
      entityId: targetUserId,
      oldValue: { role: existing?.role || null },
      newValue: { role: newRole },
      userId: actor?.userId,
    });

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Role update failed',
    };
  }
}
