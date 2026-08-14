import { EmergencyType, PriorityLevel } from '../types/incident';
import { ResourceType } from '../types/resource';

export interface RequiredResourceItem {
  type: ResourceType;
  quantity: number;
  reason: string;
}

/**
 * Determines required resource types and quantities for an incident based on type, priority, and casualties.
 */
export function determineRequiredResourceUnits(
  emergencyType: EmergencyType,
  priorityLevel: PriorityLevel,
  peopleAffected: number
): RequiredResourceItem[] {
  const result: RequiredResourceItem[] = [];

  switch (emergencyType) {
    case 'ROAD_ACCIDENT': {
      const ambQty = peopleAffected > 5 ? 2 : 1;
      result.push({ type: 'AMBULANCE', quantity: ambQty, reason: 'Medical evacuation and trauma care' });
      result.push({ type: 'POLICE_UNIT', quantity: 1, reason: 'Traffic management and perimeter security' });
      if (peopleAffected > 5 || priorityLevel === 'CRITICAL') {
        result.push({ type: 'RESCUE_TEAM', quantity: 1, reason: 'Heavy extrication and collapse search' });
      }
      break;
    }

    case 'FIRE': {
      const fireQty = priorityLevel === 'CRITICAL' ? 2 : 1;
      result.push({ type: 'FIRE_UNIT', quantity: fireQty, reason: 'Fire suppression and hazmat containment' });
      result.push({ type: 'AMBULANCE', quantity: 1, reason: 'Smoke inhalation and burn medical response' });
      if (priorityLevel === 'HIGH' || priorityLevel === 'CRITICAL') {
        result.push({ type: 'POLICE_UNIT', quantity: 1, reason: 'Evacuation crowd control and perimeter perimeter' });
      }
      break;
    }

    case 'BUILDING_COLLAPSE': {
      result.push({ type: 'RESCUE_TEAM', quantity: 2, reason: 'Urban search, heavy lifting, and K9 detection' });
      result.push({ type: 'AMBULANCE', quantity: peopleAffected > 3 ? 2 : 1, reason: 'Crush injury ALS treatment' });
      result.push({ type: 'FIRE_UNIT', quantity: 1, reason: 'Structural stability and fire safety line' });
      result.push({ type: 'POLICE_UNIT', quantity: 1, reason: 'Disaster zone perimeter management' });
      break;
    }

    case 'FLOOD': {
      result.push({ type: 'RESCUE_TEAM', quantity: 2, reason: 'Water rescue and amphibious evacuation' });
      result.push({ type: 'AMBULANCE', quantity: 1, reason: 'Drowning/hypothermia emergency care' });
      result.push({ type: 'FIRE_UNIT', quantity: 1, reason: 'Pumping and flood containment' });
      break;
    }

    case 'INDUSTRIAL_ACCIDENT': {
      result.push({ type: 'FIRE_UNIT', quantity: 1, reason: 'Chemical hazmat suppression' });
      result.push({ type: 'AMBULANCE', quantity: 1, reason: 'Toxicology ALS care' });
      if (peopleAffected > 4) {
        result.push({ type: 'RESCUE_TEAM', quantity: 1, reason: 'Confined space search & rescue' });
      }
      break;
    }

    case 'MEDICAL': {
      const ambQty = peopleAffected > 2 ? 2 : 1;
      result.push({ type: 'AMBULANCE', quantity: ambQty, reason: 'Primary ALS/BLS medical response' });
      break;
    }

    case 'NATURAL_DISASTER': {
      result.push({ type: 'RESCUE_TEAM', quantity: 2, reason: 'Mass casualty search & rescue' });
      result.push({ type: 'AMBULANCE', quantity: 2, reason: 'Trauma field triage' });
      result.push({ type: 'FIRE_UNIT', quantity: 1, reason: 'Disaster hazard suppression' });
      result.push({ type: 'POLICE_UNIT', quantity: 1, reason: 'Public order and evacuation' });
      break;
    }

    case 'OTHER':
    default: {
      result.push({ type: 'AMBULANCE', quantity: 1, reason: 'General emergency medical response' });
      result.push({ type: 'POLICE_UNIT', quantity: 1, reason: 'Incident verification' });
      break;
    }
  }

  return result;
}
