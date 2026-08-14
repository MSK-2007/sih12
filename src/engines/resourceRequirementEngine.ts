import { EmergencyType, InjuryLevel, PriorityClassification } from '../types/incident';
import { ResourceType } from '../types/resource';

export interface ResourceRequirements {
  primaryType: ResourceType;
  requiredTypes: ResourceType[];
  minimumUnits: Record<ResourceType, number>;
  recommendedCapabilities: string[];
  rationale: string;
}

/**
 * Determines required resource types, quantities, and capabilities for an incident.
 */
export function determineRequiredResources(
  emergencyType: EmergencyType,
  severity: PriorityClassification,
  injuryLevel: InjuryLevel,
  peopleAffected: number
): ResourceRequirements {
  const requiredTypesSet = new Set<ResourceType>();
  const minimumUnits: Record<ResourceType, number> = {
    AMBULANCE: 0,
    FIRE_UNIT: 0,
    POLICE_UNIT: 0,
    RESCUE_TEAM: 0,
  };
  const recommendedCapabilities: string[] = [];
  let primaryType: ResourceType = 'AMBULANCE';

  switch (emergencyType) {
    case 'ROAD_ACCIDENT':
      primaryType = 'AMBULANCE';
      requiredTypesSet.add('AMBULANCE');
      minimumUnits.AMBULANCE = peopleAffected > 3 ? 2 : 1;
      
      requiredTypesSet.add('POLICE_UNIT');
      minimumUnits.POLICE_UNIT = 1;

      if (injuryLevel === 'SEVERE' || severity === 'CRITICAL') {
        recommendedCapabilities.push('ADVANCED_LIFE_SUPPORT', 'EXTRICATION');
      }
      if (peopleAffected > 5 || severity === 'CRITICAL') {
        requiredTypesSet.add('RESCUE_TEAM');
        minimumUnits.RESCUE_TEAM = 1;
      }
      break;

    case 'FIRE':
      primaryType = 'FIRE_UNIT';
      requiredTypesSet.add('FIRE_UNIT');
      minimumUnits.FIRE_UNIT = severity === 'CRITICAL' ? 2 : 1;
      recommendedCapabilities.push('HAZMAT', 'HIGH_REACH_LADDER');

      if (injuryLevel !== 'NONE') {
        requiredTypesSet.add('AMBULANCE');
        minimumUnits.AMBULANCE = 1;
        recommendedCapabilities.push('BURN_TRAUMA');
      }

      if (severity === 'HIGH' || severity === 'CRITICAL') {
        requiredTypesSet.add('POLICE_UNIT');
        minimumUnits.POLICE_UNIT = 1;
      }
      break;

    case 'BUILDING_COLLAPSE':
      primaryType = 'RESCUE_TEAM';
      requiredTypesSet.add('RESCUE_TEAM');
      minimumUnits.RESCUE_TEAM = 2;
      recommendedCapabilities.push('STRUCTURAL_SEARCH', 'HEAVY_LIFTING', 'K9_SEARCH');

      requiredTypesSet.add('AMBULANCE');
      minimumUnits.AMBULANCE = peopleAffected > 2 ? 2 : 1;
      recommendedCapabilities.push('CRUSH_INJURY_MANAGEMENT');

      requiredTypesSet.add('FIRE_UNIT');
      minimumUnits.FIRE_UNIT = 1;
      break;

    case 'FLOOD':
      primaryType = 'RESCUE_TEAM';
      requiredTypesSet.add('RESCUE_TEAM');
      minimumUnits.RESCUE_TEAM = 2;
      recommendedCapabilities.push('WATER_RESCUE', 'AMPHIBIOUS');

      if (injuryLevel !== 'NONE') {
        requiredTypesSet.add('AMBULANCE');
        minimumUnits.AMBULANCE = 1;
      }
      break;

    case 'INDUSTRIAL_ACCIDENT':
      primaryType = 'FIRE_UNIT';
      requiredTypesSet.add('FIRE_UNIT');
      minimumUnits.FIRE_UNIT = 1;
      recommendedCapabilities.push('CHEMICAL_HAZMAT', 'CONTAINMENT');

      requiredTypesSet.add('AMBULANCE');
      minimumUnits.AMBULANCE = 1;
      recommendedCapabilities.push('TOXICOLOGY_ALS');

      if (peopleAffected > 4) {
        requiredTypesSet.add('RESCUE_TEAM');
        minimumUnits.RESCUE_TEAM = 1;
      }
      break;

    case 'MEDICAL':
      primaryType = 'AMBULANCE';
      requiredTypesSet.add('AMBULANCE');
      minimumUnits.AMBULANCE = 1;

      if (injuryLevel === 'SEVERE') {
        recommendedCapabilities.push('ADVANCED_LIFE_SUPPORT', 'CARDIAC_MONITOR');
      } else {
        recommendedCapabilities.push('BASIC_LIFE_SUPPORT');
      }
      break;

    case 'NATURAL_DISASTER':
    case 'OTHER':
    default:
      primaryType = 'AMBULANCE';
      requiredTypesSet.add('AMBULANCE');
      minimumUnits.AMBULANCE = 1;
      requiredTypesSet.add('POLICE_UNIT');
      minimumUnits.POLICE_UNIT = 1;
      if (peopleAffected > 3) {
        requiredTypesSet.add('RESCUE_TEAM');
        minimumUnits.RESCUE_TEAM = 1;
      }
      break;
  }

  const requiredTypes = Array.from(requiredTypesSet);
  const rationale = `Requirement generated for ${emergencyType.replace('_', ' ')} (${severity} severity, ${injuryLevel} injury level, ${peopleAffected} affected). Primary response unit: ${primaryType}.`;

  return {
    primaryType,
    requiredTypes,
    minimumUnits,
    recommendedCapabilities,
    rationale,
  };
}
