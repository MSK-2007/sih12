import { supabase, isSupabaseConfigured } from './supabase';

export type SecurityAuditAction =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_SIGNUP'
  | 'AUTH_SESSION_EXPIRED'
  | 'ROLE_CHANGED'
  | 'ACCESS_DENIED'
  | 'INCIDENT_CREATED'
  | 'INCIDENT_STATUS_CHANGED'
  | 'PRIORITY_RECALCULATED'
  | 'DISPATCH_CONFIRMED'
  | 'ASSIGNMENT_ACCEPTED'
  | 'ASSIGNMENT_DISPATCHED'
  | 'ASSIGNMENT_IN_PROGRESS'
  | 'ASSIGNMENT_COMPLETED'
  | 'ASSIGNMENT_CANCELLED'
  | 'ASSIGNMENT_REJECTED'
  | 'REALLOCATION_APPROVED'
  | 'REALLOCATION_REJECTED'
  | 'ADMIN_ACTION';

export interface AuditLog {
  id?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  createdAt?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let localAuditLogsStore: AuditLog[] = [];

async function resolveActorUuid(explicitUserId?: string): Promise<string | null> {
  if (explicitUserId && UUID_REGEX.test(explicitUserId)) {
    return explicitUserId;
  }
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (uid && UUID_REGEX.test(uid)) return uid;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Creates an audit log entry for security, administrative, or operator actions.
 */
export async function createAuditLog(
  action: string,
  entityType: string,
  entityId: string,
  oldValue?: Record<string, any>,
  newValue?: Record<string, any>,
  userId?: string
): Promise<AuditLog> {
  const actorUuid = await resolveActorUuid(userId);
  const now = new Date().toISOString();

  const log: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: actorUuid || userId,
    action,
    entityType,
    entityId,
    oldValue,
    newValue,
    createdAt: now,
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: actorUuid,
          action,
          entity_type: entityType,
          entity_id: entityId,
          old_value: oldValue || null,
          new_value: newValue || null,
        })
        .select()
        .single();

      if (!error && data) {
        log.id = data.id;
        log.userId = data.user_id;
        log.createdAt = data.created_at;
      }
    } catch (err) {
      console.warn('[AuditLogs] Error logging audit action:', err);
    }
  }

  localAuditLogsStore.unshift(log);
  return log;
}

export async function logSecurityAuditEvent(params: {
  action: SecurityAuditAction | string;
  entityType: string;
  entityId: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  userId?: string;
}): Promise<AuditLog> {
  return createAuditLog(
    params.action,
    params.entityType,
    params.entityId,
    params.oldValue,
    params.newValue,
    params.userId
  );
}

/**
 * Retrieves audit log entries.
 */
export async function getAuditLogs(entityType?: string, entityId?: string): Promise<AuditLog[]> {
  if (isSupabaseConfigured) {
    try {
      let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
      if (entityType) query = query.eq('entity_type', entityType);
      if (entityId) query = query.eq('entity_id', entityId);

      const { data, error } = await query;
      if (!error && data) {
        return data.map((d) => ({
          id: d.id,
          userId: d.user_id,
          action: d.action,
          entityType: d.entity_type,
          entityId: d.entity_id,
          oldValue: d.old_value,
          newValue: d.new_value,
          createdAt: d.created_at,
        }));
      }
    } catch (err) {
      console.warn('[AuditLogs] Fetch error:', err);
    }
  }

  return localAuditLogsStore.filter((l) => {
    if (entityType && l.entityType !== entityType) return false;
    if (entityId && l.entityId !== entityId) return false;
    return true;
  });
}
