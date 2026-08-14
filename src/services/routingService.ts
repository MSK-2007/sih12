export interface RouteResult {
  distanceKm: number;
  etaMinutes: number;
  coordinates: [number, number][]; // [lat, lng] array
  source: 'OSRM' | 'HAVERSINE_ESTIMATE';
}

/**
 * Calculates straight line Haversine distance between two lat/lng coordinates in kilometers.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Fallback ETA calculation based on distance and average emergency vehicle traffic speed (35 km/h urban).
 */
export function estimateEtaMinutes(distanceKm: number, speedKmH: number = 35): number {
  const hours = distanceKm / speedKmH;
  const minutes = hours * 60;
  return Math.max(1, Math.round(minutes * 10) / 10);
}

/**
 * Calculates route and ETA between origin and destination coordinates.
 * Tries OSRM API first, falls back to Haversine calculation if offline or API unavailable.
 */
export async function calculateRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RouteResult> {
  const osrmBaseUrl = import.meta.env.VITE_OSRM_ROUTING_URL || 'https://router.project-osrm.org';
  const url = `${osrmBaseUrl}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s timeout for prototype responsiveness

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = Math.round((route.distance / 1000) * 100) / 100;
        const etaMinutes = Math.max(1, Math.round((route.duration / 60) * 10) / 10);
        
        // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
        const coordinates: [number, number][] = route.geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]]
        );

        return {
          distanceKm,
          etaMinutes,
          coordinates,
          source: 'OSRM',
        };
      }
    }
  } catch (error) {
    // Graceful fallback to Haversine calculation
  }

  // Fallback Haversine line & calculation
  const distanceKm = calculateHaversineDistance(originLat, originLng, destLat, destLng);
  const etaMinutes = estimateEtaMinutes(distanceKm);
  const stepCount = 10;
  const coordinates: [number, number][] = [];
  
  for (let i = 0; i <= stepCount; i++) {
    const ratio = i / stepCount;
    const lat = originLat + (destLat - originLat) * ratio;
    const lng = originLng + (destLng - originLng) * ratio;
    coordinates.push([lat, lng]);
  }

  return {
    distanceKm,
    etaMinutes,
    coordinates,
    source: 'HAVERSINE_ESTIMATE',
  };
}
