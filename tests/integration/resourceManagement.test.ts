import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/services/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {},
}));

import { validateResourceStatusTransition } from '../../src/types/resource';
import {
  getResources,
  createResource,
  updateResourceStatus,
  updateResourceLocation,
} from '../../src/services/resources';
import { allocationEngine } from '../../src/engines/allocationEngine';
import { MOCK_INCIDENT_ROAD_ACCIDENT, MOCK_RESOURCE_AMBULANCE, MOCK_RESOURCE_OFFLINE } from '../fixtures/mockData';
import { RouteResult } from '../../src/types/map';

const mockRoute: RouteResult = {
  distanceKm: 2.5,
  durationMinutes: 5,
  geometry: [[12.97, 77.59], [12.9716, 77.5946]],
  provider: 'OSRM',
  calculatedAt: new Date().toISOString(),
};

describe('Resource Management Integration Tests (Actual App Modules)', () => {
  it('should validate resource state transitions using validateResourceStatusTransition', () => {
    expect(validateResourceStatusTransition('AVAILABLE', 'ASSIGNED').valid).toBe(true);
    expect(validateResourceStatusTransition('ASSIGNED', 'BUSY').valid).toBe(true);
    expect(validateResourceStatusTransition('BUSY', 'AVAILABLE').valid).toBe(true);
    expect(validateResourceStatusTransition('OFFLINE', 'ASSIGNED').valid).toBe(false);
    expect(validateResourceStatusTransition('BUSY', 'ASSIGNED').valid).toBe(false);
  });

  it('should exclude OFFLINE, BUSY, and ASSIGNED units in allocationEngine', () => {
    const busyUnit = { ...MOCK_RESOURCE_AMBULANCE, id: 'res-busy', status: 'BUSY' as const };
    const assignedUnit = { ...MOCK_RESOURCE_AMBULANCE, id: 'res-assigned', status: 'ASSIGNED' as const };

    const analysis = allocationEngine.analyzeAllocation(MOCK_INCIDENT_ROAD_ACCIDENT, [
      { resource: MOCK_RESOURCE_AMBULANCE, route: mockRoute },
      { resource: MOCK_RESOURCE_OFFLINE, route: mockRoute },
      { resource: busyUnit, route: mockRoute },
      { resource: assignedUnit, route: mockRoute },
    ]);

    expect(analysis.recommendations.length).toBe(1);
    expect(analysis.recommendations[0].resourceId).toBe(MOCK_RESOURCE_AMBULANCE.id);
  });

  it('should create a resource, reject duplicate codes, and update status and GPS coordinates', async () => {
    const uniqueCode = `AMB-T-${Date.now().toString().slice(-4)}`;
    const created = await createResource({
      resourceCode: uniqueCode,
      name: 'Test Rapid Response Unit',
      resourceType: 'AMBULANCE',
      capability: ['ADVANCED_LIFE_SUPPORT'],
      capacity: 2,
      latitude: 12.97,
      longitude: 77.59,
    });

    expect(created.resourceCode).toBe(uniqueCode.toUpperCase());
    await expect(
      createResource({
        resourceCode: uniqueCode,
        name: 'Duplicate Unit',
        resourceType: 'AMBULANCE',
        capability: ['BASIC_LIFE_SUPPORT'],
        capacity: 1,
        latitude: 12.97,
        longitude: 77.59,
      })
    ).rejects.toThrow(/already exists/i);

    const statusRes = await updateResourceStatus(created.id, 'ASSIGNED', 'asgn-test');
    expect(statusRes.success).toBe(true);
    expect(statusRes.resource?.status).toBe('ASSIGNED');

    const moved = await updateResourceLocation(created.id, 12.98, 77.61);
    expect(moved?.latitude).toBe(12.98);
    expect(moved?.longitude).toBe(77.61);

    const list = await getResources({ searchQuery: uniqueCode });
    expect(list.some((r) => r.id === created.id)).toBe(true);
  });
});
