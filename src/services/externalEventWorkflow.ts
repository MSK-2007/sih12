import {
  createIncident,
  advanceIncidentToStatus,
  recalculateIncidentPriority,
  addIncidentUpdate,
} from './incidents';
import { PriorityAnalysis } from '../engines/priorityEngine';
import { allocationEngine, AllocationAnalysis, CandidateRouteData } from '../engines/allocationEngine';
import { getResources } from './resources';
import { getRoute } from './routing';
import { confirmDispatch } from './allocation';
import { supabase, isSupabaseConfigured } from './supabase';
import { ExternalEvent } from '../types/externalEvents';
import { EmergencyType, InjuryLevel, PriorityLevel, Incident } from '../types/incident';
import { getActiveEnvironmentalAlerts } from './environmentalAlertsService';
import { calculateEnvironmentalRiskScore, EnvironmentalAlert } from '../types/externalData';
import { evaluateIncidentEnvironmentalContext } from './environmentalIntelligenceService';

export interface CreateIncidentFromExternalEventInput {
  event: ExternalEvent;
  title: string;
  emergencyType: EmergencyType;
  severity: PriorityLevel;
  peopleAffected: number;
  injuryLevel: InjuryLevel;
  description: string;
  geminiRiskLevel?: string;
  geminiSummary?: string;
}

export interface WorkflowDecisionSupportResult {
  incident: Incident;
  priorityAnalysis: PriorityAnalysis;
  allocationAnalysis: AllocationAnalysis;
  environmentalContext?: {
    score: number;
    relevantAlerts: EnvironmentalAlert[];
  };
}

/**
 * Executes External Event Workflow:
 * External Event -> Incident -> 50km Environmental Risk -> Priority -> Allocation Recommendation (awaits operator approval)
 */
export async function processExternalEventWorkflow(
  input: CreateIncidentFromExternalEventInput
): Promise<WorkflowDecisionSupportResult> {
  const { event, title, emergencyType, peopleAffected, injuryLevel, description } = input;

  // 1. Create Incident record in DB
  let incident = await createIncident({
    emergencyType: emergencyType || 'NATURAL_DISASTER',
    title: title || `[EXTERNAL EVENT] ${event.title}`,
    description: description || `Incident generated from external event: ${event.title}`,
    address: event.title,
    latitude: event.latitude,
    longitude: event.longitude,
    peopleAffected: peopleAffected > 0 ? peopleAffected : event.magnitude >= 6.0 ? 50 : 15,
    injuryLevel: injuryLevel || (event.magnitude >= 6.0 ? 'SEVERE' : 'MODERATE'),
    sourceType: 'EXTERNAL_ALERT',
  });

  // 2. Link external_events row to the new incident
  if (isSupabaseConfigured && event.id) {
    try {
      await supabase
        .from('external_events')
        .update({
          status: 'CONVERTED_TO_INCIDENT',
          incident_id: incident.id,
        })
        .eq('id', event.id);
    } catch (err) {
      console.warn('[Workflow] Warning updating external_events DB:', err);
    }
  }

  // 3. Evaluate 50km Haversine Environmental Context (IMD + USGS + NASA FIRMS)
  let environmentalContext: WorkflowDecisionSupportResult['environmentalContext'] = {
    score: 0,
    relevantAlerts: [],
  };

  try {
    const [activeAlerts, envReport] = await Promise.all([
      getActiveEnvironmentalAlerts(),
      evaluateIncidentEnvironmentalContext(incident, 50),
    ]);
    const alertMatch = calculateEnvironmentalRiskScore(
      incident.latitude,
      incident.longitude,
      activeAlerts,
      50
    );
    environmentalContext = {
      score: Math.max(envReport.compositeRiskScore, alertMatch.score),
      relevantAlerts: alertMatch.relevantAlerts,
    };

    if (envReport.matchedEventsCount > 0 || alertMatch.relevantAlerts.length > 0) {
      await addIncidentUpdate(
        incident.id,
        `Environmental Context (50km): ${envReport.matchedEventsCount} hazard(s) detected (${envReport.primaryHazard}). Composite risk score: ${environmentalContext.score}/100.`,
        incident.status
      );
    }
  } catch (err) {
    console.warn('[Workflow] Environmental context fetch warning:', err);
  }

  // 4. Advance cleanly to PRIORITIZED and calculate deterministic priority with environmental risk score
  await advanceIncidentToStatus(incident.id, 'PRIORITIZED');
  const recalcResult = await recalculateIncidentPriority(incident.id, {
    environmentalRiskScore: environmentalContext.score,
  });
  if (!recalcResult) {
    throw new Error(`Failed to prioritize incident ${incident.id}`);
  }
  incident = recalcResult.incident;
  const priorityAnalysis = recalcResult.analysis;

  // 5. Resource Allocation Engine (recommends units only; human approval still required before dispatch)
  const availableResources = await getResources({ status: 'AVAILABLE' });
  const candidates: CandidateRouteData[] = [];

  for (const resource of availableResources) {
    if (!resource.isActive || resource.status !== 'AVAILABLE') continue;
    try {
      const route = await getRoute(
        { latitude: resource.latitude, longitude: resource.longitude },
        { latitude: incident.latitude, longitude: incident.longitude }
      );
      candidates.push({ resource, route });
    } catch (err) {
      console.warn(`[Workflow] Route calculation failed for ${resource.resourceCode}:`, err);
    }
  }

  const allocationAnalysis = allocationEngine.analyzeAllocation(incident, candidates);

  const envAllocationNote = environmentalContext.relevantAlerts.length > 0
    ? ` Note: ${environmentalContext.relevantAlerts.length} active IMD weather warning(s) may affect response ETA and road conditions.`
    : '';

  const awaitingRes = await advanceIncidentToStatus(
    incident.id,
    'AWAITING_DISPATCH',
    `Allocation Engine analyzed ${candidates.length} units. Recommendations ready for operator approval.${envAllocationNote}`
  );
  if (awaitingRes.success && awaitingRes.incident) {
    incident = awaitingRes.incident;
  }

  return {
    incident,
    priorityAnalysis,
    allocationAnalysis,
    environmentalContext,
  };
}

/**
 * Executes operator dispatch confirmation (mandatory human-in-the-loop approval).
 */
export async function executeOperatorDispatchConfirmation(
  incidentId: string,
  selectedResourceIds: string[]
) {
  return await confirmDispatch(incidentId, selectedResourceIds, { operatorApproved: true });
}
