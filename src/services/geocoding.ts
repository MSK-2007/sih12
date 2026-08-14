import { Coordinate } from '../types/map';

const geocodeCache = new Map<string, string>();

/**
 * Reverse geocodes coordinates to a human-readable location description.
 * Uses Nominatim OpenStreetMap reverse geocoding with caching.
 */
export async function reverseGeocode(coord: Coordinate): Promise<string> {
  const cacheKey = `${coord.latitude.toFixed(4)},${coord.longitude.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  const defaultFormatted = `${coord.latitude.toFixed(4)}° N, ${coord.longitude.toFixed(4)}° E`;

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${coord.latitude}&lon=${coord.longitude}&format=json`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, {
      headers: { 'User-Agent': 'ResQAI-Prototype/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(',');
        const address = parts.slice(0, 3).join(',').trim();
        geocodeCache.set(cacheKey, address);
        return address;
      }
    }
  } catch (error) {
    // Fail silently and return formatted GPS string
  }

  return defaultFormatted;
}
