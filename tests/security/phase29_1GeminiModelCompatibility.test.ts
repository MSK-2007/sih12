import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const mockFnState = vi.hoisted(() => ({
  isConfigured: false,
  invokeResult: { data: null as any, error: null as any },
  denoEnv: new Map<string, string>(),
}));

vi.mock('../../src/services/supabase', () => ({
  get isSupabaseConfigured() {
    return mockFnState.isConfigured;
  },
  supabase: {
    functions: {
      invoke: vi.fn(async () => mockFnState.invokeResult),
    },
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
          single: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  },
  markBackendLive: vi.fn(),
  markBackendOffline: vi.fn(),
}));

import { DEFAULT_GEMINI_MODEL } from '../../src/config/ai';
import {
  GEMINI_DEFAULT_MODEL,
  resolveGeminiModel,
  getGeminiGenerateContentUrl,
  extractGeminiResponseText,
  callGeminiGenerateContent,
} from '../../supabase/functions/_shared/gemini';
import { analyzeIncidentWithAI } from '../../src/services/aiAnalysis';
import { analyzeExternalEvent } from '../../src/services/externalEventAiService';
import { sendAssistantMessage } from '../../src/services/geminiAssistantService';

function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(full));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results;
}

describe('Phase 29.1 Gemini Model Compatibility Verification', () => {
  beforeEach(() => {
    mockFnState.isConfigured = false;
    mockFnState.invokeResult = { data: null, error: null };
    mockFnState.denoEnv.clear();
    vi.stubGlobal('Deno', {
      env: {
        get: (key: string) => mockFnState.denoEnv.get(key) ?? '',
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('centralizes gemini-3.8-flash and removes all deprecated gemini-1.5-flash references across src and functions', () => {
    expect(DEFAULT_GEMINI_MODEL).toBe('gemini-3.8-flash');
    expect(GEMINI_DEFAULT_MODEL).toBe('gemini-3.8-flash');
    expect(resolveGeminiModel()).toBe('gemini-3.8-flash');

    const srcFiles = collectTsFiles(resolve(process.cwd(), 'src'));
    const edgeFiles = collectTsFiles(resolve(process.cwd(), 'supabase/functions'));
    for (const file of [...srcFiles, ...edgeFiles]) {
      const content = readFileSync(file, 'utf8');
      expect(content, `${file} must not reference deprecated gemini-1.5-flash`).not.toContain(
        'gemini-1.5-flash'
      );
    }

    const aiFunctions = [
      'analyze-incident',
      'analyze-external-event',
      'explain-reallocation',
      'gemini-assistant',
      'monitor-data-providers',
    ];
    for (const fn of aiFunctions) {
      const fnSrc = readFileSync(resolve(process.cwd(), 'supabase/functions', fn, 'index.ts'), 'utf8');
      expect(fnSrc, `${fn} must import shared Gemini helper`).toContain('../_shared/gemini.ts');
    }
  });

  it('supports validated GEMINI_MODEL env override and keeps API keys out of URLs', () => {
    mockFnState.denoEnv.set('GEMINI_MODEL', 'gemini-3.8-flash');
    expect(resolveGeminiModel()).toBe('gemini-3.8-flash');

    // Invalid / injection model override falls back safely to default
    mockFnState.denoEnv.set('GEMINI_MODEL', '../../other-path?key=1');
    expect(resolveGeminiModel()).toBe('gemini-3.8-flash');

    const url = getGeminiGenerateContentUrl();
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
    expect(url).not.toContain('?key=');
  });

  it('parses successful generateContent responses and excludes internal thought parts', async () => {
    const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent'
      );
      expect((init?.headers as Record<string, string>)['x-goog-api-key']).toBe('test-gemini-secret');
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  { text: 'internal reasoning...', thought: true },
                  { text: '{"severity":"HIGH","required_resources":["FIRE_UNIT"]}' },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as unknown as typeof fetch;

    const result = await callGeminiGenerateContent({
      apiKey: 'test-gemini-secret',
      body: { contents: [{ role: 'user', parts: [{ text: 'analyze' }] }] },
      fetchImpl: mockFetch,
    });

    expect(result.ok).toBe(true);
    expect(result.model).toBe('gemini-3.8-flash');
    expect(result.text).toBe('{"severity":"HIGH","required_resources":["FIRE_UNIT"]}');
    expect(extractGeminiResponseText(result.data)).not.toContain('internal reasoning');
  });

  it('handles Gemini API HTTP errors, network errors, and timeouts gracefully without leaking secrets', async () => {
    const errFetch = vi.fn(async () => new Response('Model error', { status: 429 })) as unknown as typeof fetch;
    const rateLimited = await callGeminiGenerateContent({
      apiKey: 'secret-api-key-never-leak',
      body: {},
      fetchImpl: errFetch,
    });
    expect(rateLimited.ok).toBe(false);
    expect(rateLimited.status).toBe(429);
    expect(rateLimited.error).toBe('Gemini API HTTP 429');
    expect(rateLimited.error).not.toContain('secret-api-key');

    const timeoutFetch = vi.fn(async () => {
      const err = new Error('The operation timed out');
      err.name = 'TimeoutError';
      throw err;
    }) as unknown as typeof fetch;
    const timedOut = await callGeminiGenerateContent({
      apiKey: 'secret-api-key-never-leak',
      body: {},
      timeoutMs: 100,
      fetchImpl: timeoutFetch,
    });
    expect(timedOut.ok).toBe(false);
    expect(timedOut.status).toBe(504);
    expect(timedOut.error).toBe('Gemini API request timed out');
  });

  it('preserves deterministic client fallbacks and default gemini-3.8-flash attribution', async () => {
    // Incident AI analysis fallback when offline
    const incAnalysis = await analyzeIncidentWithAI({
      id: 'inc-1',
      incidentNumber: 'INC-2026-0001',
      emergencyType: 'FIRE',
      title: 'Factory Fire',
      description: 'Smoke observed',
      address: 'Sector 2',
      latitude: 12.97,
      longitude: 77.59,
      peopleAffected: 3,
      injuryLevel: 'MODERATE',
      priorityScore: 78,
      priorityLevel: 'HIGH',
      status: 'REPORTED',
      reportedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(incAnalysis.modelName).toBe('resqai-rule-engine-fallback');
    expect(incAnalysis.requiredResources.length).toBeGreaterThan(0);

    // Online Edge Function returning payload without explicit model_name defaults to gemini-3.8-flash
    mockFnState.isConfigured = true;
    mockFnState.invokeResult = {
      data: {
        incident_type: 'FIRE',
        severity: 'HIGH',
        urgency: 'IMMEDIATE',
        people_affected: 3,
        required_resources: ['FIRE_UNIT'],
        risk_factors: ['Spread risk'],
        reasons: ['Live AI evaluation'],
      },
      error: null,
    };
    const incLiveAnalysis = await analyzeIncidentWithAI({
      id: 'inc-2',
      incidentNumber: 'INC-2026-0002',
      emergencyType: 'FIRE',
      title: 'Warehouse Fire',
      description: 'High heat',
      address: 'Peenya',
      latitude: 13.03,
      longitude: 77.52,
      peopleAffected: 5,
      injuryLevel: 'SEVERE',
      priorityScore: 88,
      priorityLevel: 'CRITICAL',
      status: 'REPORTED',
      reportedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(incLiveAnalysis.modelName).toBe('gemini-3.8-flash');

    // External event offline fallback
    mockFnState.isConfigured = false;
    const extFallback = await analyzeExternalEvent({
      id: 'ext-1',
      source: 'USGS',
      sourceEventId: 'us123',
      eventType: 'EARTHQUAKE',
      latitude: 12.97,
      longitude: 77.59,
      magnitude: 5.4,
      title: 'M 5.4 Event',
      severity: 'MODERATE',
      occurredAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      status: 'DETECTED',
    });
    expect(extFallback.success).toBe(true);
    expect(extFallback.analysis?.modelName).toBe('local-offline-fallback');

    // Assistant fallback when offline/error
    const assistantRes = await sendAssistantMessage('Status?', 'sess-1', []);
    expect(assistantRes.isGemini).toBe(false);
    expect(assistantRes.model).toBe('offline-fallback');
  });
});
