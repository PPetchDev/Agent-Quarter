import { useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { checkCollision, footprintFor, type RoomObject } from '@/components/lounge/roomDefs';
import { worldDeltaFromScreen } from '@/components/lounge/pixiRoom';
import type { RoomScene } from '@/components/lounge/roomLoader';

export type DragScene = Pick<RoomScene, 'updateItem' | 'setDragHighlight' | 'setSelected'>;

export interface DragPointerEvent {
  global: { x: number; y: number };
}

interface DragState {
  id: number;
  screenX: number;
  screenY: number;
  accX: number;
  accY: number;
  lastValidX: number;
  lastValidY: number;
  startX: number;
  startY: number;
}

export interface UseFurnitureDragParams {
  objectsRef: MutableRefObject<RoomObject[]>;
  roomWRef: MutableRefObject<number>;
  roomHRef: MutableRefObject<number>;
  modeRef: MutableRefObject<'visit' | 'move'>;
  sceneRef: MutableRefObject<DragScene | null>;
  setObjects: Dispatch<SetStateAction<RoomObject[]>>;
  pushHistorySnapshot: (snapshot: RoomObject[]) => void;
}

export interface UseFurnitureDragResult {
  onDragStart: (id: number, screenX: number, screenY: number) => void;
  onPointerMove: (e: DragPointerEvent) => void;
  endDrag: () => void;
}

/**
 * Owns the furniture drag state machine: pixel accumulation, room-bounds
 * clamping, collision-flagged visual movement, and snap-back-to-last-valid
 * on release. Reads objects/room/mode fresh via refs so it never
 * needs to re-subscribe when those values change mid-drag.
 */
export function useFurnitureDrag({
  objectsRef,
  roomWRef,
  roomHRef,
  modeRef,
  sceneRef,
  setObjects,
  pushHistorySnapshot,
}: UseFurnitureDragParams): UseFurnitureDragResult {
  const dragRef = useRef<DragState | null>(null);

  const onDragStart = (id: number, screenX: number, screenY: number) => {
    if (modeRef.current !== 'move') return;
    if (dragRef.current) return;
    const item = objectsRef.current.find((o) => o.id === id);
    const wx = item?.wx ?? 0;
    const wy = item?.wy ?? 0;
    dragRef.current = {
      id,
      screenX,
      screenY,
      accX: Math.round(wx),
      accY: Math.round(wy),
      lastValidX: wx,
      lastValidY: wy,
      startX: wx,
      startY: wy,
    };
  };

  const onPointerMove = (e: DragPointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const scene = sceneRef.current;
    if (!scene) return;
    // e.global is already in canvas pixels: Pixi maps client coords through the
    // element's CSS-scaled bounding rect, so the lounge zoom must not be divided out again.
    const dx = e.global.x - drag.screenX;
    const dy = e.global.y - drag.screenY;
    drag.screenX = e.global.x;
    drag.screenY = e.global.y;
    const [dwx, dwy] = worldDeltaFromScreen(dx, dy);
    drag.accX += dwx;
    drag.accY += dwy;
    const item = objectsRef.current.find((o) => o.id === drag.id);
    if (!item) return;
    const fp = footprintFor(item.furnitureType, item.rotation);
    const nx = Math.round(Math.max(0, Math.min(roomWRef.current - fp.w, drag.accX)));
    const ny = Math.round(Math.max(0, Math.min(roomHRef.current - fp.d, drag.accY)));
    const colliding = checkCollision(objectsRef.current, drag.id, nx, ny);
    // Move item visually to new position regardless of collision
    objectsRef.current = objectsRef.current.map((o) =>
      o.id === drag.id ? { ...o, wx: nx, wy: ny } : o,
    );
    scene.updateItem(drag.id, nx, ny, item.wz);
    scene.setDragHighlight(drag.id, colliding);
    if (!colliding) {
      drag.lastValidX = nx;
      drag.lastValidY = ny;
    }
  };

  const endDrag = () => {
    const drag = dragRef.current;
    if (!drag) return;
    const scene = sceneRef.current;
    const didMove = drag.startX !== drag.lastValidX || drag.startY !== drag.lastValidY;
    const item = objectsRef.current.find((o) => o.id === drag.id);
    if (item) {
      const finalX = drag.lastValidX;
      const finalY = drag.lastValidY;
      if (didMove) {
        const previous = objectsRef.current.map((o) =>
          o.id === drag.id ? { ...o, wx: drag.startX, wy: drag.startY } : { ...o },
        );
        pushHistorySnapshot(previous);
      }
      objectsRef.current = objectsRef.current.map((o) =>
        o.id === drag.id ? { ...o, wx: finalX, wy: finalY } : o,
      );
      scene?.updateItem(drag.id, finalX, finalY, item.wz);
    }
    scene?.setSelected(null);
    dragRef.current = null;
    setObjects([...objectsRef.current]);
  };

  return { onDragStart, onPointerMove, endDrag };
}
