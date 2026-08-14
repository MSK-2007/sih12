export type HospitalStatus = 'OPERATIONAL' | 'NEAR_CAPACITY' | 'FULL' | 'OFFLINE';

export interface Hospital {
  id: string;
  name: string;
  address: string;
  locationName?: string;
  latitude: number;
  longitude: number;
  emergencyCapability: string[];
  totalBeds?: number;
  availableBeds: number;
  icuAvailable: number;
  status: HospitalStatus;
  contactNumber?: string;
  createdAt: string;
  updatedAt?: string;
}
