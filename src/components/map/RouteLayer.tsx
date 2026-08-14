import React from 'react';
import { Polyline } from 'react-leaflet';
import { RouteResult } from '../../types/map';

interface Props {
  route: RouteResult | null;
}

export const RouteLayer: React.FC<Props> = ({ route }) => {
  if (!route || !route.geometry || route.geometry.length === 0) return null;

  return (
    <>
      {/* Outer Glow Polyline */}
      <Polyline
        positions={route.geometry}
        pathOptions={{
          color: '#ef4444',
          weight: 7,
          opacity: 0.4,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />

      {/* Inner Crisp Polyline */}
      <Polyline
        positions={route.geometry}
        pathOptions={{
          color: '#ffffff',
          weight: 3,
          opacity: 0.95,
          dashArray: route.provider === 'HAVERSINE_ESTIMATE' ? '8, 8' : undefined,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </>
  );
};
