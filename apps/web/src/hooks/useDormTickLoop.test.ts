// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDormState, type DormState } from '@/game/dorm/dormEngine';
import { useDormTickLoop, type DormTickWalkerMap } from './useDormTickLoop';

const AGENT_IDS = ['mai', 'aki'] as const;
const INTERVAL_MS = 1000;

const IDLE_WALKERS = {
  mai: { agent: { state: 'idle' } },
  aki: { agent: { state: 'idle' } },
} as DormTickWalkerMap;

function renderTickLoop(
  overrides: {
    roomReady?: boolean;
    walkers?: DormTickWalkerMap;
    comfort?: number;
  } = {},
) {
  const officeWalkersRef = { current: overrides.walkers ?? IDLE_WALKERS };
  const comfortRef = { current: overrides.comfort ?? 0 };
  const view = renderHook(
    (props: { roomReady: boolean }) => {
      const [dorm, setDorm] = useState<DormState>(() => createDormState([...AGENT_IDS], Date.now()));
      // Wraps the real setState so tests can assert call counts while still
      // exercising real React state updates (no re-implementing tickDorm's math here).
      const setDormSpy = useRef<Dispatch<SetStateAction<DormState>>>(vi.fn(setDorm)).current;
      useDormTickLoop({
        roomReady: props.roomReady,
        agentIds: [...AGENT_IDS],
        officeWalkersRef,
        comfortRef,
        setDorm: setDormSpy,
        intervalMs: INTERVAL_MS,
      });
      return { dorm, setDormSpy };
    },
    { initialProps: { roomReady: overrides.roomReady ?? true } },
  );
  return { ...view, officeWalkersRef, comfortRef };
}

describe('useDormTickLoop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not tick while roomReady is false', () => {
    const { result } = renderTickLoop({ roomReady: false });
    act(() => {
      vi.advanceTimersByTime(INTERVAL_MS * 3);
    });
    expect(result.current.setDormSpy).not.toHaveBeenCalled();
  });

  it('calls setDorm after intervalMs once roomReady is true', () => {
    const { result } = renderTickLoop({ roomReady: true });
    expect(result.current.setDormSpy).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(INTERVAL_MS);
    });
    expect(result.current.setDormSpy).toHaveBeenCalledTimes(1);
  });

  it('ticks again every intervalMs while roomReady stays true', () => {
    const { result } = renderTickLoop({ roomReady: true });
    act(() => {
      vi.advanceTimersByTime(INTERVAL_MS * 3);
    });
    expect(result.current.setDormSpy).toHaveBeenCalledTimes(3);
  });

  it('grants the resting-only morale bonus to agents in restingIds, derived from officeWalkersRef', () => {
    const { result } = renderTickLoop({
      walkers: {
        mai: { agent: { state: 'resting' } },
        aki: { agent: { state: 'idle' } },
      } as DormTickWalkerMap,
    });
    act(() => {
      vi.advanceTimersByTime(INTERVAL_MS);
    });
    const { mai, aki } = result.current.dorm.characters;
    expect(mai!.morale).toBeGreaterThan(aki!.morale);
  });

  it('reads comfortRef.current fresh on every tick, not a stale closure value', () => {
    const { result, comfortRef } = renderTickLoop({ comfort: 0 });
    act(() => {
      vi.advanceTimersByTime(INTERVAL_MS);
    });
    const xpAfterFirstTick = result.current.dorm.characters.mai!.xp;

    comfortRef.current = 1000; // near-saturating comfort bonus
    act(() => {
      vi.advanceTimersByTime(INTERVAL_MS);
    });
    const xpGainedSecondTick = result.current.dorm.characters.mai!.xp - xpAfterFirstTick;

    expect(xpGainedSecondTick).toBeGreaterThan(xpAfterFirstTick);
  });

  it('stops ticking after unmount', () => {
    const { result, unmount } = renderTickLoop({ roomReady: true });
    act(() => {
      vi.advanceTimersByTime(INTERVAL_MS);
    });
    expect(result.current.setDormSpy).toHaveBeenCalledTimes(1);
    unmount();
    act(() => {
      vi.advanceTimersByTime(INTERVAL_MS * 3);
    });
    expect(result.current.setDormSpy).toHaveBeenCalledTimes(1);
  });
});
