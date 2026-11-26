import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLimit = vi.fn();
const mockSelect = vi.fn(() => ({ limit: mockLimit }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));
const mockGetSession = vi.fn(async () => ({ data: { session: null } }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getSession: mockGetSession },
  })),
}));

describe('Phase 26 — Supabase Client State & Honest Connectivity Tests (Offline Mocked)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockLimit.mockReset();
    mockGetSession.mockReset();
  });

  it('should mark backend OFFLINE and report DISCONNECTED when a configured DB probe fails', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-test-key');

    mockLimit.mockResolvedValueOnce({ error: { message: 'fetch failed: ENOTFOUND' } });

    const sb = await import('../../src/services/supabase');
    const cc = await import('../../src/services/controlCenter');

    const state = await sb.checkSupabaseConnection();
    expect(state.isConfigured).toBe(true);
    expect(state.mode).toBe('OFFLINE');
    expect(state.lastError).toContain('ENOTFOUND');

    mockLimit.mockResolvedValueOnce({ error: { message: 'fetch failed: ENOTFOUND' } });
    const sysStatus = await cc.getSystemServiceStatus();
    expect(sysStatus.database).toBe('DISCONNECTED');
    expect(sysStatus.realtime).toBe('DISCONNECTED');

    vi.unstubAllEnvs();
  });

  it('should mark backend LIVE and report CONNECTED only when an actual DB query succeeds', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example-project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-test-key');

    mockLimit.mockResolvedValue({ error: null });
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } as any } });

    const sb = await import('../../src/services/supabase');
    const cc = await import('../../src/services/controlCenter');

    const state = await sb.checkSupabaseConnection();
    expect(state.mode).toBe('LIVE');
    expect(state.lastError).toBeNull();
    expect(state.lastSuccessAt).not.toBeNull();

    const sysStatus = await cc.getSystemServiceStatus();
    expect(sysStatus.database).toBe('CONNECTED');
    expect(sysStatus.realtime).toBe('CONNECTED');
    expect(sysStatus.authentication).toBe('ACTIVE');

    vi.unstubAllEnvs();
  });

  it('should report SIMULATED mode and DISCONNECTED DB when Supabase env vars are unconfigured', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://placeholder.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'placeholder-key');

    const sb = await import('../../src/services/supabase');
    const cc = await import('../../src/services/controlCenter');

    const state = await sb.checkSupabaseConnection();
    expect(state.isConfigured).toBe(false);
    expect(state.mode).toBe('SIMULATED');

    const sysStatus = await cc.getSystemServiceStatus();
    expect(sysStatus.database).toBe('DISCONNECTED');
    expect(sysStatus.realtime).toBe('DISCONNECTED');
    expect(sysStatus.authentication).toBe('INACTIVE');

    vi.unstubAllEnvs();
  });
});
