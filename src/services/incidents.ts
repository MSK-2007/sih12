import { supabase, isSupabaseConfigured } from './supabase';
import {
  Incident,
  CreateIncidentInput,
  UpdateIncidentInput,
  IncidentStatus,
  IncidentUpdate,
  IncidentFilters,
  isValidStatusTransition,
} from '../types/incident';
import { INITIAL_INCIDENTS } from './mockData';
import { priorityEngine, PriorityAnalysis } from '../engines/priorityEngine';

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
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('priority_score', { ascending: false });

    if (!error && data) {
      incidentsList = data.map(mapDbIncidentToModel);
    } else {
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
  const nextIncNumber = `INC-${incidentSequenceCounter++}`;
  const now = new Date().toISOString();

  const newIncident: Incident = {
    id: `inc-${Date.now()}`,
    incidentNumber: nextIncNumber,
    emergencyType: input.emergencyType,
    title: input.title,
    description: input.description,
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    peopleAffected: input.peopleAffected,
    injuryLevel: input.injuryLevel,
    severity: 'MEDIUM', // Initial default until Phase 7 Priority Engine
    priorityScore: 0,   // Initial default until Phase 7 Priority Engine
    priorityLevel: 'MEDIUM',
    status: 'REPORTED',
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
        status: newIncident.status,
        reported_at: newIncident.reportedAt,
        location_id: newIncident.locationId,
      })
      .select()
      .single();

    if (!error && data) {
      const createdModel = mapDbIncidentToModel(data);
      await addIncidentUpdate(createdModel.id, `Incident ${createdModel.incidentNumber} reported into control room`, 'REPORTED');
      return createdModel;
    }
  }

  localIncidentsStore.unshift(newIncident);
  await addIncidentUpdate(newIncident.id, `Incident ${newIncident.incidentNumber} reported into control room`, 'REPORTED');
  return newIncident;
}

/**
 * Updates an incident's fields.
 */
export async function updateIncident(id: string, input: UpdateIncidentInput): Promise<Incident | null> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('incidents')
      .update({
        title: input.title,
        description: input.description,
        emergency_type: input.emergencyType,
        address: input.address,
        people_affected: input.peopleAffected,
        injury_level: input.injuryLevel,
        status: input.status,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      return mapDbIncidentToModel(data);
    }
  }

  const incident = localIncidentsStore.find((i) => i.id === id);
  if (incident) {
    if (input.title !== undefined) incident.title = input.title;
    if (input.description !== undefined) incident.description = input.description;
    if (input.emergencyType !== undefined) incident.emergencyType = input.emergencyType;
    if (input.address !== undefined) incident.address = input.address;
    if (input.peopleAffected !== undefined) incident.peopleAffected = input.peopleAffected;
    if (input.injuryLevel !== undefined) incident.injuryLevel = input.injuryLevel;
    if (input.status !== undefined) incident.status = input.status;
    incident.updatedAt = now;
    return { ...incident };
  }
  return null;
}

/**
 * Updates an incident status with transition rules validation.
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

  const updatedIncident = await updateIncident(id, { status: newStatus });
  if (updatedIncident) {
    await addIncidentUpdate(
      id,
      message || `Status updated from ${currentIncident.status} to ${newStatus}`,
      newStatus
    );
    return { success: true, incident: updatedIncident };
  }

  return { success: false, error: 'Failed to update status' };
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
  incidentId: string
): Promise<{ incident: Incident; analysis: PriorityAnalysis } | null> {
  const incident = await getIncidentById(incidentId);
  if (!incident) return null;

  const analysis = priorityEngine.calculatePriority({
    emergency_type: incident.emergencyType,
    people_affected: incident.peopleAffected,
    injury_level: incident.injuryLevel,
    severity: incident.priorityScore || 50,
    reported_at: incident.reportedAt,
  });

  const now = new Date().toISOString();

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('incidents')
      .update({
        priority_score: analysis.score,
        priority_level: analysis.level,
        updated_at: now,
      })
      .eq('id', incidentId)
      .select()
      .single();

    if (!error && data) {
      const updatedModel = mapDbIncidentToModel(data);
      await addIncidentUpdate(
        incidentId,
        `AI Priority Recalculated: ${analysis.score}/100 — ${analysis.level} (${analysis.urgency})`,
        incident.status
      );
      return { incident: updatedModel, analysis };
    }
  }

  incident.priorityScore = analysis.score;
  incident.priorityLevel = analysis.level;
  incident.updatedAt = now;

  await addIncidentUpdate(
    incidentId,
    `AI Priority Recalculated: ${analysis.score}/100 — ${analysis.level} (${analysis.urgency})`,
    incident.status
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
    status: data.status as any,
    reportedAt: data.reported_at as string,
    createdBy: data.created_by as string,
    assignedOperator: data.assigned_operator as string,
    locationId: data.location_id as string,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}
