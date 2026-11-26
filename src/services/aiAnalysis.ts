import { supabase, isSupabaseConfigured } from './supabase';
import { Incident } from '../types/incident';
import { determineRequiredResources } from '../engines/resourceRequirementEngine';
import { priorityEngine } from '../engines/priorityEngine';
import { DEFAULT_GEMINI_MODEL } from '../config/ai';

export interface IncidentAiAnalysis {
  id?: string;
  incidentId: string;
  incidentType: string;
  severity: string;
  urgency: string;
  peopleAffected: number;
  requiredResources: string[];
  riskFactors: string[];
  reasons: string[];
  modelName: string;
  createdAt?: string;
}

/**
 * Executes server-side Gemini AI assessment via Supabase Edge Function with automatic rule-based fallback.
 */
export async function analyzeIncidentWithAI(incident: Incident): Promise<IncidentAiAnalysis> {
  let analysis: IncidentAiAnalysis | null = null;

  // 1. Try Supabase Edge Function call to Gemini AI
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-incident', {
        body: { incident },
      });

      if (!error && data && !data.fallback) {
        analysis = {
          incidentId: incident.id,
          incidentType: data.incident_type || incident.emergencyType,
          severity: data.severity || incident.priorityLevel,
          urgency: data.urgency || `Priority Score: ${incident.priorityScore}/100`,
          peopleAffected: Number(data.people_affected || incident.peopleAffected),
          requiredResources: Array.isArray(data.required_resources) ? data.required_resources : ['AMBULANCE'],
          riskFactors: Array.isArray(data.risk_factors) ? data.risk_factors : ['Trauma severity', 'Access bottleneck'],
          reasons: Array.isArray(data.reasons) ? data.reasons : ['Gemini multi-factor situational analysis'],
          modelName: data.model_name || DEFAULT_GEMINI_MODEL,
        };
      }
    } catch (err) {
      console.warn('[AI Analysis] Edge Function call failed. Switching to rule-based fallback.', err);
    }
  }

  // 2. Rule-based Fallback Analysis if Gemini fails or Supabase not configured
  if (!analysis) {
    const reqs = determineRequiredResources(
      incident.emergencyType,
      incident.priorityLevel || incident.severity || 'MEDIUM',
      incident.injuryLevel || 'MODERATE',
      incident.peopleAffected || 1
    );

    const prio = priorityEngine.calculatePriority({
      emergency_type: incident.emergencyType,
      people_affected: incident.peopleAffected,
      injury_level: incident.injuryLevel,
      reported_at: incident.reportedAt,
      environmentalRiskScore: incident.environmentalRiskScore ?? 0,
    });

    analysis = {
      incidentId: incident.id,
      incidentType: incident.emergencyType,
      severity: prio.level,
      urgency: prio.urgency,
      peopleAffected: incident.peopleAffected,
      requiredResources: reqs.requiredTypes,
      riskFactors: [
        `High risk score (${prio.score}/100)`,
        `${incident.injuryLevel} injury escalation risk`,
        reqs.rationale,
      ],
      reasons: [
        `Primary unit specified: ${reqs.primaryType}`,
        `Recommended capabilities: ${reqs.recommendedCapabilities.join(', ')}`,
      ],
      modelName: 'resqai-rule-engine-fallback',
    };
  }

  // 3. Persist AI analysis result to database
  if (isSupabaseConfigured && analysis) {
    try {
      const { data, error } = await supabase
        .from('incident_ai_analysis')
        .insert({
          incident_id: analysis.incidentId,
          incident_type: analysis.incidentType,
          severity: analysis.severity,
          urgency: analysis.urgency,
          people_affected: analysis.peopleAffected,
          required_resources: analysis.requiredResources,
          risk_factors: analysis.riskFactors,
          reasons: analysis.reasons,
          model_name: analysis.modelName,
        })
        .select()
        .single();

      if (!error && data) {
        analysis.id = data.id as string;
        analysis.createdAt = data.created_at as string;
      }
    } catch (dbErr) {
      console.warn('[AI Analysis] Database persistence error:', dbErr);
    }
  }

  return analysis;
}

/**
 * Fetches existing AI analysis records for an incident.
 */
export async function getIncidentAiAnalysis(incidentId: string): Promise<IncidentAiAnalysis | null> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('incident_ai_analysis')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      return {
        id: data.id as string,
        incidentId: data.incident_id as string,
        incidentType: data.incident_type as string,
        severity: data.severity as string,
        urgency: data.urgency as string,
        peopleAffected: Number(data.people_affected),
        requiredResources: (data.required_resources as string[]) || [],
        riskFactors: (data.risk_factors as string[]) || [],
        reasons: (data.reasons as string[]) || [],
        modelName: data.model_name as string,
        createdAt: data.created_at as string,
      };
    }
  }

  return null;
}
