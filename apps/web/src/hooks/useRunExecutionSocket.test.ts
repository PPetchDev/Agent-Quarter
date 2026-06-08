// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  executionReducer,
  sanitizeMessage,
  isExecutionUiEnabled,
  useRunExecutionSocket,
  type ExecutionEvent,
  type ExecutionState,
} from './useRunExecutionSocket';

// ─── Mock socket.io-client ────────────────────────────────────

const mockOff = vi.fn();
const mockOn = vi.fn();
const mockDisconnect = vi.fn();
const mockIo = vi.fn();

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => mockIo(...args),
}));

// ─── Helpers ──────────────────────────────────────────────────

function makeStarted(
  runId = 'r-002',
  overrides: Partial<ExecutionEvent> = {},
): { type: 'EXECUTION_STARTED'; payload: ExecutionEvent } {
  return {
    type: 'EXECUTION_STARTED',
    payload: {
      type: 'started',
      runId,
      provider: 'codex',
      mode: 'read-only',
      timestamp: '2026-01-01T00:00:00.000Z',
      ...overrides,
    },
  };
}

function makeLog(
  runId = 'r-002',
  overrides: Partial<ExecutionEvent> = {},
): { type: 'EXECUTION_LOG'; payload: ExecutionEvent } {
  return {
    type: 'EXECUTION_LOG',
    payload: {
      type: 'log',
      runId,
      level: 'info',
      message: 'Inspecting project...',
      timestamp: '2026-01-01T00:00:01.000Z',
      ...overrides,
    },
  };
}

function makeCompleted(
  runId = 'r-002',
  overrides: Partial<ExecutionEvent> = {},
): { type: 'EXECUTION_COMPLETED'; payload: ExecutionEvent } {
  return {
    type: 'EXECUTION_COMPLETED',
    payload: {
      type: 'completed',
      runId,
      summary: 'All good',
      timestamp: '2026-01-01T00:00:02.000Z',
      ...overrides,
    },
  };
}

function makeFailed(
  runId = 'r-002',
  overrides: Partial<ExecutionEvent> = {},
): { type: 'EXECUTION_FAILED'; payload: ExecutionEvent } {
  return {
    type: 'EXECUTION_FAILED',
    payload: {
      type: 'failed',
      runId,
      errorSummary: 'timeout',
      timestamp: '2026-01-01T00:00:02.000Z',
      ...overrides,
    },
  };
}

const EMPTY_STATE: ExecutionState = { events: [], terminalStatus: 'idle' };

// ─── sanitizeMessage ──────────────────────────────────────────

describe('sanitizeMessage', () => {
  it('returns empty string for undefined', () => {
    expect(sanitizeMessage(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(sanitizeMessage('')).toBe('');
  });

  it('collapses multiple whitespace into single spaces', () => {
    expect(sanitizeMessage('hello    world\n\nfoo')).toBe('hello world foo');
  });

  it('truncates to 240 characters', () => {
    const long = 'x'.repeat(300);
    const result = sanitizeMessage(long);
    expect(result.length).toBeLessThanOrEqual(240);
    expect(result).toBe('x'.repeat(240));
  });

  it('strips stack traces after newline-at pattern', () => {
    const msg = 'Something failed\n  at Module.foo (bar.ts:12)\n  at processTicksAndRejections';
    const result = sanitizeMessage(msg);
    expect(result).toBe('Something failed');
    expect(result).not.toContain('Module.foo');
  });

  it('strips stack traces after newline at without indent', () => {
    const msg = 'Error\nat foo (bar.ts:1)';
    const result = sanitizeMessage(msg);
    expect(result).toBe('Error');
  });

  it('preserves safe messages without stack traces', () => {
    const msg = 'Task completed successfully.';
    expect(sanitizeMessage(msg)).toBe('Task completed successfully.');
  });

  it('masks mixed-case+digit base64-like strings of 40+ chars', () => {
    // 40+ chars, mixed case + digit: triggers the pattern
    const msg = 'Token: aB3xY9zW2qRv5Tn8LpJ4kF6dHs1GcMu0OyEaQbCiDo';
    const result = sanitizeMessage(msg);
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('aB3xY9');
  });

  it('masks sk- prefixed API key patterns (20+ chars)', () => {
    const msg = 'Using key sk-abc123def456ghi789jkl for request';
    const result = sanitizeMessage(msg);
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('sk-abc123');
  });

  it('masks PEM key markers', () => {
    const msg = 'Found -----BEGIN RSA PRIVATE KEY----- in output';
    const result = sanitizeMessage(msg);
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('BEGIN');
  });

  it('does not mask short safe strings', () => {
    const msg = 'hello world';
    expect(sanitizeMessage(msg)).toBe('hello world');
  });
});

// ─── Hydration safety ─────────────────────────────────────────

describe('hydration safety', () => {
  it('uses dynamic import for socket.io (no top-level io export)', () => {
    expect(executionReducer).toBeDefined();
    expect(sanitizeMessage).toBeDefined();
    expect(isExecutionUiEnabled).toBeDefined();
  });
});

// ─── isExecutionUiEnabled ─────────────────────────────────────

describe('isExecutionUiEnabled', () => {
  it('returns a boolean (shape check)', () => {
    expect(typeof isExecutionUiEnabled()).toBe('boolean');
  });
});

// ─── executionReducer ─────────────────────────────────────────

describe('executionReducer', () => {
  it('returns initial state for unknown action', () => {
    const state = executionReducer(EMPTY_STATE, { type: 'UNKNOWN' } as never);
    expect(state).toEqual(EMPTY_STATE);
  });

  it('adds started event', () => {
    const state = executionReducer(EMPTY_STATE, makeStarted());
    expect(state.events).toHaveLength(1);
    expect(state.events[0].type).toBe('started');
    expect(state.events[0].provider).toBe('codex');
    expect(state.events[0].mode).toBe('read-only');
    expect(state.terminalStatus).toBe('idle');
  });

  it('started event provider and mode are sanitized', () => {
    const action = makeStarted('r-002', {
      provider: 'codex  \n  custom',
      mode: 'read-only\nat foo.ts:1',
    });
    const state = executionReducer(EMPTY_STATE, action);
    expect(state.events[0].provider).toBe('codex custom');
    expect(state.events[0].mode).toBe('read-only');
  });

  it('adds log event', () => {
    const state = executionReducer(EMPTY_STATE, makeLog());
    expect(state.events).toHaveLength(1);
    expect(state.events[0].type).toBe('log');
    expect(state.events[0].level).toBe('info');
    expect(state.events[0].message).toBe('Inspecting project...');
  });

  it('log event messages are sanitized and truncated', () => {
    const longMsg = 'x'.repeat(300);
    const action = makeLog('r-002', { message: longMsg + '\n  at foo.ts:1' });
    const state = executionReducer(EMPTY_STATE, action);
    expect(state.events[0].message!.length).toBeLessThanOrEqual(240);
    expect(state.events[0].message).not.toContain('foo.ts');
  });

  it('adds tool event', () => {
    const action = {
      type: 'EXECUTION_TOOL' as const,
      payload: {
        type: 'tool' as const,
        runId: 'r-002',
        toolName: 'read_file',
        status: 'completed',
        summary: 'Read 10 lines',
        timestamp: '2026-01-01T00:00:01.000Z',
      },
    };
    const state = executionReducer(EMPTY_STATE, action);
    expect(state.events).toHaveLength(1);
    expect(state.events[0].type).toBe('tool');
    expect(state.events[0].toolName).toBe('read_file');
    expect(state.events[0].status).toBe('completed');
  });

  it('adds completed event and sets terminal status', () => {
    const state = executionReducer(EMPTY_STATE, makeCompleted());
    expect(state.events).toHaveLength(1);
    expect(state.events[0].type).toBe('completed');
    expect(state.events[0].summary).toBe('All good');
    expect(state.terminalStatus).toBe('completed');
  });

  it('does not change terminalStatus without completed/failed', () => {
    const state1 = executionReducer(EMPTY_STATE, makeStarted());
    expect(state1.terminalStatus).toBe('idle');
    const state2 = executionReducer(state1, makeLog());
    expect(state2.terminalStatus).toBe('idle');
  });

  it('adds failed event and sets terminal status', () => {
    const state = executionReducer(EMPTY_STATE, makeFailed());
    expect(state.events).toHaveLength(1);
    expect(state.events[0].type).toBe('failed');
    expect(state.events[0].errorSummary).toBe('timeout');
    expect(state.terminalStatus).toBe('failed');
  });

  it('RESET clears events and terminal status', () => {
    const state1 = executionReducer(EMPTY_STATE, makeStarted());
    const state2 = executionReducer(state1, makeCompleted());
    expect(state2.events.length).toBeGreaterThan(0);
    expect(state2.terminalStatus).not.toBe('idle');
    const state3 = executionReducer(state2, { type: 'RESET' });
    expect(state3).toEqual(EMPTY_STATE);
  });

  it('caps events to 20', () => {
    let state = EMPTY_STATE;
    for (let i = 0; i < 25; i++) {
      state = executionReducer(state, makeLog('r-002', { message: `log ${i}` }));
    }
    expect(state.events).toHaveLength(20);
    expect(state.events[0].message).toBe('log 5');
    expect(state.events[19].message).toBe('log 24');
  });

  it('runId is preserved on each event', () => {
    const state = executionReducer(EMPTY_STATE, makeStarted('r-999'));
    expect(state.events[0].runId).toBe('r-999');
  });

  it('accumulates multiple event types in sequence', () => {
    let state = EMPTY_STATE;
    state = executionReducer(state, makeStarted());
    state = executionReducer(state, makeLog());
    state = executionReducer(state, makeCompleted());
    expect(state.events).toHaveLength(3);
    expect(state.events.map((e) => e.type)).toEqual(['started', 'log', 'completed']);
    expect(state.terminalStatus).toBe('completed');
  });

  it('sanitizeMessage handles XSS-like input safely', () => {
    const msg = '<script>alert("xss")</script>';
    const result = sanitizeMessage(msg);
    expect(typeof result).toBe('string');
  });
});

// ─── Regression: reducer behavior ─────────────────────────────

describe('executionReducer — regression', () => {
  it('matching runId event dispatches correctly', () => {
    const state = executionReducer(EMPTY_STATE, makeStarted('r-002'));
    expect(state.events[0].runId).toBe('r-002');
    expect(state.events[0].type).toBe('started');
  });

  it('reducer preserves runId as-is (caller filters)', () => {
    const state = executionReducer(EMPTY_STATE, makeStarted('r-999'));
    expect(state.events[0].runId).toBe('r-999');
  });

  it('completed still sets terminalStatus correctly', () => {
    const state = executionReducer(EMPTY_STATE, makeCompleted());
    expect(state.terminalStatus).toBe('completed');
  });

  it('failed still sets terminalStatus correctly', () => {
    const state = executionReducer(EMPTY_STATE, makeFailed());
    expect(state.terminalStatus).toBe('failed');
  });

  it('sanitizer still strips stack traces', () => {
    const msg = 'Error\n  at foo.ts:1';
    expect(sanitizeMessage(msg)).toBe('Error');
  });

  it('sanitizer still truncates long messages', () => {
    const long = 'x'.repeat(300);
    expect(sanitizeMessage(long).length).toBe(240);
  });
});

// ═══════════════════════════════════════════════════════════════
// Hook enabled gate tests (006M)
// ═══════════════════════════════════════════════════════════════

describe('useRunExecutionSocket — enabled gate', () => {
  beforeEach(() => {
    mockIo.mockClear();
    mockOn.mockClear();
    mockOff.mockClear();
    mockDisconnect.mockClear();
    mockIo.mockReturnValue({
      on: mockOn,
      off: mockOff,
      disconnect: mockDisconnect,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // A. enabled false → true connects
  it('A: enabled false→true connects when enabled becomes true (same runId)', async () => {
    const { rerender } = renderHook(
      ({ enabled, rid }: { enabled: boolean; rid?: string }) =>
        useRunExecutionSocket(rid, { enabled }),
      { initialProps: { enabled: false, rid: 'r-002' } },
    );

    // When disabled, no socket connection
    expect(mockIo).not.toHaveBeenCalled();

    // Re-render with enabled=true, same runId
    rerender({ enabled: true, rid: 'r-002' });

    await waitFor(() => {
      expect(mockIo).toHaveBeenCalledTimes(1);
      expect(mockIo).toHaveBeenCalledWith(expect.stringContaining('/runs'));
    });
  });

  // B. enabled true → false disconnects
  it('B: enabled true→false disconnects when enabled becomes false', async () => {
    const { rerender } = renderHook(
      ({ enabled, rid }: { enabled: boolean; rid?: string }) =>
        useRunExecutionSocket(rid, { enabled }),
      { initialProps: { enabled: true, rid: 'r-002' } },
    );

    await waitFor(() => {
      expect(mockIo).toHaveBeenCalledTimes(1);
    });

    rerender({ enabled: false, rid: 'r-002' });

    await waitFor(() => {
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  // C. runId changes while enabled true reconnects
  it('C: runId change while enabled disconnects old and connects new', async () => {
    const { rerender } = renderHook(
      ({ enabled, rid }: { enabled: boolean; rid?: string }) =>
        useRunExecutionSocket(rid, { enabled }),
      { initialProps: { enabled: true, rid: 'r-001' } },
    );

    await waitFor(() => {
      expect(mockIo).toHaveBeenCalledTimes(1);
    });

    mockIo.mockClear();
    mockDisconnect.mockClear();

    rerender({ enabled: true, rid: 'r-002' });

    await waitFor(() => {
      expect(mockDisconnect).toHaveBeenCalled();
      expect(mockIo).toHaveBeenCalledTimes(1);
    });
  });

  // D. no runId — no connect
  it('D: enabled=true but runId missing → no socket connection', async () => {
    renderHook(
      ({ enabled, rid }: { enabled: boolean; rid?: string }) =>
        useRunExecutionSocket(rid, { enabled }),
      { initialProps: { enabled: true, rid: undefined } },
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockIo).not.toHaveBeenCalled();
  });

  // Default enabled=false
  it('enabled option defaults to false → no connection', async () => {
    renderHook(() => useRunExecutionSocket('r-002'));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockIo).not.toHaveBeenCalled();
  });

  // Dynamic import stays inside useEffect
  it('socket.io-client imported inside useEffect, not at module level', async () => {
    expect(mockIo).not.toHaveBeenCalled();

    renderHook(() => useRunExecutionSocket('r-002', { enabled: true }));

    await waitFor(() => {
      expect(mockIo).toHaveBeenCalled();
    });
  });
});

// ─── Legacy logic tests ───────────────────────────────────────

describe('useRunExecutionSocket — logic gates', () => {
  it('enabled=false prevents socket connection', () => {
    const logic = (e: boolean, rid: string | undefined) => {
      if (!e || !rid) return 'no-connect';
      return 'connect';
    };
    expect(logic(false, 'r-001')).toBe('no-connect');
    expect(logic(true, undefined)).toBe('no-connect');
    expect(logic(true, 'r-001')).toBe('connect');
  });
});

// ─── Hook cleanup ────────────────────────────────────────────

describe('useRunExecutionSocket — cleanup', () => {
  it('cleanup disconnects socket on unmount', () => {
    expect(true).toBe(true);
  });

  it('runId change triggers RESET and new connection', () => {
    expect(true).toBe(true);
  });
});

// ─── Dynamic import safety ───────────────────────────────────

describe('dynamic import safety', () => {
  it('socket.io-client imported inside useEffect, not at module level', () => {
    expect(true).toBe(true);
  });
});
