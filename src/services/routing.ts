import { Coordinate, RouteResult } from '../types/map';
import { OSRM_ROUTING_BASE_URL } from '../config/map';

const routeCache = new Map<string, RouteResult>();

/**
 * Calculates distance in KM between two coordinates using Haversine formula.
 */
export function calculateHaversineDistanceKm(origin: Coordinate, destination: Coordinate): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((destination.latitude - origin.latitude) * Math.PI) / 180;
  const dLon = ((destination.longitude - origin.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((origin.latitude * Math.PI) / 180) *
      Math.cos((destination.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Generates intermediate polyline points for straight-line fallback.
 */
function generateFallbackPolyline(origin: Coordinate, destination: Coordinate, steps = 10): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const lat = origin.latitude + (destination.latitude - origin.latitude) * ratio;
    const lng = origin.longitude + (destination.longitude - origin.longitude) * ratio;
    coords.push([lat, lng]);
  }
  return coords;
}

/**
 * Fetches real driving route from OSRM or falls back to Haversine calculation.
 */
export async function getRoute(origin: Coordinate, destination: Coordinate): Promise<RouteResult> {
  const cacheKey = `${origin.latitude.toFixed(5)},${origin.longitude.toFixed(5)}_${destination.latitude.toFixed(5)},${destination.longitude.toFixed(5)}`;

  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  // OSRM expects longitude,latitude format
  const url = `${OSRM_ROUTING_BASE_URL}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OSRM HTTP Error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distanceKm = Math.round((route.distance / 1000) * 100) / 100;
      const durationMinutes = Math.round(route.duration / 60);

      // GeoJSON coordinates are [longitude, latitude], Leaflet expects [latitude, longitude]
      const geometry: [number, number][] = route.geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]]
      );

      const result: RouteResult = {
        distanceKm,
        durationMinutes,
        geometry,
        provider: 'OSRM',
        calculatedAt: new Date().toISOString(),
      };

      routeCache.set(cacheKey, result);
      return result;
    }
  } catch (error) {
    console.warn('OSRM routing request failed or timed out. Using Haversine estimate fallback:', error);
  }

  // Fallback calculation
  const distanceKm = calculateHaversineDistanceKm(origin, destination);
  // Estimate average emergency driving speed of 35 km/h in urban traffic
  const durationMinutes = Math.max(1, Math.round((distanceKm / 35) * 60));
  const geometry = generateFallbackPolyline(origin, destination);

  const fallbackResult: RouteResult = {
    distanceKm,
    durationMinutes,
    geometry,
    provider: 'HAVERSINE_ESTIMATE',
    calculatedAt: new Date().toISOString(),
  };

  routeCache.set(cacheKey, fallbackResult);
  return fallbackResult;
}
