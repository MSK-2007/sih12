/**
 * Central GIS configuration for ResQAI platform.
 * Default demo center: Bengaluru, India (12.9716, 77.5946)
 */

export const DEFAULT_MAP_CENTER: [number, number] = [12.9716, 77.5946];
export const DEFAULT_ZOOM = 13;
export const DETAIL_ZOOM = 15;

export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// OSRM Routing Endpoint (Public demo server)
export const OSRM_ROUTING_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

export const MAP_BOUNDS_PADDING: [number, number] = [50, 50];
