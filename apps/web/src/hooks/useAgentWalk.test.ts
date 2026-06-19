// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgentWalk } from './useAgentWalk';

describe('useAgentWalk RAF loop', () => {
  let originalRequestAnimationFrame: typeof globalThis.requestAnimationFrame;
  let originalCancelAnimationFrame: typeof globalThis.cancelAnimationFrame;
  let callbacks: Map<number, FrameRequestCallback>;
  let nextHandle: number;

  beforeEach(() => {
    originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
    callbacks = new Map();
    nextHandle = 1;

    globalThis.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      const handle = nextHandle++;
      callbacks.set(handle, callback);
      return handle;
    });
    globalThis.cancelAnimationFrame = vi.fn((handle: number) => {
      callbacks.delete(handle);
    });
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    vi.restoreAllMocks();
  });

  it('does not schedule an animation frame while idle', () => {
    renderHook(() => useAgentWalk());

    expect(globalThis.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('starts the animation loop when a task is assigned and cancels it when cleared', () => {
    const { result } = renderHook(() => useAgentWalk());

    act(() => {
      result.current.assignTask('code');
    });

    expect(globalThis.requestAnimationFrame).toHaveBeenCalledOnce();
    const [handle] = callbacks.keys();

    act(() => {
      result.current.clearAgentTask();
    });

    expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(handle);
  });

  it('walkToIso starts a stationless wander stroll from idle', () => {
    const { result } = renderHook(() => useAgentWalk());

    let started = false;
    act(() => {
      started = result.current.walkToIso({ wx: 5, wy: 4, wz: 0 });
    });

    expect(started).toBe(true);
    expect(result.current.agent.state).toBe('walking');
    expect(result.current.agent.targetStationId).toBeUndefined();
    expect(result.current.agent.workDurationMs).toBeUndefined();
    expect(result.current.agent.bubbleText).toBeUndefined();
    expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
  });

  it('walkToIso refuses to interrupt a non-idle agent', () => {
    const { result } = renderHook(() => useAgentWalk());

    act(() => {
      result.current.assignTask('code');
    });
    const stationId = result.current.agent.targetStationId;

    let started = true;
    act(() => {
      started = result.current.walkToIso({ wx: 5, wy: 4, wz: 0 });
    });

    expect(started).toBe(false);
    expect(result.current.agent.targetStationId).toBe(stationId);
  });
});
