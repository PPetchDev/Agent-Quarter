'use client';

import { useEffect, useReducer, useRef } from 'react';
import type { Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const MAX_EVENTS = 20;
const MAX_MESSAGE_LENGTH = 240;

/// ─── Hook options ──────────────────────────────────────────────

export interface UseRunExecutionSocketOptions {
  enabled?: boolean;
}

// ─── Types ────────────────────────────────────────────────────

export type ExecutionEventType = 'started' | 'log' | 'tool' | 'completed' | 'failed';

export type ExecutionEvent = {
  type: ExecutionEventType;
  runId: string;
  timestamp?: string;
  // started
  provider?: string;
  mode?: string;
  // log
  level?: string;
  message?: string;
  // tool
  toolName?: string;
  status?: string;
  summary?: string;
  // completed
  // summary (shared with tool)
  // failed
  errorSummary?: string;
};

export type ExecutionTerminalStatus = 'idle' | 'completed' | 'failed';

export type ExecutionState = {
  events: ExecutionEvent[];
  terminalStatus: ExecutionTerminalStatus;
};

// ─── Action types (internal to reducer) ───────────────────────

type ExecutionAction =
  | { type: 'EXECUTION_STARTED'; payload: ExecutionEvent }
  | { type: 'EXECUTION_LOG'; payload: ExecutionEvent }
  | { type: 'EXECUTION_TOOL'; payload: ExecutionEvent }
  | { type: 'EXECUTION_COMPLETED'; payload: ExecutionEvent }
  | { type: 'EXECUTION_FAILED'; payload: ExecutionEvent }
  | { type: 'RESET' };

// ─── Safety ───────────────────────────────────────────────────

const SECRET_KEY_PATTERNS: RegExp[] = [
  /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z0-9+/=_-]{40,}/, // mixed-case+digit base64-like with 40+ chars
  /sk-[A-Za-z0-9_-]{20,}/, // API key prefix
  /-----BEGIN\s/, // PEM private key markers
];

/**
 * Sanitize a raw message string for safe display:
 * - Strip stack traces after the first "\n  at " or "\nat " (before whitespace collapse)
 * - Collapse whitespace
 * - Truncate to MAX_MESSAGE_LENGTH
 * - Mask obvious secret patterns
 */
export function sanitizeMessage(raw: string | undefined): string {
  if (!raw) return '';

  let text = raw;

  // Strip stack traces FIRST — drop everything after first "\n  at " or "\nat "
  const stackIdx = text.search(/\n\s*at\s/);
  if (stackIdx !== -1) {
    text = text.slice(0, stackIdx);
  }

  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // Truncate
  text = text.slice(0, MAX_MESSAGE_LENGTH);

  // Mask obvious secrets
  for (const pattern of SECRET_KEY_PATTERNS) {
    if (pattern.test(text)) {
      text = text.replace(pattern, '[REDACTED]');
    }
  }

  return text;
}

// ─── Helpers ──────────────────────────────────────────────────

function createEvent(runId: string, overrides: Partial<ExecutionEvent>): ExecutionEvent {
  return {
    type: 'log',
    runId,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Reducer ──────────────────────────────────────────────────

export function executionReducer(state: ExecutionState, action: ExecutionAction): ExecutionState {
  switch (action.type) {
    case 'EXECUTION_STARTED': {
      const ev = action.payload;
      return {
        ...state,
        events: [
          ...state.events,
          createEvent(ev.runId, {
            type: 'started',
            provider: sanitizeMessage(ev.provider),
            mode: sanitizeMessage(ev.mode),
            timestamp: ev.timestamp,
          }),
        ].slice(-MAX_EVENTS),
      };
    }

    case 'EXECUTION_LOG': {
      const ev = action.payload;
      return {
        ...state,
        events: [
          ...state.events,
          createEvent(ev.runId, {
            type: 'log',
            level: sanitizeMessage(ev.level),
            message: sanitizeMessage(ev.message),
            timestamp: ev.timestamp,
          }),
        ].slice(-MAX_EVENTS),
      };
    }

    case 'EXECUTION_TOOL': {
      const ev = action.payload;
      return {
        ...state,
        events: [
          ...state.events,
          createEvent(ev.runId, {
            type: 'tool',
            toolName: sanitizeMessage(ev.toolName),
            status: sanitizeMessage(ev.status),
            summary: sanitizeMessage(ev.summary),
            timestamp: ev.timestamp,
          }),
        ].slice(-MAX_EVENTS),
      };
    }

    case 'EXECUTION_COMPLETED': {
      const ev = action.payload;
      return {
        events: [
          ...state.events,
          createEvent(ev.runId, {
            type: 'completed',
            summary: sanitizeMessage(ev.summary),
            timestamp: ev.timestamp,
          }),
        ].slice(-MAX_EVENTS),
        terminalStatus: 'completed',
      };
    }

    case 'EXECUTION_FAILED': {
      const ev = action.payload;
      return {
        events: [
          ...state.events,
          createEvent(ev.runId, {
            type: 'failed',
            errorSummary: sanitizeMessage(ev.errorSummary),
            timestamp: ev.timestamp,
          }),
        ].slice(-MAX_EVENTS),
        terminalStatus: 'failed',
      };
    }

    case 'RESET':
      return { events: [], terminalStatus: 'idle' };

    default:
      return state;
  }
}

// ─── Env gate ─────────────────────────────────────────────────

export function isExecutionUiEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_ENABLE_LOCAL_CODEX_UI === 'true'
  );
}

/// ─── Hook ─────────────────────────────────────────────────────

/**
 * Connect to /runs socket namespace and consume run.execution.* events
 * for a specific runId. Ignores events for other runIds. Clears state
 * when runId changes. Only activates when the dev-only env gate is open
 * and the `enabled` option is true.
 */
export function useRunExecutionSocket(
  runId: string | undefined,
  options?: UseRunExecutionSocketOptions,
): ExecutionState {
  const [state, dispatch] = useReducer(executionReducer, {
    events: [],
    terminalStatus: 'idle',
  });
  const prevRunId = useRef(runId);

  const enabled = options?.enabled ?? false;

  // Reset when runId changes
  useEffect(() => {
    if (runId !== prevRunId.current) {
      dispatch({ type: 'RESET' });
      prevRunId.current = runId;
    }
  }, [runId]);

  // Socket lifecycle — dynamic import prevents SSR/hydration issues
  useEffect(() => {
    if (!enabled || !runId) return;

    let cancelled = false;
    let socket: Socket | null = null;

    async function connect() {
      const { io } = await import('socket.io-client');
      if (cancelled) return;
      socket = io(`${API_URL}/runs`);

      const onStarted = (payload: Record<string, unknown>) => {
        if (payload.runId === runId) {
          dispatch({ type: 'EXECUTION_STARTED', payload: payload as ExecutionEvent });
        }
      };

      const onLog = (payload: Record<string, unknown>) => {
        if (payload.runId === runId) {
          dispatch({ type: 'EXECUTION_LOG', payload: payload as ExecutionEvent });
        }
      };

      const onTool = (payload: Record<string, unknown>) => {
        if (payload.runId === runId) {
          dispatch({ type: 'EXECUTION_TOOL', payload: payload as ExecutionEvent });
        }
      };

      const onCompleted = (payload: Record<string, unknown>) => {
        if (payload.runId === runId) {
          dispatch({ type: 'EXECUTION_COMPLETED', payload: payload as ExecutionEvent });
        }
      };

      const onFailed = (payload: Record<string, unknown>) => {
        if (payload.runId === runId) {
          dispatch({ type: 'EXECUTION_FAILED', payload: payload as ExecutionEvent });
        }
      };

      socket.on('run.execution.started', onStarted);
      socket.on('run.execution.log', onLog);
      socket.on('run.execution.tool', onTool);
      socket.on('run.execution.completed', onCompleted);
      socket.on('run.execution.failed', onFailed);
    }

    connect();

    return () => {
      cancelled = true;
      if (socket) {
        socket.off('run.execution.started');
        socket.off('run.execution.log');
        socket.off('run.execution.tool');
        socket.off('run.execution.completed');
        socket.off('run.execution.failed');
        socket.disconnect();
      }
    };
  }, [runId, enabled]);

  return state;
}
