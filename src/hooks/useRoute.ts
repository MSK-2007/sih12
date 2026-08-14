import { useState, useCallback } from 'react';
import { Coordinate, RouteResult } from '../types/map';
import { getRoute } from '../services/routing';

export function useRoute() {
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const calculateRoute = useCallback(async (origin: Coordinate, destination: Coordinate) => {
    if (!origin || !destination) {
      setError('Invalid coordinates provided for route calculation');
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getRoute(origin, destination);
      setRoute(res);
      return res;
    } catch (err: any) {
      const msg = err?.message || 'Route calculation unavailable. Please try again.';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearRoute = useCallback(() => {
    setRoute(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    route,
    loading,
    error,
    calculateRoute,
    clearRoute,
  };
}
