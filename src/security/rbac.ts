export type UserRole = 'ADMIN' | 'DISPATCHER' | 'FIELD_RESPONDER';

/**
 * Legacy DB role alias retained strictly for backward-compatible reading of
 * existing `CONTROL_ROOM_OPERATOR` profile rows; mapped to `DISPATCHER`.
 */
export type LegacyCompatibleRole = UserRole | 'CONTROL_ROOM_OPERATOR';

export type Permission =
  | 'INCIDENT_VIEW'
  | 'INCIDENT_CREATE'
  | 'INCIDENT_UPDATE'
  | 'RESOURCE_VIEW'
  | 'RESOURCE_MANAGE'
  | 'DISPATCH_CONFIRM'
  | 'DISPATCH_CANCEL'
  | 'REALLOCATION_VIEW'
  | 'REALLOCATION_APPROVE'
  | 'FIELD_STATUS_UPDATE'
  | 'SIMULATION_RUN'
  | 'ANALYTICS_VIEW'
  | 'SYSTEM_HEALTH_RUN'
  | 'AI_ASSISTANT_USE'
  | 'AUDIT_LOG_VIEW'
  | 'ADMIN_USER_MANAGE';

export const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  ADMIN: new Set<Permission>([
    'INCIDENT_VIEW',
    'INCIDENT_CREATE',
    'INCIDENT_UPDATE',
    'RESOURCE_VIEW',
    'RESOURCE_MANAGE',
    'DISPATCH_CONFIRM',
    'DISPATCH_CANCEL',
    'REALLOCATION_VIEW',
    'REALLOCATION_APPROVE',
    'FIELD_STATUS_UPDATE',
    'SIMULATION_RUN',
    'ANALYTICS_VIEW',
    'SYSTEM_HEALTH_RUN',
    'AI_ASSISTANT_USE',
    'AUDIT_LOG_VIEW',
    'ADMIN_USER_MANAGE',
  ]),
  DISPATCHER: new Set<Permission>([
    'INCIDENT_VIEW',
    'INCIDENT_CREATE',
    'INCIDENT_UPDATE',
    'RESOURCE_VIEW',
    'RESOURCE_MANAGE',
    'DISPATCH_CONFIRM',
    'DISPATCH_CANCEL',
    'REALLOCATION_VIEW',
    'REALLOCATION_APPROVE',
    'FIELD_STATUS_UPDATE',
    'SIMULATION_RUN',
    'ANALYTICS_VIEW',
    'SYSTEM_HEALTH_RUN',
    'AI_ASSISTANT_USE',
  ]),
  FIELD_RESPONDER: new Set<Permission>([
    'INCIDENT_VIEW',
    'RESOURCE_VIEW',
    'FIELD_STATUS_UPDATE',
  ]),
};

/**
 * Normalizes a raw role string into a supported RBAC role, failing closed (null)
 * for unknown or missing roles. Maps legacy `CONTROL_ROOM_OPERATOR` to `DISPATCHER`.
 */
export function normalizeUserRole(rawRole?: string | null): UserRole | null {
  if (!rawRole) return null;
  const upper = rawRole.trim().toUpperCase();
  if (upper === 'ADMIN') return 'ADMIN';
  if (upper === 'DISPATCHER' || upper === 'CONTROL_ROOM_OPERATOR') return 'DISPATCHER';
  if (upper === 'FIELD_RESPONDER') return 'FIELD_RESPONDER';
  return null;
}

export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  const normalized = normalizeUserRole(role);
  if (!normalized) return false;
  return ROLE_PERMISSIONS[normalized].has(permission);
}

export function hasAnyRole(
  role: string | null | undefined,
  allowedRoles: readonly UserRole[]
): boolean {
  const normalized = normalizeUserRole(role);
  if (!normalized) return false;
  return allowedRoles.includes(normalized);
}

export const PRIVILEGED_SELF_SIGNUP_ROLES: ReadonlySet<string> = new Set([
  'ADMIN',
  'DISPATCHER',
  'CONTROL_ROOM_OPERATOR',
  'RESOURCE_OFFICER',
]);

/**
 * Validates requested public signup role and always returns least-privilege
 * `FIELD_RESPONDER` when safe, rejecting privileged role self-assignment.
 */
export function validateSelfSignupRole(requestedRole?: string | null): {
  allowed: boolean;
  role: UserRole;
  error?: string;
} {
  if (!requestedRole) {
    return { allowed: true, role: 'FIELD_RESPONDER' };
  }
  const upper = requestedRole.trim().toUpperCase();
  if (PRIVILEGED_SELF_SIGNUP_ROLES.has(upper)) {
    return {
      allowed: false,
      role: 'FIELD_RESPONDER',
      error: `Self-assignment of privileged role '${upper}' is prohibited. Contact an ADMIN to elevate roles.`,
    };
  }
  if (upper !== 'FIELD_RESPONDER') {
    return {
      allowed: false,
      role: 'FIELD_RESPONDER',
      error: `Invalid signup role '${upper}'.`,
    };
  }
  return { allowed: true, role: 'FIELD_RESPONDER' };
}

export const ROUTE_ALLOWED_ROLES: Array<{ prefix: string; roles: readonly UserRole[] }> = [
  { prefix: '/incidents/create', roles: ['ADMIN', 'DISPATCHER'] },
  { prefix: '/resources/create', roles: ['ADMIN', 'DISPATCHER'] },
  { prefix: '/resources/', roles: ['ADMIN', 'DISPATCHER'] },
  { prefix: '/resources', roles: ['ADMIN', 'DISPATCHER'] },
  { prefix: '/reallocation', roles: ['ADMIN', 'DISPATCHER'] },
  { prefix: '/simulation', roles: ['ADMIN', 'DISPATCHER'] },
  { prefix: '/analytics', roles: ['ADMIN', 'DISPATCHER'] },
  { prefix: '/system-health', roles: ['ADMIN', 'DISPATCHER'] },
  { prefix: '/control-center', roles: ['ADMIN', 'DISPATCHER'] },
  { prefix: '/dashboard', roles: ['ADMIN', 'DISPATCHER'] },
  { prefix: '/driver', roles: ['ADMIN', 'DISPATCHER', 'FIELD_RESPONDER'] },
  { prefix: '/incidents', roles: ['ADMIN', 'DISPATCHER', 'FIELD_RESPONDER'] },
  { prefix: '/map', roles: ['ADMIN', 'DISPATCHER', 'FIELD_RESPONDER'] },
  { prefix: '/alerts', roles: ['ADMIN', 'DISPATCHER', 'FIELD_RESPONDER'] },
];

export function canAccessRoute(role: string | null | undefined, pathname: string): boolean {
  if (pathname === '/' || pathname === '/kinetic' || pathname === '/login') {
    return true;
  }
  const normalized = normalizeUserRole(role);
  if (!normalized) return false;

  const matched = ROUTE_ALLOWED_ROLES.find((entry) =>
    entry.prefix.endsWith('/')
      ? pathname.startsWith(entry.prefix)
      : pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`)
  );

  if (!matched) {
    return normalized === 'ADMIN' || normalized === 'DISPATCHER';
  }
  return matched.roles.includes(normalized);
}
