import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateOfficeDialogue } from './dialogueAdapter';
import type { DialogueResponse } from './dialogueAdapter';

const mockLlmResponse: DialogueResponse = {
  fromAgentId: 'agent-3',
  toAgentId: 'agent-1',
  text: 'Everything is looking great today!',
  source: 'llm',
  createdAt: 1_700_000_000,
  fallbackUsed: false,
  model: 'claude-sonnet-4-6',
};

const mockFallbackResponse: DialogueResponse = {
  fromAgentId: 'agent-3',
  toAgentId: 'agent-1',
  text: 'API contract looks clean.',
  source: 'deterministic',
  createdAt: 1_700_000_000,
  fallbackUsed: true,
};

const mockErrorResponse: DialogueResponse = {
  fromAgentId: 'agent-99' as DialogueResponse['fromAgentId'],
  toAgentId: undefined,
  text: 'Dialogue service fallback.',
  source: 'deterministic',
  createdAt: 1_700_000_000,
  fallbackUsed: true,
  errorSummary: 'Unknown agent id: agent-99',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('generateOfficeDialogue', () => {
  it('sends POST to /api/dialogue/office', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => mockLlmResponse }));

    await generateOfficeDialogue({ fromAgentId: 'agent-3' });

    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/dialogue/office');
    expect(init?.method).toBe('POST');
  });

  it('uses configured API base URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => mockLlmResponse }));

    await generateOfficeDialogue({ fromAgentId: 'agent-3' });

    const [url] = vi.mocked(fetch).mock.calls[0] as [string];
    expect(url).toMatch(/^https?:\/\/.*\/api\/dialogue\/office$/);
  });

  it('serializes request body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => mockLlmResponse }));

    await generateOfficeDialogue({
      fromAgentId: 'agent-3',
      officeStatus: 'idle',
      maxChars: 80,
      recentDialogue: ['hello'],
    });

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.fromAgentId).toBe('agent-3');
    expect(body.officeStatus).toBe('idle');
    expect(body.maxChars).toBe(80);
    expect(body.recentDialogue).toEqual(['hello']);
  });

  it('includes JSON content type', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => mockLlmResponse }));

    await generateOfficeDialogue({ fromAgentId: 'agent-3' });

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('returns response on OK', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => mockLlmResponse }));

    const result = await generateOfficeDialogue({ fromAgentId: 'agent-3' });

    expect(result).toEqual(mockLlmResponse);
  });

  // ── LLM response ────────────────────────────────────────────────────────────

  it('supports source: "llm" response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => mockLlmResponse }));

    const result = await generateOfficeDialogue({ fromAgentId: 'agent-3' });

    expect(result!.source).toBe('llm');
    expect(result!.fallbackUsed).toBe(false);
    expect(result!.model).toBe('claude-sonnet-4-6');
  });

  // ── Deterministic fallback ──────────────────────────────────────────────────

  it('supports source: "deterministic" fallback response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => mockFallbackResponse }));

    const result = await generateOfficeDialogue({ fromAgentId: 'agent-3' });

    expect(result!.source).toBe('deterministic');
    expect(result!.fallbackUsed).toBe(true);
  });

  it('preserves fallbackUsed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => mockLlmResponse }));

    const result = await generateOfficeDialogue({ fromAgentId: 'agent-3' });

    expect(result!.fallbackUsed).toBe(false);
  });

  it('preserves model when present', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => mockLlmResponse }));

    const result = await generateOfficeDialogue({ fromAgentId: 'agent-3' });

    expect(result!.model).toBe('claude-sonnet-4-6');
  });

  // ── Error handling ──────────────────────────────────────────────────────────

  it('returns null on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const result = await generateOfficeDialogue({ fromAgentId: 'agent-3' });

    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    const result = await generateOfficeDialogue({ fromAgentId: 'agent-3' });

    expect(result).toBeNull();
  });

  it('does not throw on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    await expect(generateOfficeDialogue({ fromAgentId: 'agent-3' })).resolves.toBeNull();
  });

  it('handles invalid-agent fallback response with errorSummary', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => mockErrorResponse }));

    const result = await generateOfficeDialogue({
      fromAgentId: 'agent-99' as DialogueResponse['fromAgentId'],
    });

    expect(result).not.toBeNull();
    expect(result!.errorSummary).toBe('Unknown agent id: agent-99');
    expect(result!.fallbackUsed).toBe(true);
  });
});
