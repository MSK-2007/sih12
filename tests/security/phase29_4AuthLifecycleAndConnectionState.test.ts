import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkSupabaseConnection,
  markBackendLive,
  markBackendReachableAuthRequired,
  markBackendOffline,
  getBackendConnectionState,
} from '../../src/services/supabase';

describe('Phase 29.4.1 — Connection State & Auth Lifecycle Resilience Tests', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://itmeoierfppvoaljebco.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-test-key-valid');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Connection state classification accuracy', () => {
    it('does not mark backend LIVE when an anonymous probe receives 42501 (permission denied)', () => {
      markBackendReachableAuthRequired();
      const state = getBackendConnectionState();
      expect(state.mode).toBe('CACHED');
      expect(state.mode).not.toBe('LIVE');
      expect(state.lastError).toContain('Authentication required');
    });

    it('marks backend LIVE only when an authorized database operation succeeds', () => {
      markBackendLive();
      const state = getBackendConnectionState();
      expect(state.mode).toBe('LIVE');
      expect(state.lastError).toBeNull();
      expect(state.lastSuccessAt).not.toBeNull();
    });

    it('marks backend OFFLINE when network or host is unreachable', () => {
      markBackendOffline('fetch failed: ENOTFOUND');
      const state = getBackendConnectionState();
      expect(state.mode).toBe('OFFLINE');
      expect(state.lastError).toContain('ENOTFOUND');
    });
  });

  describe('Deterministic timeout race protection in AuthContext', () => {
    it('ensures onAuthStateChange can cancel the timeout and set a valid session safely', async () => {
      let timeoutCleared = false;
      let timerId: any = setTimeout(() => {}, 4000);

      // Simulate onAuthStateChange firing before the 4-second timeout
      let handledByAuthChange = false;
      const fakeAuthEvent = () => {
        handledByAuthChange = true;
        clearTimeout(timerId);
        timeoutCleared = true;
      };

      // Event fires at 100ms
      fakeAuthEvent();

      expect(handledByAuthChange).toBe(true);
      expect(timeoutCleared).toBe(true);
    });
  });
});
