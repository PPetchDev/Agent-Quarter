import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Run } from '@squad/core';
import { executeRunDev, startTask, completeRun, failRun, cancelRun } from './api';

const successResponse = {
  runId: 'r-002',
  executionStarted: true,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('executeRunDev', () => {
  it('posts to /api/runs/:id/execute', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => successResponse }),
    );

    await executeRunDev('r-002', 'Inspect the project.');

    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/runs/r-002/execute');
    expect(init?.method).toBe('POST');
  });

  it('URL-encodes the run id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => successResponse }),
    );

    await executeRunDev('r 002', 'Inspect the project.');

    const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/runs/r%20002/execute');
  });

  it('sends prompt and read-only mode only', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => successResponse }),
    );

    await executeRunDev('r-002', 'Inspect the project.');

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual({
      prompt: 'Inspect the project.',
      mode: 'read-only',
    });
  });

  it('never sends cwd, workspace-write, danger-full-access, or raw command args', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => successResponse }),
    );

    await executeRunDev('r-002', 'Inspect the project.');

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body).not.toHaveProperty('cwd');
    expect(JSON.stringify(body)).not.toContain('workspace-write');
    expect(JSON.stringify(body)).not.toContain('danger-full-access');
    expect(JSON.stringify(body)).not.toContain('cmd');
    expect(JSON.stringify(body)).not.toContain('args');
  });

  it('returns structured success data on 202 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 202, json: async () => successResponse }),
    );

    const result = await executeRunDev('r-002', 'Inspect the project.');

    expect(result).toEqual({ ok: true, data: successResponse });
  });

  it.each([400, 403, 404, 503])('returns structured error on HTTP %s', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status,
        json: async () => ({ message: `HTTP ${status}` }),
      }),
    );

    const result = await executeRunDev('r-002', 'Inspect the project.');

    expect(result).toEqual({ ok: false, status, message: `HTTP ${status}` });
  });

  it('returns a structured error on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    const result = await executeRunDev('r-002', 'Inspect the project.');

    expect(result).toEqual({ ok: false, message: 'Network failure' });
  });

  it('returns an error for empty prompt without calling fetch', async () => {
    vi.stubGlobal('fetch', vi.fn());

    const result = await executeRunDev('r-002', '   ');

    expect(result).toEqual({ ok: false, message: 'prompt is required' });
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});

describe('task lifecycle mutations', () => {
  const mockRun: Run = { id: 'r-new', projectId: 'p-001', taskId: 't-001', status: 'running' };

  it('startTask POSTs to /api/tasks/:id/start', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => mockRun }));
    await startTask('t-001');
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/tasks/t-001/start');
    expect(init?.method).toBe('POST');
  });

  it('completeRun PATCHes to /api/runs/:id/complete', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...mockRun, status: 'success' }) }));
    await completeRun('r-001');
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/runs/r-001/complete');
    expect(init?.method).toBe('PATCH');
  });

  it('failRun PATCHes to /api/runs/:id/fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...mockRun, status: 'failed' }) }));
    await failRun('r-001');
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/runs/r-001/fail');
    expect(init?.method).toBe('PATCH');
  });

  it('cancelRun PATCHes to /api/runs/:id/cancel', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...mockRun, status: 'cancelled' }) }));
    await cancelRun('r-001');
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/runs/r-001/cancel');
    expect(init?.method).toBe('PATCH');
  });

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ message: 'Bad request' }) }));
    await expect(startTask('t-001')).rejects.toThrow('Bad request');
  });
});
