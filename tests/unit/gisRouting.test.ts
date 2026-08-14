import { describe, it, expect } from 'vitest';
import { calculateHaversineDistanceKm } from '../../src/services/routing';
import { isValidCoordinates } from '../helpers/testUtils';

describe('GIS & Routing Unit Tests', () => {
  it('should validate geographic coordinates correctly', () => {
    expect(isValidCoordinates(12.9716, 77.5946)).toBe(true);
    expect(isValidCoordinates(91, 77.5946)).toBe(false);
    expect(isValidCoordinates(12.9716, -181)).toBe(false);
    expect(isValidCoordinates(NaN, 77.5946)).toBe(false);
    expect(isValidCoordinates(null, 77.5946)).toBe(false);
    expect(isValidCoordinates(undefined, 77.5946)).toBe(false);
  });

  it('should calculate Haversine distance correctly in kilometers', () => {
    // Bangalore MG Road to Koramangala
    const dist = calculateHaversineDistanceKm(
      { latitude: 12.9716, longitude: 77.5946 },
      { latitude: 12.9352, longitude: 77.6245 }
    );
    expect(dist).toBeGreaterThan(3);
    expect(dist).toBeLessThan(10);
    expect(isNaN(dist)).toBe(false);
  });

  it('should return 0 distance for identical origin and destination coordinates', () => {
    const dist = calculateHaversineDistanceKm(
      { latitude: 12.9716, longitude: 77.5946 },
      { latitude: 12.9716, longitude: 77.5946 }
    );
    expect(dist).toBe(0);
  });
});
