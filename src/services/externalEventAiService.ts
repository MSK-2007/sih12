import { supabase, isSupabaseConfigured } from './supabase';
import { ExternalEvent, ExternalEventAiAnalysis } from '../types/externalEvents';
import { DEFAULT_GEMINI_MODEL } from '../config/ai';

/**
 * Triggers server-side Gemini AI analysis for a real external event.
 */
export async function analyzeExternalEvent(
  event: ExternalEvent
): Promise<{ success: boolean; analysis?: ExternalEventAiAnalysis; error?: string }> {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      analysis: {
        externalEventId: event.id,
        riskLevel: event.magnitude >= 6.0 ? 'HIGH' : event.magnitude >= 5.0 ? 'MODERATE' : 'LOW',
        situationSummary: `Simulated local offline analysis for ${event.title}`,
        potentialImpacts: ['Structural tremor inspection', 'Traffic delay monitoring'],
        recommendedResourceTypes: ['AMBULANCE'],
        affectedAreaAssessment: `Coordinates (${event.latitude.toFixed(2)}, ${event.longitude.toFixed(2)})`,
        recommendedOperatorAction: event.magnitude >= 5.0 ? 'CREATE_INCIDENT' : 'MONITOR',
        confidence: 85,
        reasoningSummary: 'Offline rule-based fallback decision support.',
        modelName: 'local-offline-fallback',
        analysisStatus: 'COMPLETED',
      },
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('analyze-external-event', {
      body: { external_event_id: event.id, event },
    });

    if (error) {
      console.warn('[ExternalEventAiService] Edge Function error, trying DB query fallback:', error);
    }

    if (data?.success && data.analysis) {
      const a = data.analysis;
      return {
        success: true,
        analysis: {
          id: a.id,
          externalEventId: a.external_event_id,
          riskLevel: a.risk_level || 'MODERATE',
          situationSummary: a.situation_summary || '',
          potentialImpacts: Array.isArray(a.potential_impacts) ? a.potential_impacts : [],
          recommendedResourceTypes: Array.isArray(a.recommended_resource_types) ? a.recommended_resource_types : [],
          affectedAreaAssessment: a.affected_area_assessment || '',
          recommendedOperatorAction: a.recommended_operator_action || 'REVIEW',
          confidence: Number(a.confidence || 85),
          reasoningSummary: a.reasoning_summary || '',
          modelName: a.model_name || data.provider || DEFAULT_GEMINI_MODEL,
          analysisStatus: a.analysis_status || 'COMPLETED',
        },
      };
    }

    // Database fallback lookup
    const { data: dbRow } = await supabase
      .from('incident_ai_analysis')
      .select('*')
      .eq('external_event_id', event.id)
      .single();

    if (dbRow) {
      return {
        success: true,
        analysis: {
          id: dbRow.id,
          externalEventId: dbRow.external_event_id,
          riskLevel: dbRow.risk_level || 'MODERATE',
          situationSummary: dbRow.situation_summary || '',
          potentialImpacts: Array.isArray(dbRow.potential_impacts) ? dbRow.potential_impacts : [],
          recommendedResourceTypes: Array.isArray(dbRow.recommended_resource_types) ? dbRow.recommended_resource_types : [],
          affectedAreaAssessment: dbRow.affected_area_assessment || '',
          recommendedOperatorAction: dbRow.recommended_operator_action || 'REVIEW',
          confidence: Number(dbRow.confidence || 85),
          reasoningSummary: dbRow.reasoning_summary || '',
          modelName: dbRow.model_name || DEFAULT_GEMINI_MODEL,
          analysisStatus: dbRow.analysis_status || 'COMPLETED',
        },
      };
    }
  } catch (err: any) {
    console.error('[ExternalEventAiService] Error invoking AI analysis:', err);
  }

  return {
    success: false,
    error: 'AI analysis is temporarily unavailable. Manual review is still available.',
  };
}

/**
 * Subscribes to Supabase Realtime changes on incident_ai_analysis table for external events.
 */
export function subscribeToAiAnalysisRealtime(
  externalEventId: string,
  onUpdate: (analysis: ExternalEventAiAnalysis) => void
) {
  if (!isSupabaseConfigured || !externalEventId) return () => {};

  const channel = supabase
    .channel(`public:incident_ai_analysis:${externalEventId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'incident_ai_analysis',
        filter: `external_event_id=eq.${externalEventId}`,
      },
      (payload) => {
        const row = payload.new as any;
        if (row) {
          onUpdate({
            id: row.id,
            externalEventId: row.external_event_id,
            riskLevel: row.risk_level || 'MODERATE',
            situationSummary: row.situation_summary || '',
            potentialImpacts: Array.isArray(row.potential_impacts) ? row.potential_impacts : [],
            recommendedResourceTypes: Array.isArray(row.recommended_resource_types) ? row.recommended_resource_types : [],
            affectedAreaAssessment: row.affected_area_assessment || '',
            recommendedOperatorAction: row.recommended_operator_action || 'REVIEW',
            confidence: Number(row.confidence || 85),
            reasoningSummary: row.reasoning_summary || '',
            modelName: row.model_name || DEFAULT_GEMINI_MODEL,
            analysisStatus: row.analysis_status || 'COMPLETED',
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
