import { EmergencyType, InjuryLevel, PriorityLevel } from '../types/incident';
import {
  DEFAULT_PRIORITY_WEIGHTS,
  PriorityWeights,
  INJURY_LEVEL_SCORES,
  EMERGENCY_TYPE_SCORES,
  LOCATION_RISK_SCORES,
  DEFAULT_LOCATION_RISK_SCORE,
  LocationRiskLevel,
  getPeopleAffectedScore,
  getWaitingTimeScore,
  getPriorityClassification,
  getUrgencyRecommendation,
} from './priorityConfig';
import { generatePriorityExplanation } from './priorityExplanation';

export interface PriorityFactorContribution {
  name: string;
  rawValue: string | number;
  normalizedScore: number; // 0-100
  weight: number;          // e.g. 0.30
  contribution: number;    // normalizedScore * weight
  description: string;
}

export interface PriorityAnalysis {
  score: number;                   // 0-100
  level: PriorityLevel;
  factors: PriorityFactorContribution[];
  explanation: string;
  urgency: string;
  calculatedAt: string;
  engineVersion: string;
}

export interface PriorityEngineInput {
  emergency_type?: EmergencyType | string;
  emergencyType?: EmergencyType | string;
  people_affected?: number;
  peopleAffected?: number;
  injury_level?: InjuryLevel | string;
  injuryLevel?: InjuryLevel | string;
  severity?: number | PriorityLevel | string;
  location_risk?: LocationRiskLevel | string;
  locationRisk?: LocationRiskLevel | string;
  reported_at?: string;
  reportedAt?: string;
  currentTime?: string;
}

export interface PriorityEngine {
  calculatePriority(input: PriorityEngineInput, weights?: PriorityWeights): PriorityAnalysis;
}

/**
 * Baseline Explainable Weighted Intelligence Engine for ResQAI.
 * Fully deterministic, explainable, and configurable decision-support model.
 */
export class RuleBasedPriorityEngine implements PriorityEngine {
  public readonly version = '1.0.0-BASELINE_WEIGHTED';

  public calculatePriority(
    input: PriorityEngineInput,
    weights: PriorityWeights = DEFAULT_PRIORITY_WEIGHTS
  ): PriorityAnalysis {
    // 1. Extract and sanitize inputs with safe fallbacks
    const emergencyType = (input.emergency_type || input.emergencyType || 'OTHER') as EmergencyType;
    const peopleAffected = Math.max(0, Number(input.people_affected ?? input.peopleAffected ?? 0));
    const injuryLevel = (input.injury_level || input.injuryLevel || 'UNKNOWN') as InjuryLevel;
    const locationRisk = (input.location_risk || input.locationRisk || 'MEDIUM') as LocationRiskLevel;
    const reportedAt = input.reported_at || input.reportedAt;
    const now = input.currentTime ? new Date(input.currentTime).getTime() : Date.now();

    // 2. Factor 1: Severity Score (0-100)
    let rawSeverity: number;
    if (typeof input.severity === 'number') {
      rawSeverity = Math.min(100, Math.max(0, input.severity));
    } else if (typeof input.severity === 'string') {
      const sMap: Record<string, number> = { LOW: 25, MEDIUM: 50, HIGH: 75, CRITICAL: 100 };
      rawSeverity = sMap[input.severity.toUpperCase()] ?? 50;
    } else {
      // Prototype heuristic fallback if severity is missing
      const baseType = EMERGENCY_TYPE_SCORES[emergencyType] || 50;
      const baseInj = INJURY_LEVEL_SCORES[injuryLevel] || 40;
      rawSeverity = Math.min(100, Math.round(baseType * 0.6 + baseInj * 0.4));
    }

    const severityScore = rawSeverity;
    const severityContrib = Math.round(severityScore * weights.severity * 100) / 100;

    // 3. Factor 2: People Affected Score (0-100)
    const peopleScore = getPeopleAffectedScore(peopleAffected);
    const peopleContrib = Math.round(peopleScore * weights.peopleAffected * 100) / 100;

    // 4. Factor 3: Injury Level Score (0-100)
    const injuryScore = INJURY_LEVEL_SCORES[injuryLevel] ?? INJURY_LEVEL_SCORES.UNKNOWN;
    const injuryContrib = Math.round(injuryScore * weights.injuryLevel * 100) / 100;

    // 5. Factor 4: Emergency Type Score (0-100)
    const typeScore = EMERGENCY_TYPE_SCORES[emergencyType] ?? EMERGENCY_TYPE_SCORES.OTHER;
    const typeContrib = Math.round(typeScore * weights.emergencyType * 100) / 100;

    // 6. Factor 5: Location Risk Score (0-100)
    const riskScore = LOCATION_RISK_SCORES[locationRisk] ?? DEFAULT_LOCATION_RISK_SCORE;
    const riskContrib = Math.round(riskScore * weights.locationRisk * 100) / 100;

    // 7. Factor 6: Waiting Time Score (0-100)
    let waitingMinutes = 0;
    if (reportedAt) {
      const repTime = new Date(reportedAt).getTime();
      if (!isNaN(repTime) && repTime <= now) {
        waitingMinutes = Math.max(0, (now - repTime) / 60000);
      }
    }
    const waitingScore = getWaitingTimeScore(waitingMinutes);
    const waitingContrib = Math.round(waitingScore * weights.waitingTime * 100) / 100;

    // 8. Total Weighted Priority Score (clamped 0 to 100)
    const rawTotal =
      severityContrib +
      peopleContrib +
      injuryContrib +
      typeContrib +
      riskContrib +
      waitingContrib;

    const finalScore = Math.min(100, Math.max(0, Math.round(rawTotal)));
    const level = getPriorityClassification(finalScore);
    const urgency = getUrgencyRecommendation(level);

    const factors: PriorityFactorContribution[] = [
      {
        name: 'Severity',
        rawValue: rawSeverity,
        normalizedScore: severityScore,
        weight: weights.severity,
        contribution: severityContrib,
        description: `Severity rated ${severityScore}/100`,
      },
      {
        name: 'People Affected',
        rawValue: peopleAffected,
        normalizedScore: peopleScore,
        weight: weights.peopleAffected,
        contribution: peopleContrib,
        description: `${peopleAffected} casualty/casualties (${peopleScore}/100 impact)`,
      },
      {
        name: 'Injury Level',
        rawValue: injuryLevel,
        normalizedScore: injuryScore,
        weight: weights.injuryLevel,
        contribution: injuryContrib,
        description: `Injury severity ${injuryLevel} (${injuryScore}/100)`,
      },
      {
        name: 'Emergency Type',
        rawValue: emergencyType,
        normalizedScore: typeScore,
        weight: weights.emergencyType,
        contribution: typeContrib,
        description: `Category ${emergencyType.replace(/_/g, ' ')} (${typeScore}/100 urgency)`,
      },
      {
        name: 'Location Risk',
        rawValue: locationRisk,
        normalizedScore: riskScore,
        weight: weights.locationRisk,
        contribution: riskContrib,
        description: `Zone risk rating ${locationRisk} (${riskScore}/100)`,
      },
      {
        name: 'Waiting Time',
        rawValue: `${Math.round(waitingMinutes)} min`,
        normalizedScore: waitingScore,
        weight: weights.waitingTime,
        contribution: waitingContrib,
        description: `${Math.round(waitingMinutes)} min delay (${waitingScore}/100 time factor)`,
      },
    ];

    const explanation = generatePriorityExplanation(factors, peopleAffected, waitingMinutes);

    return {
      score: finalScore,
      level,
      factors,
      explanation,
      urgency,
      calculatedAt: new Date().toISOString(),
      engineVersion: this.version,
    };
  }
}

// Singleton instance export
export const priorityEngine = new RuleBasedPriorityEngine();
