import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Run } from '@squad/core';

// ─── shared mocks via vi.hoisted (runs before vi.mock hoisting) ───

const mocks = vi.hoisted(() => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
  };

  const mockIo = vi.fn(() => mockSocket);
  const effectCleanups: Array<() => void> = [];

  return { mockSocket, mockIo, effectCleanups };
});

// ─── module mocks (hoisted) ───

vi.mock('socket.io-client', () => ({
  io: mocks.mockIo,
}));

vi.mock('react', () => ({
  useEffect: vi.fn((effect: () => void | (() => void)) => {
    const cleanup = effect();
    if (typeof cleanup === 'function') {
      mocks.effectCleanups.push(cleanup);
    }
  }),
}));

// ─── import the hook AFTER mocks ───

import { useRunSocket } from './useRunSocket';

type Handlers = Parameters<typeof useRunSocket>[0];

// ─── helpers ───

/** simulate unmount: run all captured effect cleanups */
function unmountAll() {
  for (const cleanup of mocks.effectCleanups) {
    cleanup();
  }
}

describe('useRunSocket', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mocks.effectCleanups.length = 0;
  });

  it('creates socket with /runs in URL', () => {
    useRunSocket({});
    expect(mocks.mockIo).toHaveBeenCalledOnce();
    const [url] = (mocks.mockIo as any).mock.calls[0] as [string];
    expect(url).toContain('/runs');
  });

  it('registers onRunStarted handler when provided', () => {
    const onRunStarted = vi.fn();
    useRunSocket({ onRunStarted });
    expect(mocks.mockSocket.on).toHaveBeenCalledWith('run.started', onRunStarted);
  });

  it('registers onRunCompleted handler when provided', () => {
    const onRunCompleted = vi.fn();
    useRunSocket({ onRunCompleted });
    expect(mocks.mockSocket.on).toHaveBeenCalledWith('run.completed', onRunCompleted);
  });

  it('registers onRunFailed handler when provided', () => {
    const onRunFailed = vi.fn();
    useRunSocket({ onRunFailed });
    expect(mocks.mockSocket.on).toHaveBeenCalledWith('run.failed', onRunFailed);
  });

  it('registers onRunCancelled handler when provided', () => {
    const onRunCancelled = vi.fn();
    useRunSocket({ onRunCancelled });
    expect(mocks.mockSocket.on).toHaveBeenCalledWith('run.cancelled', onRunCancelled);
  });

  it('does not register handlers for undefined callbacks', () => {
    useRunSocket({});
    expect(mocks.mockSocket.on).not.toHaveBeenCalled();
  });

  it('cleans up listeners and disconnects on unmount', () => {
    const handlers = {
      onRunStarted: vi.fn(),
      onRunCompleted: vi.fn(),
      onRunFailed: vi.fn(),
      onRunCancelled: vi.fn(),
    };

    useRunSocket(handlers);

    // simulate unmount
    unmountAll();

    expect(mocks.mockSocket.off).toHaveBeenCalledWith('run.started');
    expect(mocks.mockSocket.off).toHaveBeenCalledWith('run.completed');
    expect(mocks.mockSocket.off).toHaveBeenCalledWith('run.failed');
    expect(mocks.mockSocket.off).toHaveBeenCalledWith('run.cancelled');
    expect(mocks.mockSocket.disconnect).toHaveBeenCalled();
  });

  it('does not connect to root namespace', () => {
    useRunSocket({});
    const [url] = (mocks.mockIo as any).mock.calls[0] as [string];
    expect(url).not.toBe('http://localhost:3001');
    expect(url).not.toBe(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}`);
    expect(url).toContain('/runs');
  });
});
