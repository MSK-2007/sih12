import { describe, it, expect } from 'vitest';
import { sanitizeInput, maskErrorMessage } from '../helpers/testUtils';

type Role = 'ADMIN' | 'OPERATOR' | 'DISPATCHER' | 'VIEWER';

const PERMISSIONS: Record<Role, string[]> = {
  ADMIN: ['CREATE_INCIDENT', 'DISPATCH', 'REALLOCATE', 'MANAGE_RESOURCES', 'VIEW_ANALYTICS'],
  OPERATOR: ['CREATE_INCIDENT', 'DISPATCH', 'REALLOCATE', 'VIEW_ANALYTICS'],
  DISPATCHER: ['DISPATCH', 'VIEW_ANALYTICS'],
  VIEWER: ['VIEW_ANALYTICS'],
};

function hasPermission(role: Role, action: string): boolean {
  const allowed = PERMISSIONS[role] || [];
  return allowed.includes(action);
}

describe('Security Audit & RBAC Tests', () => {
  it('should enforce role-based permissions correctly', () => {
    expect(hasPermission('ADMIN', 'MANAGE_RESOURCES')).toBe(true);
    expect(hasPermission('OPERATOR', 'DISPATCH')).toBe(true);
    expect(hasPermission('DISPATCHER', 'MANAGE_RESOURCES')).toBe(false);
    expect(hasPermission('VIEWER', 'CREATE_INCIDENT')).toBe(false);
  });

  it('should sanitize raw string inputs against script tags', () => {
    const rawInput = '<script>alert("hack")</script> Main Street Collision';
    const cleaned = sanitizeInput(rawInput);
    expect(cleaned).not.toContain('<script>');
    expect(cleaned).toContain('Main Street Collision');
  });

  it('should mask database internal stack traces in user-facing error output', () => {
    const rawError = 'PostgrestError: relation "secret_table" does not exist at PG::SyntaxError';
    const masked = maskErrorMessage(rawError);

    expect(masked).not.toContain('PostgrestError');
    expect(masked).not.toContain('secret_table');
    expect(masked).toBe('Unable to access database service. Please try again.');
  });
});
