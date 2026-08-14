import { EmergencyType, InjuryLevel } from '../types/incident';

export interface GeneratedIncidentPayload {
  emergencyType: EmergencyType;
  title: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  peopleAffected: number;
  injuryLevel: InjuryLevel;
}

// Bengaluru Bounding Box Coordinates
const BENGALURU_LOCATIONS = [
  { address: 'MG Road Junction, Central District', lat: 12.9716, lng: 77.5946 },
  { address: 'JP Nagar 2nd Phase Main Road', lat: 12.9077, lng: 77.5857 },
  { address: '80 Feet Road, Koramangala 4th Block', lat: 12.9352, lng: 77.6245 },
  { address: 'Indiranagar 100 Feet Road', lat: 12.9784, lng: 77.6408 },
  { address: 'Whitefield Main Road near ITPL', lat: 12.9854, lng: 77.7271 },
  { address: 'Electronic City Phase 1', lat: 12.8452, lng: 77.6602 },
  { address: 'Hebbal Flyover Junction', lat: 13.0358, lng: 77.5970 },
  { address: 'Yeshwanthpur Industrial Area', lat: 13.0285, lng: 77.5458 },
];

export function generateSimulationIncident(
  type: EmergencyType,
  overrideLocationIndex?: number,
  overrideCasualties?: number
): GeneratedIncidentPayload {
  const locIndex = overrideLocationIndex !== undefined ? overrideLocationIndex % BENGALURU_LOCATIONS.length : Math.floor(Math.random() * BENGALURU_LOCATIONS.length);
  const location = BENGALURU_LOCATIONS[locIndex];

  let title = '';
  let description = '';
  let casualties = overrideCasualties || 4;
  let injury: InjuryLevel = 'MODERATE';

  switch (type) {
    case 'ROAD_ACCIDENT':
      title = `Vehicle Collision at ${location.address.split(',')[0]}`;
      description = `Multi-vehicle crash involving commercial transport and private vehicles. Road obstructed.`;
      injury = casualties > 5 ? 'SEVERE' : 'MODERATE';
      break;

    case 'FIRE':
      title = `Structural Fire at ${location.address.split(',')[0]}`;
      description = `Commercial building blaze with heavy smoke plume. Occupants trapped on upper floors.`;
      casualties = overrideCasualties || 8;
      injury = 'SEVERE';
      break;

    case 'MEDICAL':
      title = `Cardiac & Respiratory Distress at ${location.address.split(',')[0]}`;
      description = `Individual collapsed with acute cardiac distress. Immediate ALS resuscitation required.`;
      casualties = 1;
      injury = 'SEVERE';
      break;

    case 'FLOOD':
      title = `Urban Flash Flood Inundation at ${location.address.split(',')[0]}`;
      description = `Severe storm drain overflow causing water logging and submerged vehicles.`;
      casualties = overrideCasualties || 12;
      injury = 'MINOR';
      break;

    case 'BUILDING_COLLAPSE':
      title = `Scaffolding Collapse at Construction Site, ${location.address.split(',')[0]}`;
      description = `Structural collapse trapping workers beneath debris. Immediate heavy rescue & triage needed.`;
      casualties = overrideCasualties || 15;
      injury = 'SEVERE';
      break;

    case 'INDUSTRIAL_ACCIDENT':
      title = `Chemical Leak & Explosion at ${location.address.split(',')[0]}`;
      description = `Industrial container rupture with toxic fume release and localized fire.`;
      casualties = overrideCasualties || 10;
      injury = 'SEVERE';
      break;

    default:
      title = `Emergency Incident at ${location.address.split(',')[0]}`;
      description = `Emergency reported requiring immediate dispatch.`;
      injury = 'MODERATE';
  }

  return {
    emergencyType: type,
    title,
    description,
    address: location.address,
    latitude: location.lat,
    longitude: location.lng,
    peopleAffected: casualties,
    injuryLevel: injury,
  };
}
