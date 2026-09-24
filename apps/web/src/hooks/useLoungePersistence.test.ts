// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLoungePersistence, type LoungeSaveSnapshot } from './useLoungePersistence';
import type { RoomObject } from '@/components/lounge/roomDefs';

const STORAGE_KEY = 'squad:lounge:v8';

function makeSnapshot(overrides: Partial<LoungeSaveSnapshot> = {}): LoungeSaveSnapshot {
  return {
    objects: [] as RoomObject[],
    inactiveFloorObjects: [] as RoomObject[],
    roomName: 'My Room',
    happiness: 50,
    floor: 1,
    coins: 100,
    tokens: 5,
    themeKey: 'auto',
    dorm: { food: 100, characters: {}, lastTickAt: 0 },
    roomW: 10,
    roomH: 8,
    ...overrides,
  };
}

function renderPersistence(
  overrides: {
    roomReady?: boolean;
    nextId?: number;
    snapshot?: Partial<LoungeSaveSnapshot>;
  } = {},
) {
  const nextIdRef = { current: overrides.nextId ?? 1000 };
  const snapshot = makeSnapshot(overrides.snapshot);
  const result = renderHook(
    (props: { roomReady: boolean; snapshot: LoungeSaveSnapshot }) =>
      useLoungePersistence({ roomReady: props.roomReady, nextIdRef, snapshot: props.snapshot }),
    { initialProps: { roomReady: overrides.roomReady ?? true, snapshot } },
  );
  return { ...result, nextIdRef, snapshot };
}

describe('useLoungePersistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('does not write to localStorage when roomReady is false', () => {
    renderPersistence({ roomReady: false });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('writes the snapshot to localStorage under squad:lounge:v8 when roomReady is true', () => {
    renderPersistence({ roomReady: true });
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('maps objects to floor1Objects and inactiveFloorObjects to floor2Objects when floor is 1', () => {
    const active = [{ id: 1 }] as unknown as RoomObject[];
    const inactive = [{ id: 2 }] as unknown as RoomObject[];
    renderPersistence({
      snapshot: { floor: 1, objects: active, inactiveFloorObjects: inactive },
    });
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.objects).toEqual(active);
    expect(saved.floor2Objects).toEqual(inactive);
  });

  it('maps objects to floor2Objects and inactiveFloorObjects to floor1Objects when floor is 2', () => {
    const active = [{ id: 3 }] as unknown as RoomObject[];
    const inactive = [{ id: 4 }] as unknown as RoomObject[];
    renderPersistence({
      snapshot: { floor: 2, objects: active, inactiveFloorObjects: inactive },
    });
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.objects).toEqual(inactive);
    expect(saved.floor2Objects).toEqual(active);
  });

  it('includes nextIdRef.current as nextId in the saved payload', () => {
    renderPersistence({ nextId: 4242 });
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.nextId).toBe(4242);
  });

  it('stamps savedAt with the current time', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123456789);
    renderPersistence();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.savedAt).toBe(123456789);
  });

  it('does not throw when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => renderPersistence()).not.toThrow();
  });
});
