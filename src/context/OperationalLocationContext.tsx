import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface OperationalLocation {
  label: string;
  city: string;
  state: string;
  district: string;
  latitude: number;
  longitude: number;
  firmsbox: string; // NASA FIRMS bounding box: "minLon,minLat,maxLon,maxLat"
}

// Predefined operational areas — operators can also set custom
export const OPERATIONAL_LOCATIONS: OperationalLocation[] = [
  {
    label: 'Bengaluru Urban',
    city: 'Bengaluru',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    latitude: 12.9716,
    longitude: 77.5946,
    firmsbox: '77.4,12.7,77.8,13.2',
  },
  {
    label: 'Mumbai Metro',
    city: 'Mumbai',
    state: 'Maharashtra',
    district: 'Mumbai City',
    latitude: 19.0760,
    longitude: 72.8777,
    firmsbox: '72.7,18.9,73.0,19.3',
  },
  {
    label: 'Delhi NCR',
    city: 'Delhi',
    state: 'Delhi',
    district: 'Central Delhi',
    latitude: 28.6139,
    longitude: 77.2090,
    firmsbox: '76.9,28.4,77.5,28.8',
  },
  {
    label: 'Chennai Metro',
    city: 'Chennai',
    state: 'Tamil Nadu',
    district: 'Chennai',
    latitude: 13.0827,
    longitude: 80.2707,
    firmsbox: '80.1,12.9,80.5,13.3',
  },
  {
    label: 'Hyderabad Metro',
    city: 'Hyderabad',
    state: 'Telangana',
    district: 'Hyderabad',
    latitude: 17.3850,
    longitude: 78.4867,
    firmsbox: '78.3,17.1,78.7,17.6',
  },
  {
    label: 'Kolkata Metro',
    city: 'Kolkata',
    state: 'West Bengal',
    district: 'Kolkata',
    latitude: 22.5726,
    longitude: 88.3639,
    firmsbox: '88.2,22.4,88.5,22.8',
  },
  {
    label: 'Pune Urban',
    city: 'Pune',
    state: 'Maharashtra',
    district: 'Pune',
    latitude: 18.5204,
    longitude: 73.8567,
    firmsbox: '73.7,18.3,74.0,18.7',
  },
];

interface OperationalLocationContextValue {
  location: OperationalLocation;
  setLocation: (loc: OperationalLocation) => void;
  setCustomLocation: (lat: number, lng: number, label: string) => void;
  availableLocations: OperationalLocation[];
}

const OperationalLocationContext = createContext<OperationalLocationContextValue | null>(null);

export function OperationalLocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<OperationalLocation>(OPERATIONAL_LOCATIONS[0]);

  const setLocation = useCallback((loc: OperationalLocation) => {
    setLocationState(loc);
  }, []);

  const setCustomLocation = useCallback((lat: number, lng: number, label: string) => {
    setLocationState({
      label,
      city: label,
      state: 'Custom',
      district: label,
      latitude: lat,
      longitude: lng,
      firmsbox: `${(lng - 0.3).toFixed(1)},${(lat - 0.3).toFixed(1)},${(lng + 0.3).toFixed(1)},${(lat + 0.3).toFixed(1)}`,
    });
  }, []);

  return (
    <OperationalLocationContext.Provider value={{
      location,
      setLocation,
      setCustomLocation,
      availableLocations: OPERATIONAL_LOCATIONS,
    }}>
      {children}
    </OperationalLocationContext.Provider>
  );
}

export function useOperationalLocation(): OperationalLocationContextValue {
  const ctx = useContext(OperationalLocationContext);
  if (!ctx) throw new Error('useOperationalLocation must be used inside OperationalLocationProvider');
  return ctx;
}
