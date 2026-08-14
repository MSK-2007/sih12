import L from 'leaflet';
import { PriorityLevel } from '../../types/incident';
import { ResourceType, ResourceStatus } from '../../types/resource';

/**
 * Ensures Leaflet default icon paths are safe in Vite.
 */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * Creates custom SVG Leaflet DivIcon for Incidents.
 */
export function createIncidentDivIcon(priority: PriorityLevel, isSelected = false): L.DivIcon {
  let bgColor = '#eab308'; // MEDIUM yellow
  let ringColor = 'rgba(234, 179, 8, 0.4)';
  let pulseClass = '';

  if (priority === 'CRITICAL') {
    bgColor = '#ef4444'; // Red
    ringColor = 'rgba(239, 68, 68, 0.5)';
    pulseClass = 'animate-ping';
  } else if (priority === 'HIGH') {
    bgColor = '#f97316'; // Orange
    ringColor = 'rgba(249, 115, 22, 0.4)';
  } else if (priority === 'LOW') {
    bgColor = '#10b981'; // Green
    ringColor = 'rgba(16, 185, 129, 0.4)';
  }

  const border = isSelected ? 'border-2 border-white scale-125 z-50' : 'border border-slate-900';

  const html = `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      ${pulseClass ? `<div class="${pulseClass}" style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background-color: ${bgColor}; opacity: 0.75;"></div>` : ''}
      <div class="${border}" style="position: relative; width: 28px; height: 28px; border-radius: 50%; background-color: ${bgColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px ${ringColor};">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-incident-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

/**
 * Creates custom SVG Leaflet DivIcon for Resources.
 */
export function createResourceDivIcon(type: ResourceType, status: ResourceStatus, isSelected = false): L.DivIcon {
  let bgColor = '#10b981'; // AVAILABLE green
  if (status === 'ASSIGNED') bgColor = '#f59e0b'; // Yellow
  if (status === 'BUSY') bgColor = '#ef4444'; // Red
  if (status === 'OFFLINE') bgColor = '#64748b'; // Slate

  const border = isSelected ? 'border-2 border-white scale-125 z-50' : 'border border-slate-900';

  // SVG paths for Ambulance, Fire, Police, Rescue
  let svgContent = '';
  if (type === 'AMBULANCE') {
    svgContent = `<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>`;
  } else if (type === 'FIRE_UNIT') {
    svgContent = `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>`;
  } else if (type === 'POLICE_UNIT') {
    svgContent = `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`;
  } else {
    // RESCUE_TEAM
    svgContent = `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="14.83" y1="9.17" x2="18.36" y2="5.64"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/>`;
  }

  const html = `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div class="${border}" style="width: 28px; height: 28px; border-radius: 6px; background-color: ${bgColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${svgContent}
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-resource-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

/**
 * Creates custom SVG Leaflet DivIcon for Hospitals.
 */
export function createHospitalDivIcon(): L.DivIcon {
  const html = `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="width: 28px; height: 28px; border-radius: 6px; background-color: #0284c7; border: 1.5px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 6v12M6 12h12"/>
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-hospital-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}
