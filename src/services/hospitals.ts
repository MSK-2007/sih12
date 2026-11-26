import { supabase, isSupabaseConfigured, markBackendLive, markBackendOffline } from './supabase';
import { Hospital, HospitalStatus } from '../types/hospital';
import { INITIAL_HOSPITALS } from './mockData';

let localHospitalsStore: Hospital[] = [...INITIAL_HOSPITALS];

export async function fetchHospitals(): Promise<Hospital[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .order('available_beds', { ascending: false });

      if (!error && data) {
        markBackendLive();
        return data.map(mapDbHospitalToModel);
      }
      if (error) markBackendOffline(error.message);
    } catch (err: unknown) {
      markBackendOffline(err instanceof Error ? err.message : 'Supabase hospitals query failed');
    }
  }
  return [...localHospitalsStore];
}

export const getHospitals = fetchHospitals;


export async function updateHospitalCapacity(
  id: string,
  availableBeds: number,
  icuAvailable: number,
  status?: HospitalStatus
): Promise<Hospital | null> {
  const newStatus = status || (availableBeds === 0 ? 'FULL' : availableBeds < 10 ? 'NEAR_CAPACITY' : 'OPERATIONAL');

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('hospitals')
      .update({
        available_beds: availableBeds,
        icu_available: icuAvailable,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      return mapDbHospitalToModel(data);
    }
  }

  const hospital = localHospitalsStore.find((h) => h.id === id);
  if (hospital) {
    hospital.availableBeds = availableBeds;
    hospital.icuAvailable = icuAvailable;
    hospital.status = newStatus;
    hospital.updatedAt = new Date().toISOString();
    return { ...hospital };
  }
  return null;
}

function mapDbHospitalToModel(data: Record<string, unknown>): Hospital {
  return {
    id: data.id as string,
    name: data.name as string,
    address: data.address as string,
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    emergencyCapability: (data.emergency_capability as string[]) || [],
    availableBeds: Number(data.available_beds),
    icuAvailable: Number(data.icu_available),
    status: data.status as any,
    contactNumber: data.contact_number as string,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}
