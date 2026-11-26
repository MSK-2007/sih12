import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type BackendDataMode = 'LIVE' | 'CACHED' | 'SIMULATED' | 'OFFLINE';

export interface BackendConnectionState {
  mode: BackendDataMode;
  isConfigured: boolean;
  host: string;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
}

function extractHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'unconfigured';
  }
}

let connectionState: BackendConnectionState = {
  mode: isSupabaseConfigured ? 'CACHED' : 'SIMULATED',
  isConfigured: isSupabaseConfigured,
  host: extractHost(supabaseUrl),
  lastCheckedAt: null,
  lastSuccessAt: null,
  lastError: isSupabaseConfigured ? null : 'Supabase environment variables are not configured.',
};

const listeners = new Set<(state: BackendConnectionState) => void>();

function emitConnectionState() {
  const snapshot = { ...connectionState };
  listeners.forEach((cb) => cb(snapshot));
}

export function getBackendConnectionState(): BackendConnectionState {
  return { ...connectionState };
}

export function subscribeBackendConnection(
  callback: (state: BackendConnectionState) => void
): () => void {
  listeners.add(callback);
  callback({ ...connectionState });
  return () => {
    listeners.delete(callback);
  };
}

export function markBackendLive(): void {
  if (!isSupabaseConfigured) return;
  const now = new Date().toISOString();
  connectionState = {
    ...connectionState,
    mode: 'LIVE',
    lastCheckedAt: now,
    lastSuccessAt: now,
    lastError: null,
  };
  emitConnectionState();
}

export function markBackendReachableAuthRequired(): void {
  if (!isSupabaseConfigured) return;
  const now = new Date().toISOString();
  connectionState = {
    ...connectionState,
    mode: 'CACHED',
    lastCheckedAt: now,
    lastError: 'Backend reachable. Authentication required for operational data.',
  };
  emitConnectionState();
}

export function markBackendOffline(errorMessage: string): void {
  const now = new Date().toISOString();
  connectionState = {
    ...connectionState,
    mode: isSupabaseConfigured ? 'OFFLINE' : 'SIMULATED',
    lastCheckedAt: now,
    lastError: errorMessage,
  };
  emitConnectionState();
}

/**
 * Performs an actual read-only database query to verify live Supabase connectivity.
 * Never reports LIVE unless the database API responds without error.
 */
export async function checkSupabaseConnection(): Promise<BackendConnectionState> {
  if (!isSupabaseConfigured) {
    connectionState = {
      ...connectionState,
      mode: 'SIMULATED',
      lastCheckedAt: new Date().toISOString(),
      lastError: 'Supabase environment variables are not configured.',
    };
    emitConnectionState();
    return { ...connectionState };
  }

  try {
    const { error } = await supabase
      .from('incidents')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      // PostgreSQL error code 42501 indicates insufficient privileges (RLS/grant enforcement).
      // This establishes that the Supabase host and PostgREST API are reachable,
      // but does NOT prove authenticated data access. Mark reachable, not LIVE.
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        markBackendReachableAuthRequired();
      } else {
        markBackendOffline(error.message || 'Supabase database query failed');
      }
    } else {
      markBackendLive();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unable to reach Supabase host';
    markBackendOffline(msg);
  }

  return { ...connectionState };
}
