import { describe, expect, it, vi } from 'vitest';
import type { ExecuteRunDevResult } from '@/lib/api';
import {
  READ_ONLY_EXECUTION_PROMPT,
  createRunExecutionClickHandler,
  formatRunExecutionError,
  getRunExecutionButtonLabel,
  shouldShowRunExecutionButton,
  type RunExecutionButtonStatus,
} from './RunExecutionButton';

describe('RunExecutionButton', () => {
  it('is hidden when NEXT_PUBLIC_ENABLE_LOCAL_CODEX_UI is not "true"', () => {
    expect(
      shouldShowRunExecutionButton('r-002', {
        NODE_ENV: 'development',
        NEXT_PUBLIC_ENABLE_LOCAL_CODEX_UI: undefined,
      }),
    ).toBe(false);
  });

  it('is hidden in production even when the env flag is true', () => {
    expect(
      shouldShowRunExecutionButton('r-002', {
        NODE_ENV: 'production',
        NEXT_PUBLIC_ENABLE_LOCAL_CODEX_UI: 'true',
      }),
    ).toBe(false);
  });

  it('is visible when the env flag is true and a real run id exists', () => {
    expect(
      shouldShowRunExecutionButton('r-002', {
        NODE_ENV: 'development',
        NEXT_PUBLIC_ENABLE_LOCAL_CODEX_UI: 'true',
      }),
    ).toBe(true);
  });

  it('is hidden when no run id exists', () => {
    expect(
      shouldShowRunExecutionButton(undefined, {
        NODE_ENV: 'development',
        NEXT_PUBLIC_ENABLE_LOCAL_CODEX_UI: 'true',
      }),
    ).toBe(false);
  });

  it('uses a fixed read-only prompt with no workspace-write UI or cwd', () => {
    expect(READ_ONLY_EXECUTION_PROMPT).toBe(
      'Read-only UI-triggered execution smoke. Do not modify files. Inspect the project briefly and reply with one short status sentence.',
    );
    expect(READ_ONLY_EXECUTION_PROMPT).not.toContain('workspace-write');
    expect(READ_ONLY_EXECUTION_PROMPT).not.toContain('cwd');
    expect(READ_ONLY_EXECUTION_PROMPT).not.toContain('danger-full-access');
  });

  it('shows a pending label while the request is in flight', () => {
    expect(getRunExecutionButtonLabel(false)).toBe('Dev: Run read-only');
    expect(getRunExecutionButtonLabel(true)).toBe('Starting...');
  });

  it('starts execution and shows accepted state', async () => {
    let pending = false;
    let status: RunExecutionButtonStatus = { kind: 'idle' };
    const execute = vi.fn(
      async (): Promise<ExecuteRunDevResult> => ({
        ok: true,
        data: { runId: 'r-002', executionStarted: true },
      }),
    );

    const handleClick = createRunExecutionClickHandler({
      runId: 'r-002',
      isPending: () => pending,
      setPending: (value) => {
        pending = value;
      },
      setStatus: (value) => {
        status = value;
      },
      execute,
    });

    await handleClick();

    expect(execute).toHaveBeenCalledWith('r-002', READ_ONLY_EXECUTION_PROMPT);
    expect(pending).toBe(false);
    expect(status).toEqual({ kind: 'started', message: 'Execution started' });
  });

  it('does not start another execution while pending', async () => {
    const execute = vi.fn(
      async (): Promise<ExecuteRunDevResult> => ({
        ok: true,
        data: { runId: 'r-002', executionStarted: true },
      }),
    );

    const handleClick = createRunExecutionClickHandler({
      runId: 'r-002',
      isPending: () => true,
      setPending: vi.fn(),
      setStatus: vi.fn(),
      execute,
    });

    await handleClick();

    expect(execute).not.toHaveBeenCalled();
  });

  it('shows a safe concise error message', async () => {
    const statuses: RunExecutionButtonStatus[] = [];
    const execute = vi.fn(
      async (): Promise<ExecuteRunDevResult> => ({
        ok: false,
        status: 403,
        message: 'Forbidden\nError: stack trace should not sprawl forever',
      }),
    );

    const handleClick = createRunExecutionClickHandler({
      runId: 'r-002',
      isPending: () => false,
      setPending: vi.fn(),
      setStatus: (value) => {
        statuses.push(value);
      },
      execute,
    });

    await handleClick();

    const status = statuses.at(-1);
    if (!status || status.kind !== 'error') {
      throw new Error(`Expected error status, received ${status?.kind ?? 'none'}`);
    }

    expect(status.message).toBe(
      'Could not start execution: 403: Forbidden Error: stack trace should not sprawl forever',
    );
    expect(status.message).not.toContain('\n');
  });

  it('formats HTTP and network errors without raw stack dumps', () => {
    expect(formatRunExecutionError({ ok: false, status: 503, message: 'Service disabled' })).toBe(
      '503: Service disabled',
    );
    expect(formatRunExecutionError({ ok: false, message: 'Network failure' })).toBe(
      'Network failure',
    );
  });
});

// ─── Hydration safety ─────────────────────────────────────────

describe('hydration safety', () => {
  it('shouldShowRunExecutionButton is pure and accepts explicit env', () => {
    expect(
      shouldShowRunExecutionButton('r-002', {
        NODE_ENV: 'development',
        NEXT_PUBLIC_ENABLE_LOCAL_CODEX_UI: 'true',
      }),
    ).toBe(true);
  });
});
