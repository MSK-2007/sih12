import { EmergencyType, PriorityLevel } from '../types/incident';

export interface AllocationWeights {
  capability: number;            // 0.30 (30%)
  eta: number;                   // 0.25 (25%)
  distance: number;              // 0.15 (15%)
  availability: number;          // 0.15 (15%)
  workload: number;              // 0.10 (10%)
  priorityCompatibility: number; // 0.05 (5%)
}

export const DEFAULT_ALLOCATION_WEIGHTS: AllocationWeights = {
  capability: 0.30,
  eta: 0.25,
  distance: 0.15,
  availability: 0.15,
  workload: 0.10,
  priorityCompatibility: 0.05,
};

export type CapabilityMatchLevel = 'EXACT_MATCH' | 'GOOD_MATCH' | 'PARTIAL_MATCH' | 'NO_MATCH';

export const CAPABILITY_MATCH_SCORES: Record<CapabilityMatchLevel, number> = {
  EXACT_MATCH: 100,
  GOOD_MATCH: 85,
  PARTIAL_MATCH: 60,
  NO_MATCH: 0,
};

export const PRIORITY_COMPATIBILITY_SCORES: Record<PriorityLevel, number> = {
  CRITICAL: 100,
  HIGH: 85,
  MEDIUM: 65,
  LOW: 40,
};

/**
 * Maps ETA in minutes to normalized 0-100 score.
 */
export function getEtaScore(etaMinutes: number): number {
  if (etaMinutes <= 3) return 100;
  if (etaMinutes <= 5) return 90;
  if (etaMinutes <= 8) return 75;
  if (etaMinutes <= 12) return 60;
  if (etaMinutes <= 20) return 40;
  return 20;
}

/**
 * Maps driving distance in kilometers to normalized 0-100 score.
 */
export function getDistanceScore(distanceKm: number): number {
  if (distanceKm <= 2) return 100;
  if (distanceKm <= 5) return 90;
  if (distanceKm <= 10) return 70;
  if (distanceKm <= 20) return 50;
  return 20;
}

/**
 * Preferred capability tags per incident emergency type.
 */
export const INCIDENT_PREFERRED_CAPABILITIES: Record<EmergencyType, string[]> = {
  ROAD_ACCIDENT: ['ADVANCED_LIFE_SUPPORT', 'EXTRICATION', 'CRUSH_INJURY_MANAGEMENT', 'TRAFFIC_CONTROL'],
  FIRE: ['HIGH_REACH_LADDER', 'HAZMAT', 'WATER_CANNON', 'BURN_TRAUMA', 'FOAM_SUPPRESSION'],
  MEDICAL: ['ADVANCED_LIFE_SUPPORT', 'CARDIAC_MONITOR', 'VENTILATOR', 'BASIC_LIFE_SUPPORT'],
  FLOOD: ['WATER_RESCUE', 'AMPHIBIOUS', 'DIVING_EQUIPMENT'],
  BUILDING_COLLAPSE: ['STRUCTURAL_SEARCH', 'HEAVY_LIFTING', 'K9_SEARCH', 'EXTRICATION'],
  NATURAL_DISASTER: ['STRUCTURAL_SEARCH', 'AMPHIBIOUS', 'WATER_RESCUE', 'BASIC_LIFE_SUPPORT'],
  INDUSTRIAL_ACCIDENT: ['HAZMAT', 'CHEMICAL_HAZMAT', 'TOXICOLOGY_ALS', 'CONTAINMENT'],
  OTHER: ['BASIC_LIFE_SUPPORT', 'FAST_RESPONSE'],
};
