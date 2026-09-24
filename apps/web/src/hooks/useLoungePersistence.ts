import { useEffect, type MutableRefObject } from 'react';
import type { RoomThemeKey } from '@/components/lounge/pixiRoom';
import type { RoomObject } from '@/components/lounge/roomDefs';
import type { DormState } from '@/game/dorm/dormEngine';

const STORAGE_KEY = 'squad:lounge:v8';

export interface LoungeSaveSnapshot {
  objects: RoomObject[];
  inactiveFloorObjects: RoomObject[];
  roomName: string;
  happiness: number;
  floor: number;
  coins: number;
  tokens: number;
  themeKey: 'auto' | RoomThemeKey;
  dorm: DormState;
  roomW: number;
  roomH: number;
}

export interface UseLoungePersistenceParams {
  roomReady: boolean;
  nextIdRef: MutableRefObject<number>;
  snapshot: LoungeSaveSnapshot;
}

/**
 * Autosaves the lounge snapshot to localStorage under squad:lounge:v8.
 * Gated on roomReady so the initial-mount default state never clobbers a
 * saved layout before the async load applies it.
 */
export function useLoungePersistence({
  roomReady,
  nextIdRef,
  snapshot: {
    objects,
    inactiveFloorObjects,
    roomName,
    happiness,
    floor,
    coins,
    tokens,
    themeKey,
    dorm,
    roomW,
    roomH,
  },
}: UseLoungePersistenceParams): void {
  useEffect(() => {
    if (!roomReady) return;
    try {
      // `objects` always holds the visible floor; persist both floors explicitly.
      const floor1Objects = floor === 1 ? objects : inactiveFloorObjects;
      const floor2Objects = floor === 1 ? inactiveFloorObjects : objects;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          objects: floor1Objects,
          floor2Objects,
          roomName,
          happiness,
          floor,
          coins,
          tokens,
          themeKey,
          dorm,
          nextId: nextIdRef.current,
          roomW,
          roomH,
          savedAt: Date.now(),
        }),
      );
    } catch {
      /* ignore */
    }
  }, [
    roomReady,
    objects,
    inactiveFloorObjects,
    roomName,
    happiness,
    floor,
    coins,
    tokens,
    themeKey,
    dorm,
    roomW,
    roomH,
    nextIdRef,
  ]);
}
