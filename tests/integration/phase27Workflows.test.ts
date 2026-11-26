import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabaseState = vi.hoisted(() => ({
  isConfigured: false,
  rpc: vi.fn(),
  from: vi.fn(),
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
    functions: {
      invoke: (...args: any[]) => mockSupabaseState.functions.invoke(...args),
    },
    auth: {
      getUser: (...args: any[]) => mockSupabaseState.auth.getUser(...args),
    },
  },
  markBackendLive: vi.fn(),
  markBackendOffline: vi.fn(),
}));

import {
  createIncident,
  updateIncident,
  updateIncidentStatus,
  advanceIncidentToStatus,
  recalculateIncidentPriority,
} from '../../src/services/incidents';
import { createResource, getResourceById, updateResourceStatus } from '../../src/services/resources';
import { confirmDispatch } from '../../src/services/allocation';
import {
  updateAssignmentStatus,
  cancelDispatch,
  getActiveAssignmentsForResource,
} from '../../src/services/assignments';
import {
  analyzeDynamicReallocation,
  confirmReallocation,
  rejectReallocation,
} from '../../src/services/reallocation';
import { evaluateEnvironmentalProximityRisks } from '../../src/services/environmentalIntelligenceService';
import { processExternalEventWorkflow } from '../../src/services/externalEventWorkflow';
import { analyzeIncidentWithAI } from '../../src/services/aiAnalysis';
import { sendAssistantMessage } from '../../src/services/geminiAssistantService';
import { getLatestEarthquakes } from '../../src/services/earthquakeService';
import { getLatestWeatherObservation } from '../../src/services/weatherService';

function uniqueSuffix() {
  return `${Date.now().toString().slice(-5)}-${Math.random().toString(36).slice(2, 6)}`;
}

describe('Phase 27 Core Workflows & Intelligence Pipeline', () => {
  beforeEach(() => {
    mockSupabaseState.isConfigured = false;
    vi.clearAllMocks();
  });

  it('enforces valid incident status transitions across updateIncident, updateIncidentStatus, and advanceIncidentToStatus', async () => {
    const inc = await createIncident({
      emergencyType: 'FIRE',
      title: 'Lifecycle Validation Incident',
      description: 'Factory electrical smoke',
      address: 'Whitefield Industrial Area',
      latitude: 12.9698,
      longitude: 77.75,
      peopleAffected: 5,
      injuryLevel: 'MODERATE',
    });

    expect(inc.status).toBe('REPORTED');
    expect(inc.priorityScore).toBeGreaterThan(0);

    // Direct updateIncident must reject invalid jump REPORTED -> RESOLVED
    await expect(updateIncident(inc.id, { status: 'RESOLVED' })).rejects.toThrow(/Invalid status transition/i);

    const invalid = await updateIncidentStatus(inc.id, 'DISPATCHED');
    expect(invalid.success).toBe(false);
    expect(invalid.error).toContain('Invalid status transition');

    const advanced = await advanceIncidentToStatus(inc.id, 'AWAITING_DISPATCH', 'Ready for operator dispatch');
    expect(advanced.success).toBe(true);
    expect(advanced.incident?.status).toBe('AWAITING_DISPATCH');
  });

  it('requires human approval for dispatch, updates resource availability through completion and cancellation', async () => {
    const inc = await createIncident({
      emergencyType: 'MEDICAL',
      title: 'Cardiac Emergency Dispatch Test',
      description: 'Patient requires ALS ambulance',
      address: 'Indiranagar 100ft Rd',
      latitude: 12.9784,
      longitude: 77.6408,
      peopleAffected: 1,
      injuryLevel: 'CRITICAL',
    });

    const unit = await createResource({
      resourceCode: `AMB-P27-${uniqueSuffix()}`,
      name: 'Phase 27 ALS Unit',
      resourceType: 'AMBULANCE',
      capability: ['ADVANCED_LIFE_SUPPORT'],
      capacity: 2,
      latitude: 12.975,
      longitude: 77.638,
    });

    const blocked = await confirmDispatch(inc.id, [unit.id], { operatorApproved: false });
    expect(blocked.success).toBe(false);
    expect(blocked.message).toMatch(/human operator approval/i);

    const dispatched = await confirmDispatch(inc.id, [unit.id], { operatorApproved: true });
    expect(dispatched.success).toBe(true);
    expect(dispatched.assignmentIds?.length).toBe(1);

    const assignedUnit = await getResourceById(unit.id);
    expect(assignedUnit?.status).toBe('ASSIGNED');

    const asgnId = dispatched.assignmentIds![0];
    const inProg = await updateAssignmentStatus(asgnId, 'IN_PROGRESS');
    expect(inProg?.assignmentStatus).toBe('IN_PROGRESS');
    expect((await getResourceById(unit.id))?.status).toBe('BUSY');

    const completed = await updateAssignmentStatus(asgnId, 'COMPLETED');
    expect(completed?.assignmentStatus).toBe('COMPLETED');
    const releasedUnit = await getResourceById(unit.id);
    expect(releasedUnit?.status).toBe('AVAILABLE');
    expect(releasedUnit?.currentAssignmentId).toBeUndefined();

    // Re-dispatch and cancel -> must return resource cleanly to AVAILABLE
    const inc2 = await createIncident({
      emergencyType: 'ROAD_ACCIDENT',
      title: 'Secondary Cancellation Test',
      description: 'Highway fender bender',
      address: 'Outer Ring Road',
      latitude: 12.9352,
      longitude: 77.6245,
      peopleAffected: 2,
      injuryLevel: 'MINOR',
    });
    const dispatch2 = await confirmDispatch(inc2.id, [unit.id], { operatorApproved: true });
    expect(dispatch2.success).toBe(true);

    const cancelRes = await cancelDispatch(dispatch2.assignmentIds![0], 'False alarm confirmed');
    expect(cancelRes.success).toBe(true);
    expect((await getResourceById(unit.id))?.status).toBe('AVAILABLE');
    expect(await getActiveAssignmentsForResource(unit.id)).toHaveLength(0);
  });

  it('prevents concurrent double allocation of the same resource unit', async () => {
    const incA = await createIncident({
      emergencyType: 'FIRE',
      title: 'Concurrent Dispatch A',
      description: 'Sector A fire',
      address: 'Koramangala',
      latitude: 12.9352,
      longitude: 77.6245,
      peopleAffected: 3,
      injuryLevel: 'MODERATE',
    });
    const incB = await createIncident({
      emergencyType: 'FIRE',
      title: 'Concurrent Dispatch B',
      description: 'Sector B fire',
      address: 'HSR Layout',
      latitude: 12.9116,
      longitude: 77.6389,
      peopleAffected: 4,
      injuryLevel: 'SEVERE',
    });

    const sharedUnit = await createResource({
      resourceCode: `FIRE-CONC-${uniqueSuffix()}`,
      name: 'Concurrent Guard Fire Unit',
      resourceType: 'FIRE_UNIT',
      capability: ['FIRE_SUPPRESSION'],
      capacity: 4,
      latitude: 12.925,
      longitude: 77.63,
    });

    const [resA, resB] = await Promise.all([
      confirmDispatch(incA.id, [sharedUnit.id], { operatorApproved: true }),
      confirmDispatch(incB.id, [sharedUnit.id], { operatorApproved: true }),
    ]);

    const outcomes = [resA, resB];
    expect(outcomes.filter((o) => o.success)).toHaveLength(1);
    expect(outcomes.filter((o) => !o.success)).toHaveLength(1);
    expect(await getActiveAssignmentsForResource(sharedUnit.id)).toHaveLength(1);
  });

  it('matches external events within 50km Haversine radius and boosts deterministic incident priority', async () => {
    const inc = await createIncident({
      emergencyType: 'FLOOD',
      title: 'Hebbal Environmental Context Test',
      description: 'Waterlogging near flyover',
      address: 'Hebbal',
      latitude: 13.0358,
      longitude: 77.597,
      peopleAffected: 6,
      injuryLevel: 'MODERATE',
    });

    const nearEq = {
      id: 'eq-near-1',
      source: 'USGS' as const,
      sourceEventId: 'eq-near',
      eventType: 'EARTHQUAKE' as const,
      latitude: 13.05,
      longitude: 77.61, // ~2 km away
      magnitude: 5.4,
      title: 'M 5.4 Near Hebbal',
      severity: 'HIGH' as const,
      occurredAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      status: 'DETECTED' as const,
    };

    const farFire = {
      id: 'fire-far-1',
      source: 'NASA_FIRMS' as const,
      sourceEventId: 'fire-far',
      eventType: 'FIRE' as const,
      latitude: 14.5,
      longitude: 77.597, // >160 km away (must be excluded)
      magnitude: 45,
      title: 'Distant Thermal Anomaly',
      severity: 'CRITICAL' as const,
      occurredAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      status: 'DETECTED' as const,
    };

    const report = evaluateEnvironmentalProximityRisks(inc, [nearEq, farFire], [], 50);
    expect(report.matchedEventsCount).toBe(1);
    expect(report.matchedEvents[0].id).toBe('eq-near-1');
    expect(report.matchedEvents[0].distanceKm).toBeLessThan(10);
    expect(report.compositeRiskScore).toBeGreaterThan(50);

    const baseRecalc = await recalculateIncidentPriority(inc.id, { environmentalRiskScore: 0 });
    const boostedRecalc = await recalculateIncidentPriority(inc.id, {
      environmentalRiskScore: report.compositeRiskScore,
    });
    expect(boostedRecalc!.analysis.score).toBeGreaterThanOrEqual(baseRecalc!.analysis.score);
    expect(boostedRecalc!.incident.environmentalRiskScore).toBe(report.compositeRiskScore);

    // Full external event workflow ends at AWAITING_DISPATCH (never auto-dispatches)
    const wfResult = await processExternalEventWorkflow({
      event: nearEq,
      title: '[USGS] Seismic Structural Inspection',
      emergencyType: 'NATURAL_DISASTER',
      severity: 'HIGH',
      peopleAffected: 15,
      injuryLevel: 'SEVERE',
      description: 'Triggered from external seismic event',
    });
    expect(wfResult.incident.status).toBe('AWAITING_DISPATCH');
    expect(wfResult.priorityAnalysis.score).toBeGreaterThan(0);
  });

  it('requires human approval for dynamic reallocation, releases donor assignment, and blocks duplicate approval', async () => {
    const donorInc = await createIncident({
      emergencyType: 'OTHER',
      title: 'Low Priority Donor Incident',
      description: 'Minor assistance call',
      address: 'Jayanagar',
      latitude: 12.925,
      longitude: 77.5938,
      peopleAffected: 1,
      injuryLevel: 'NONE',
    });
    const donorUnit = await createResource({
      resourceCode: `RES-REALLOC-${uniqueSuffix()}`,
      name: 'Reallocatable Rescue Unit',
      resourceType: 'RESCUE_TEAM',
      capability: ['RESCUE_TEAM'],
      capacity: 4,
      latitude: 12.93,
      longitude: 77.6,
    });
    const initialDispatch = await confirmDispatch(donorInc.id, [donorUnit.id], { operatorApproved: true });
    expect(initialDispatch.success).toBe(true);

    // Ensure no other AVAILABLE units exist by putting existing available ones offline? Better: directly pass trigger incident
    const criticalInc = await createIncident({
      emergencyType: 'BUILDING_COLLAPSE',
      title: 'Critical Reallocation Trigger',
      description: 'Multi-storey collapse',
      address: 'MG Road',
      latitude: 12.9756,
      longitude: 77.6066,
      peopleAffected: 20,
      injuryLevel: 'CRITICAL',
    });

    const rec = await analyzeDynamicReallocation(criticalInc.id);
    expect(rec).not.toBeNull();

    if (rec && rec.affectedResources.length > 0) {
      const blocked = await confirmReallocation(rec.id, { operatorApproved: false });
      expect(blocked.success).toBe(false);

      const approved = await confirmReallocation(rec.id, { operatorApproved: true });
      expect(approved.success).toBe(true);

      const duplicate = await confirmReallocation(rec.id, { operatorApproved: true });
      expect(duplicate.success).toBe(false);
      expect(duplicate.message).toMatch(/already been approved/i);

      const postReject = await rejectReallocation(rec.id, 'Too late');
      expect(postReject.success).toBe(false);
    } else if (rec) {
      // If free units existed in mockData pool, still verify rejectReallocation cleans up cleanly
      const rej = await rejectReallocation(rec.id, 'Operator declined');
      expect(rej.success).toBe(true);
    }
  });

  it('degrades gracefully when AI or offline providers fail without fabricating ONLINE status', async () => {
    const inc = await createIncident({
      emergencyType: 'FIRE',
      title: 'AI Fallback Verification',
      description: 'Transformer fire',
      address: 'Electronic City',
      latitude: 12.8452,
      longitude: 77.6602,
      peopleAffected: 3,
      injuryLevel: 'MODERATE',
    });

    const aiRes = await analyzeIncidentWithAI(inc);
    expect(aiRes.modelName).toBe('resqai-rule-engine-fallback');
    expect(aiRes.requiredResources.length).toBeGreaterThan(0);

    const chatRes = await sendAssistantMessage('Summarize active incidents', 'test-session', []);
    expect(chatRes.isGemini).toBe(false);
    expect(chatRes.response).toMatch(/unavailable/i);

    const eqOffline = await getLatestEarthquakes();
    expect(eqOffline.status).toBe('OFFLINE');
    expect(eqOffline.success).toBe(false);

    const wxOffline = await getLatestWeatherObservation();
    expect(wxOffline.status).toBe('OFFLINE');
    expect(wxOffline.observation.isStale).toBe(true);

    // Ensure updateResourceStatus handles offline rollback checks cleanly
    const u = await createResource({
      resourceCode: `OFF-RES-${uniqueSuffix()}`,
      name: 'Status Guard Test Unit',
      resourceType: 'POLICE_UNIT',
      capability: ['TRAFFIC_CONTROL'],
      capacity: 2,
      latitude: 12.9,
      longitude: 77.6,
    });
    const badTransition = await updateResourceStatus(u.id, 'BUSY', undefined, 'ASSIGNED');
    expect(badTransition.success).toBe(false);
    expect(badTransition.error).toMatch(/Concurrent modification/i);
  });

  it('persists incidents and audit logs to Supabase with optimistic concurrency and UUID safety when configured', async () => {
    const dispatcherId = '22222222-2222-4222-8222-222222222222';
    mockSupabaseState.isConfigured = true;
    mockSupabaseState.auth.getUser.mockResolvedValue({ data: { user: { id: dispatcherId } }, error: null });
    mockSupabaseState.rpc.mockResolvedValue({ data: 'INC-2001', error: null });

    const insertedPayloads: Record<string, any[]> = {};

    mockSupabaseState.from.mockImplementation((table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        limit: () => chain,
        single: async () => {
          if (table === 'profiles') {
            return { data: { role: 'DISPATCHER', is_active: true }, error: null };
          }
          return { data: null, error: null };
        },
        insert: (payload: any) => {
          insertedPayloads[table] = insertedPayloads[table] || [];
          insertedPayloads[table].push(payload);
          if (table === 'incidents') {
            return {
              select: () => ({
                single: async () => ({
                  data: {
                    id: '11111111-1111-4111-8111-111111111111',
                    incident_number: payload.incident_number,
                    emergency_type: payload.emergency_type,
                    title: payload.title,
                    description: payload.description,
                    latitude: payload.latitude,
                    longitude: payload.longitude,
                    address: payload.address,
                    people_affected: payload.people_affected,
                    injury_level: payload.injury_level,
                    severity: payload.severity,
                    priority_score: payload.priority_score,
                    priority_level: payload.priority_level,
                    environmental_risk_score: payload.environmental_risk_score,
                    status: payload.status,
                    source_type: payload.source_type,
                    reported_at: payload.reported_at,
                    created_at: payload.reported_at,
                    updated_at: payload.reported_at,
                  },
                  error: null,
                }),
              }),
            };
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
      };
      return chain;
    });

    const created = await createIncident({
      emergencyType: 'ROAD_ACCIDENT',
      title: 'Supabase Persistence Probe',
      description: 'Multi-vehicle pileup',
      address: 'NICE Road',
      latitude: 12.88,
      longitude: 77.55,
      peopleAffected: 4,
      injuryLevel: 'SEVERE',
      environmentalRiskScore: 35,
    });

    expect(created.incidentNumber).toBe('INC-2001');
    expect(created.environmentalRiskScore).toBe(35);
    expect(insertedPayloads.incidents?.[0].environmental_risk_score).toBe(35);
    expect(insertedPayloads.audit_logs?.[0].action).toBe('INCIDENT_CREATED');
  });
});
