import { supabase, isSupabaseConfigured } from './supabase';

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

let localAuditLogsStore: AuditLog[] = [];

/**
 * Creates an audit log entry for administrative or operator actions.
 */
export async function createAuditLog(
  action: string,
  entityType: string,
  entityId: string,
  oldValue?: Record<string, any>,
  newValue?: Record<string, any>,
  userId?: string
): Promise<AuditLog> {
  const log: AuditLog = {
    id: `audit-${Date.now()}`,
    userId,
    action,
    entityType,
    entityId,
    oldValue,
    newValue,
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: userId || null,
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
        log.createdAt = data.created_at;
      }
    } catch (err) {
      console.warn('[AuditLogs] Error logging audit action:', err);
    }
  }

  localAuditLogsStore.unshift(log);
  return log;
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
