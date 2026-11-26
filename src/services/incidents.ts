import { supabase, isSupabaseConfigured, markBackendLive, markBackendOffline } from './supabase';
import {
  Incident,
  CreateIncidentInput,
  UpdateIncidentInput,
  IncidentStatus,
  IncidentUpdate,
  IncidentFilters,
  isValidStatusTransition,
} from '../types/incident';
import { DataSourceType } from '../types/externalData';
import { INITIAL_INCIDENTS } from './mockData';
import { priorityEngine, PriorityAnalysis } from '../engines/priorityEngine';
import { createAuditLog } from './auditLogs';
import { assertAuthorizedActor } from './authGuard';

let localIncidentsStore: Incident[] = [...INITIAL_INCIDENTS];
let localIncidentUpdatesStore: IncidentUpdate[] = [
  {
    id: 'upd-1',
    incidentId: 'i1111111-1111-1111-1111-111111111111',
    status: 'REPORTED',
    message: 'Incident reported via 112 emergency line. Multiple vehicles involved.',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'upd-2',
    incidentId: 'i5555555-5555-5555-5555-555555555555',
    status: 'REPORTED',
    message: 'Construction site emergency call received. Scaffolding collapse reported.',
    createdAt: new Date().toISOString(),
  },
];

let incidentSequenceCounter = 1006;

/**
 * Fetches all incidents with optional search, filter, and sort criteria.
 */
export async function getIncidents(filters?: IncidentFilters): Promise<Incident[]> {
  let incidentsList: Incident[] = [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('priority_score', { ascending: false });

      if (!error && data) {
        markBackendLive();
        incidentsList = data.map(mapDbIncidentToModel);
      } else {
        markBackendOffline(error?.message || 'Failed to query incidents from Supabase');
        incidentsList = [...localIncidentsStore];
      }
    } catch (err: unknown) {
      markBackendOffline(err instanceof Error ? err.message : 'Supabase incidents query failed');
      incidentsList = [...localIncidentsStore];
    }
  } else {
    incidentsList = [...localIncidentsStore];
  }

  // Client-side filtering & sorting
  if (filters) {
    const query = filters.searchQuery?.trim().toLowerCase();
    if (query) {
      incidentsList = incidentsList.filter(
        (i) =>
          i.incidentNumber.toLowerCase().includes(query) ||
          i.title.toLowerCase().includes(query) ||
          i.address.toLowerCase().includes(query) ||
          i.description?.toLowerCase().includes(query)
      );
    }

    if (filters.emergencyType && filters.emergencyType !== 'ALL') {
      incidentsList = incidentsList.filter((i) => i.emergencyType === filters.emergencyType);
    }

    if (filters.priorityLevel && filters.priorityLevel !== 'ALL') {
      incidentsList = incidentsList.filter((i) => i.priorityLevel === filters.priorityLevel);
    }

    if (filters.status && filters.status !== 'ALL') {
      incidentsList = incidentsList.filter((i) => i.status === filters.status);
    }

    if (filters.injuryLevel && filters.injuryLevel !== 'ALL') {
      incidentsList = incidentsList.filter((i) => i.injuryLevel === filters.injuryLevel);
    }

    // Sorting
    const sortBy = filters.sortBy || 'priority_score';
    const isAsc = filters.sortOrder === 'asc';

    incidentsList.sort((a, b) => {
      let valA: any = a[sortBy === 'priority_score' ? 'priorityScore' : sortBy === 'reported_at' ? 'reportedAt' : sortBy === 'people_affected' ? 'peopleAffected' : 'status'];
      let valB: any = b[sortBy === 'priority_score' ? 'priorityScore' : sortBy === 'reported_at' ? 'reportedAt' : sortBy === 'people_affected' ? 'peopleAffected' : 'status'];

      if (sortBy === 'priority_score' || sortBy === 'people_affected') {
        return isAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      }
      if (sortBy === 'reported_at') {
        return isAsc
          ? new Date(valA).getTime() - new Date(valB).getTime()
          : new Date(valB).getTime() - new Date(valA).getTime();
      }
      return isAsc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });
  }

  return incidentsList;
}

/**
 * Fetches a single incident by ID.
 */
export async function getIncidentById(id: string): Promise<Incident | null> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      return mapDbIncidentToModel(data);
    }
  }
  return localIncidentsStore.find((i) => i.id === id) || null;
}

/**
 * Creates a new incident.
 */
export async function createIncident(input: CreateIncidentInput): Promise<Incident> {
  const actor = await assertAuthorizedActor('INCIDENT_CREATE', 'createIncident');
  const now = new Date().toISOString();
  const envRisk = Math.min(100, Math.max(0, Number(input.environmentalRiskScore ?? 0)));

  const initialPriority = priorityEngine.calculatePriority({
    emergency_type: input.emergencyType,
    people_affected: input.peopleAffected,
    injury_level: input.injuryLevel,
    reported_at: input.reportedAt || now,
    currentTime: now,
    environmentalRiskScore: envRisk,
  });

  let nextIncNumber = `INC-${incidentSequenceCounter++}`;
  if (isSupabaseConfigured) {
    try {
      const { data: seqData, error: seqErr } = await supabase.rpc('generate_next_incident_number');
      if (!seqErr && typeof seqData === 'string' && seqData.startsWith('INC-')) {
        nextIncNumber = seqData;
      }
    } catch {
      // fallback to local sequence number if RPC is unavailable
    }
  }

  const newIncident: Incident = {
    id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    incidentNumber: nextIncNumber,
    emergencyType: input.emergencyType,
    title: input.title,
    description: input.description,
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    peopleAffected: input.peopleAffected,
    injuryLevel: input.injuryLevel,
    severity: initialPriority.level,
    priorityScore: initialPriority.score,
    priorityLevel: initialPriority.level,
    environmentalRiskScore: envRisk,
    status: 'REPORTED',
    sourceType: input.sourceType || 'MANUAL',
    reportedAt: input.reportedAt || now,
    locationId: input.locationId,
    createdAt: now,
    updatedAt: now,
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('incidents')
      .insert({
        incident_number: newIncident.incidentNumber,
        emergency_type: newIncident.emergencyType,
        title: newIncident.title,
        description: newIncident.description,
        latitude: newIncident.latitude,
        longitude: newIncident.longitude,
        address: newIncident.address,
        people_affected: newIncident.peopleAffected,
        injury_level: newIncident.injuryLevel,
        severity: newIncident.severity,
        priority_score: newIncident.priorityScore,
        priority_level: newIncident.priorityLevel,
        environmental_risk_score: newIncident.environmentalRiskScore,
        status: newIncident.status,
        source_type: newIncident.sourceType,
        reported_at: newIncident.reportedAt,
        location_id: newIncident.locationId || null,
        reported_by: actor?.userId || null,
        created_by: actor?.userId || null,
      })
      .select()
      .single();

    if (!error && data) {
      markBackendLive();
      const createdModel = mapDbIncidentToModel(data);
      await addIncidentUpdate(createdModel.id, `Incident ${createdModel.incidentNumber} reported into control room`, 'REPORTED');
      await createAuditLog('INCIDENT_CREATED', 'incident', createdModel.id, undefined, {
        incidentNumber: createdModel.incidentNumber,
        priorityScore: createdModel.priorityScore,
        priorityLevel: createdModel.priorityLevel,
        sourceType: createdModel.sourceType,
      });
      return createdModel;
    }

    markBackendOffline(error?.message || 'Failed to persist incident in Supabase');
    throw new Error(`Failed to persist incident in Supabase: ${error?.message || 'Unknown error'}`);
  }

  localIncidentsStore.unshift(newIncident);
  await addIncidentUpdate(newIncident.id, `Incident ${newIncident.incidentNumber} reported into control room`, 'REPORTED');
  await createAuditLog('INCIDENT_CREATED', 'incident', newIncident.id, undefined, {
    incidentNumber: newIncident.incidentNumber,
    priorityScore: newIncident.priorityScore,
    priorityLevel: newIncident.priorityLevel,
    sourceType: newIncident.sourceType,
  });
  return { ...newIncident };
}

/**
 * Updates an incident's fields, enforcing lifecycle transition rules if status is supplied.
 */
export async function updateIncident(
  id: string,
  input: UpdateIncidentInput,
  expectedCurrentStatus?: IncidentStatus
): Promise<Incident | null> {
  await assertAuthorizedActor('INCIDENT_UPDATE', 'updateIncident');
  const now = new Date().toISOString();
  const current = await getIncidentById(id);
  if (!current) return null;

  if (expectedCurrentStatus && current.status !== expectedCurrentStatus) {
    throw new Error(
      `Concurrent incident update detected: status is ${current.status}, expected ${expectedCurrentStatus}`
    );
  }

  if (input.status !== undefined && !isValidStatusTransition(current.status, input.status)) {
    throw new Error(`Invalid status transition from ${current.status} to ${input.status}`);
  }

  if (isSupabaseConfigured) {
    const dbPatch: Record<string, unknown> = { updated_at: now };
    if (input.title !== undefined) dbPatch.title = input.title;
    if (input.description !== undefined) dbPatch.description = input.description;
    if (input.emergencyType !== undefined) dbPatch.emergency_type = input.emergencyType;
    if (input.address !== undefined) dbPatch.address = input.address;
    if (input.peopleAffected !== undefined) dbPatch.people_affected = input.peopleAffected;
    if (input.injuryLevel !== undefined) dbPatch.injury_level = input.injuryLevel;
    if (input.status !== undefined) {
      dbPatch.status = input.status;
      if (input.status === 'RESOLVED') dbPatch.resolved_at = now;
    }
    if (input.sourceType !== undefined) dbPatch.source_type = input.sourceType;
    if (input.environmentalRiskScore !== undefined) {
      dbPatch.environmental_risk_score = Math.min(100, Math.max(0, input.environmentalRiskScore));
    }

    let query = supabase.from('incidents').update(dbPatch).eq('id', id);
    if (input.status !== undefined || expectedCurrentStatus) {
      query = query.eq('status', expectedCurrentStatus || current.status);
    }

    const { data, error } = await query.select().single();

    if (!error && data) {
      markBackendLive();
      return mapDbIncidentToModel(data);
    }

    markBackendOffline(error?.message || 'Failed to update incident in Supabase');
    throw new Error(`Failed to update incident in Supabase: ${error?.message || 'Concurrent conflict or DB error'}`);
  }

  const incident = localIncidentsStore.find((i) => i.id === id);
  if (incident) {
    if ((input.status !== undefined || expectedCurrentStatus) && incident.status !== (expectedCurrentStatus || current.status)) {
      throw new Error(`Concurrent incident update detected for ${incident.incidentNumber}`);
    }
    if (input.title !== undefined) incident.title = input.title;
    if (input.description !== undefined) incident.description = input.description;
    if (input.emergencyType !== undefined) incident.emergencyType = input.emergencyType;
    if (input.address !== undefined) incident.address = input.address;
    if (input.peopleAffected !== undefined) incident.peopleAffected = input.peopleAffected;
    if (input.injuryLevel !== undefined) incident.injuryLevel = input.injuryLevel;
    if (input.status !== undefined) incident.status = input.status;
    if (input.sourceType !== undefined) incident.sourceType = input.sourceType;
    if (input.environmentalRiskScore !== undefined) {
      incident.environmentalRiskScore = Math.min(100, Math.max(0, input.environmentalRiskScore));
    }
    incident.updatedAt = now;
    return { ...incident };
  }
  return null;
}

/**
 * Updates an incident status with transition rules validation and optimistic concurrency control.
 */
export async function updateIncidentStatus(
  id: string,
  newStatus: IncidentStatus,
  message: string = ''
): Promise<{ success: boolean; incident?: Incident; error?: string }> {
  const currentIncident = await getIncidentById(id);
  if (!currentIncident) {
    return { success: false, error: 'Incident not found' };
  }

  if (!isValidStatusTransition(currentIncident.status, newStatus)) {
    return {
      success: false,
      error: `Invalid status transition from ${currentIncident.status} to ${newStatus}`,
    };
  }

  try {
    const updatedIncident = await updateIncident(id, { status: newStatus }, currentIncident.status);
    if (updatedIncident) {
      if (currentIncident.status !== newStatus || message) {
        await addIncidentUpdate(
          id,
          message || `Status updated from ${currentIncident.status} to ${newStatus}`,
          newStatus
        );
      }
      if (currentIncident.status !== newStatus) {
        await createAuditLog(
          'INCIDENT_STATUS_CHANGED',
          'incident',
          id,
          { status: currentIncident.status },
          { status: newStatus, message }
        );
      }
      return { success: true, incident: updatedIncident };
    }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update status',
    };
  }

  return { success: false, error: 'Failed to update status' };
}

/**
 * Advances an incident along the standard dispatch preparation path
 * (REPORTED -> ANALYSING -> PRIORITIZED -> AWAITING_DISPATCH -> DISPATCHED)
 * while respecting ALLOWED_STATUS_TRANSITIONS.
 */
export async function advanceIncidentToStatus(
  id: string,
  targetStatus: 'PRIORITIZED' | 'AWAITING_DISPATCH' | 'DISPATCHED',
  finalMessage?: string
): Promise<{ success: boolean; incident?: Incident; error?: string }> {
  const orderedPath: IncidentStatus[] = ['REPORTED', 'ANALYSING', 'PRIORITIZED', 'AWAITING_DISPATCH', 'DISPATCHED'];
  let current = await getIncidentById(id);
  if (!current) return { success: false, error: 'Incident not found' };

  if (current.status === targetStatus) {
    if (finalMessage) {
      await addIncidentUpdate(id, finalMessage, targetStatus);
    }
    return { success: true, incident: current };
  }

  const currentIdx = orderedPath.indexOf(current.status);
  const targetIdx = orderedPath.indexOf(targetStatus);
  if (currentIdx === -1 || targetIdx === -1 || currentIdx > targetIdx) {
    return {
      success: false,
      error: `Invalid status transition from ${current.status} to ${targetStatus}`,
    };
  }

  for (let idx = currentIdx + 1; idx <= targetIdx; idx++) {
    const nextStep = orderedPath[idx];
    const stepMsg =
      idx === targetIdx && finalMessage
        ? finalMessage
        : `Incident transitioned to ${nextStep.replace(/_/g, ' ')}`;
    const res = await updateIncidentStatus(id, nextStep, stepMsg);
    if (!res.success || !res.incident) {
      return res;
    }
    current = res.incident;
  }

  return { success: true, incident: current };
}

/**
 * Adds an update timeline entry for an incident.
 */
export async function addIncidentUpdate(
  incidentId: string,
  message: string,
  status: IncidentStatus
): Promise<IncidentUpdate> {
  const newUpdate: IncidentUpdate = {
    id: `upd-${Date.now()}`,
    incidentId,
    status,
    message,
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('incident_updates')
      .insert({
        incident_id: incidentId,
        status,
        message,
      })
      .select()
      .single();

    if (!error && data) {
      return {
        id: data.id as string,
        incidentId: data.incident_id as string,
        status: data.status as IncidentStatus,
        message: data.message as string,
        createdAt: data.created_at as string,
      };
    }
  }

  localIncidentUpdatesStore.push(newUpdate);
  return newUpdate;
}

/**
 * Fetches the timeline update logs for a specific incident.
 */
export async function getIncidentUpdates(incidentId: string): Promise<IncidentUpdate[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('incident_updates')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data.map((d) => ({
        id: d.id as string,
        incidentId: d.incident_id as string,
        status: d.status as IncidentStatus,
        message: d.message as string,
        createdAt: d.created_at as string,
      }));
    }
  }

  return localIncidentUpdatesStore
    .filter((u) => u.incidentId === incidentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Runs the Priority Intelligence Engine on an incident and persists score & level.
 */
export async function recalculateIncidentPriority(
  incidentId: string,
  options?: { environmentalRiskScore?: number }
): Promise<{ incident: Incident; analysis: PriorityAnalysis } | null> {
  const incident = await getIncidentById(incidentId);
  if (!incident) return null;

  let envRiskScore = options?.environmentalRiskScore;
  let envHazardSummary = '';

  if (envRiskScore === undefined) {
    try {
      const { evaluateIncidentEnvironmentalContext } = await import('./environmentalIntelligenceService');
      const envReport = await evaluateIncidentEnvironmentalContext(incident, 50);
      envRiskScore = envReport.compositeRiskScore;
      if (envReport.matchedEventsCount > 0) {
        envHazardSummary = ` | Env Risk: ${envRiskScore}/100 (${envReport.primaryHazard})`;
      }
    } catch {
      envRiskScore = incident.environmentalRiskScore ?? 0;
    }
  }

  envRiskScore = Math.min(100, Math.max(0, Number(envRiskScore ?? 0)));

  const analysis = priorityEngine.calculatePriority({
    emergency_type: incident.emergencyType,
    people_affected: incident.peopleAffected,
    injury_level: incident.injuryLevel,
    reported_at: incident.reportedAt,
    environmentalRiskScore: envRiskScore,
  });

  const now = new Date().toISOString();

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('incidents')
      .update({
        priority_score: analysis.score,
        priority_level: analysis.level,
        severity: analysis.level,
        environmental_risk_score: envRiskScore,
        updated_at: now,
      })
      .eq('id', incidentId)
      .select()
      .single();

    if (!error && data) {
      markBackendLive();
      const updatedModel = mapDbIncidentToModel(data);
      await addIncidentUpdate(
        incidentId,
        `Priority Recalculated: ${analysis.score}/100 — ${analysis.level} (${analysis.urgency})${envHazardSummary}`,
        updatedModel.status
      );
      await createAuditLog(
        'PRIORITY_RECALCULATED',
        'incident',
        incidentId,
        { priorityScore: incident.priorityScore, environmentalRiskScore: incident.environmentalRiskScore ?? 0 },
        { priorityScore: analysis.score, priorityLevel: analysis.level, environmentalRiskScore: envRiskScore }
      );
      return { incident: updatedModel, analysis };
    }
  }

  const localTarget = localIncidentsStore.find((i) => i.id === incidentId);
  if (localTarget) {
    localTarget.priorityScore = analysis.score;
    localTarget.priorityLevel = analysis.level;
    localTarget.severity = analysis.level;
    localTarget.environmentalRiskScore = envRiskScore;
    localTarget.updatedAt = now;
  }

  incident.priorityScore = analysis.score;
  incident.priorityLevel = analysis.level;
  incident.severity = analysis.level;
  incident.environmentalRiskScore = envRiskScore;
  incident.updatedAt = now;

  await addIncidentUpdate(
    incidentId,
    `Priority Recalculated: ${analysis.score}/100 — ${analysis.level} (${analysis.urgency})${envHazardSummary}`,
    incident.status
  );
  await createAuditLog(
    'PRIORITY_RECALCULATED',
    'incident',
    incidentId,
    undefined,
    { priorityScore: analysis.score, priorityLevel: analysis.level, environmentalRiskScore: envRiskScore }
  );

  return { incident: { ...incident }, analysis };
}


function mapDbIncidentToModel(data: Record<string, unknown>): Incident {
  return {
    id: data.id as string,
    incidentNumber: data.incident_number as string,
    emergencyType: data.emergency_type as any,
    title: data.title as string,
    description: (data.description as string) || '',
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    address: data.address as string,
    peopleAffected: Number(data.people_affected),
    injuryLevel: data.injury_level as any,
    severity: (data.severity as any) || 'MEDIUM',
    priorityScore: Number(data.priority_score || 0),
    priorityLevel: (data.priority_level as any) || 'MEDIUM',
    environmentalRiskScore: Number(data.environmental_risk_score || 0),
    status: data.status as any,
    sourceType: (data.source_type as DataSourceType) || 'MANUAL',
    reportedAt: data.reported_at as string,
    createdBy: data.created_by as string,
    assignedOperator: data.assigned_operator as string,
    locationId: data.location_id as string,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}
