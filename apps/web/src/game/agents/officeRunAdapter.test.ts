import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Run } from '@squad/core';
import {
  completeOfficeRun,
  createAndStartRun,
  finishOfficeRun,
  releaseOfficeTask,
  startOfficeRun,
} from './officeRunAdapter';

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

describe('startOfficeRun reclaim', () => {
  it('resets a task stuck in progress and retries the start once', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 400 })
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true, json: async () => mockRun }),
    );

    await expect(startOfficeRun('t-008')).resolves.toEqual(mockRun);

    const calls = vi.mocked(fetch).mock.calls as [string, RequestInit][];
    expect(calls.map(([url, init]) => `${init.method} ${new URL(url).pathname}`)).toEqual([
      'POST /api/tasks/t-008/start',
      'POST /api/tasks/t-008/release',
      'POST /api/tasks/t-008/start',
    ]);
  });

  it('gives up after one reclaim attempt', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 400 })
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValue({ ok: false, status: 400 }),
    );

    await expect(startOfficeRun('t-008')).resolves.toBeNull();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
  });

  it('does not reclaim a task someone finished or blocked', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));

    await expect(startOfficeRun('t-008')).resolves.toBeNull();
    const calls = vi.mocked(fetch).mock.calls as [string, RequestInit][];
    expect(calls.map(([url, init]) => `${init.method} ${new URL(url).pathname}`)).toEqual([
      'POST /api/tasks/t-008/start',
      'POST /api/tasks/t-008/release',
    ]);
  });

  it('does not reclaim a missing task', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    await expect(startOfficeRun('missing-task')).resolves.toBeNull();
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
  });
});

// ─── releaseOfficeTask ───────────────────────────────────────────────────────

describe('releaseOfficeTask', () => {
  it('asks the backend to release the task (in_progress -> todo only)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    await expect(releaseOfficeTask('t-008')).resolves.toBe(true);

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(new URL(url).pathname).toBe('/api/tasks/t-008/release');
    expect(init.method).toBe('POST');
  });

  it('returns false when the backend refuses or is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    await expect(releaseOfficeTask('t-008')).resolves.toBe(false);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));
    await expect(releaseOfficeTask('t-008')).resolves.toBe(false);
  });
});

// ─── finishOfficeRun ─────────────────────────────────────────────────────────

describe('finishOfficeRun', () => {
  it('completes the run, then resets the task so the next cycle can start it', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => mockRun })
        .mockResolvedValueOnce({ ok: true }),
    );

    await expect(finishOfficeRun('r-123', 't-008')).resolves.toEqual(mockRun);

    const calls = vi.mocked(fetch).mock.calls as [string, RequestInit][];
    expect(calls.map(([url, init]) => `${init.method} ${new URL(url).pathname}`)).toEqual([
      'PATCH /api/runs/r-123/complete',
      'POST /api/tasks/t-008/release',
    ]);
  });

  it('holds the next start until the previous finish has released the task', async () => {
    let completeRun!: (value: unknown) => void;
    const order: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init: RequestInit) => {
        order.push(`${init.method} ${new URL(url).pathname}`);
        if (url.endsWith('/complete')) return new Promise((resolve) => (completeRun = resolve));
        return Promise.resolve({ ok: true, json: async () => mockRun });
      }),
    );

    const finished = finishOfficeRun('r-123', 't-008');
    const started = startOfficeRun('t-008');
    await Promise.resolve();
    expect(order).toEqual(['PATCH /api/runs/r-123/complete']);

    completeRun({ ok: true, json: async () => mockRun });
    await Promise.all([finished, started]);
    expect(order).toEqual([
      'PATCH /api/runs/r-123/complete',
      'POST /api/tasks/t-008/release',
      'POST /api/tasks/t-008/start',
    ]);
  });

  it('still releases the task when completing the run fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({ ok: false, status: 404 }).mockResolvedValueOnce({ ok: true }),
    );

    await expect(finishOfficeRun('r-gone', 't-008')).resolves.toBeNull();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
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
