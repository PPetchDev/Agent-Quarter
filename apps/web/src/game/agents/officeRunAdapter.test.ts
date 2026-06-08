import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Run } from '@squad/core';
import { completeOfficeRun, createAndStartRun, startOfficeRun } from './officeRunAdapter';

const mockRun: Run = {
  id: 'r-123',
  projectId: 'p-1',
  taskId: 't-008',
  status: 'running',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── startOfficeRun ──────────────────────────────────────────────────────────

describe('startOfficeRun', () => {
  it('returns a Run when the backend responds ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => mockRun }));

    const result = await startOfficeRun('t-008');

    expect(result).toEqual(mockRun);
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/tasks/t-008/start');
    expect(init?.method).toBe('POST');
  });

  it('returns null when the backend responds with a non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    const result = await startOfficeRun('missing-task');

    expect(result).toBeNull();
  });

  it('returns null when fetch throws a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    const result = await startOfficeRun('t-008');

    expect(result).toBeNull();
  });
});

// ─── completeOfficeRun ───────────────────────────────────────────────────────

describe('completeOfficeRun', () => {
  it('returns a Run when the backend responds ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => mockRun }));

    const result = await completeOfficeRun('r-123');

    expect(result).toEqual(mockRun);
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/runs/r-123/complete');
    expect(init?.method).toBe('PATCH');
  });

  it('returns null when the backend responds with a non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const result = await completeOfficeRun('r-123');

    expect(result).toBeNull();
  });

  it('returns null when fetch throws a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    const result = await completeOfficeRun('r-123');

    expect(result).toBeNull();
  });
});

// ─── createAndStartRun (alias) ───────────────────────────────────────────────

describe('createAndStartRun', () => {
  it('delegates to the start endpoint and returns a Run', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => mockRun }));

    const result = await createAndStartRun('t-008');

    expect(result).toEqual(mockRun);
    const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/tasks/t-008/start');
  });
});
