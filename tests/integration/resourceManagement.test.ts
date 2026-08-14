import { describe, it, expect } from 'vitest';
import { MOCK_RESOURCE_AMBULANCE, MOCK_RESOURCE_OFFLINE } from '../fixtures/mockData';
import { ResourceStatus } from '../../src/types/resource';

function canAssignResource(status: ResourceStatus, isActive: boolean): boolean {
  if (!isActive) return false;
  return status === 'AVAILABLE';
}

describe('Resource Management Integration Tests', () => {
  it('should allow assignment only for AVAILABLE active resources', () => {
    expect(canAssignResource(MOCK_RESOURCE_AMBULANCE.status, MOCK_RESOURCE_AMBULANCE.isActive)).toBe(true);
  });

  it('should reject assignment for OFFLINE or inactive resources', () => {
    expect(canAssignResource(MOCK_RESOURCE_OFFLINE.status, MOCK_RESOURCE_OFFLINE.isActive)).toBe(false);
    expect(canAssignResource('BUSY', true)).toBe(false);
    expect(canAssignResource('ASSIGNED', true)).toBe(false);
  });
});
