import { EmergencyType, InjuryLevel, PriorityLevel } from '../types/incident';

export interface PriorityWeights {
  severity: number;      // 0.30 (30%)
  peopleAffected: number;// 0.20 (20%)
  injuryLevel: number;   // 0.20 (20%)
  emergencyType: number; // 0.15 (15%)
  locationRisk: number;  // 0.10 (10%)
  waitingTime: number;   // 0.05 (5%)
}

export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  severity: 0.30,
  peopleAffected: 0.20,
  injuryLevel: 0.20,
  emergencyType: 0.15,
  locationRisk: 0.10,
  waitingTime: 0.05,
};

export const INJURY_LEVEL_SCORES: Record<InjuryLevel, number> = {
  NONE: 0,
  MINOR: 25,
  MODERATE: 50,
  SEVERE: 75,
  CRITICAL: 100,
  UNKNOWN: 40,
};

export const EMERGENCY_TYPE_SCORES: Record<EmergencyType, number> = {
  BUILDING_COLLAPSE: 100,
  INDUSTRIAL_ACCIDENT: 95,
  NATURAL_DISASTER: 95,
  FIRE: 90,
  MEDICAL: 90,
  ROAD_ACCIDENT: 85,
  FLOOD: 85,
  OTHER: 50,
};

export type LocationRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const LOCATION_RISK_SCORES: Record<LocationRiskLevel, number> = {
  LOW: 25,
  MEDIUM: 50,
  HIGH: 80,
  CRITICAL: 100,
};

export const DEFAULT_LOCATION_RISK_SCORE = 50; // Neutral fallback

/**
 * Maps count of affected people to a normalized 0-100 score.
 */
export function getPeopleAffectedScore(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 20;
  if (count === 2) return 35;
  if (count === 3) return 50;
  if (count === 4) return 60;
  if (count === 5) return 70;
  if (count <= 10) return 80;
  if (count <= 20) return 90;
  return 100;
}

/**
 * Maps elapsed waiting time in minutes to a normalized 0-100 score.
 */
export function getWaitingTimeScore(waitingMinutes: number): number {
  if (waitingMinutes <= 2) return 10;
  if (waitingMinutes <= 5) return 30;
  if (waitingMinutes <= 10) return 50;
  if (waitingMinutes <= 20) return 75;
  if (waitingMinutes <= 30) return 90;
  return 100;
}

/**
 * Prototype priority classification thresholds.
 */
export function getPriorityClassification(score: number): PriorityLevel {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

export function getUrgencyRecommendation(level: PriorityLevel): string {
  switch (level) {
    case 'CRITICAL':
      return 'Immediate operator attention recommended';
    case 'HIGH':
      return 'Prompt response recommended';
    case 'MEDIUM':
      return 'Response should be planned';
    case 'LOW':
    default:
      return 'Routine monitoring';
  }
}
