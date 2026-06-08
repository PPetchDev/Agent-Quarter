import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Run } from '@squad/core';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type RunEventPayload = {
  run: Run;
};

type UseRunSocketHandlers = {
  onRunStarted?: (payload: RunEventPayload) => void;
  onRunCompleted?: (payload: RunEventPayload) => void;
  onRunFailed?: (payload: RunEventPayload) => void;
  onRunCancelled?: (payload: RunEventPayload) => void;
};

export function useRunSocket(handlers: UseRunSocketHandlers = {}) {
  useEffect(() => {
    const socket = io(`${API_URL}/runs`);

    if (handlers.onRunStarted) {
      socket.on('run.started', handlers.onRunStarted);
    }

    if (handlers.onRunCompleted) {
      socket.on('run.completed', handlers.onRunCompleted);
    }

    if (handlers.onRunFailed) {
      socket.on('run.failed', handlers.onRunFailed);
    }

    if (handlers.onRunCancelled) {
      socket.on('run.cancelled', handlers.onRunCancelled);
    }

    return () => {
      socket.off('run.started');
      socket.off('run.completed');
      socket.off('run.failed');
      socket.off('run.cancelled');
      socket.disconnect();
    };
  }, [
    handlers.onRunStarted,
    handlers.onRunCompleted,
    handlers.onRunFailed,
    handlers.onRunCancelled,
  ]);
}