// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkCollision, type RoomObject } from '@/components/lounge/roomDefs';
import { worldDeltaFromScreen } from '@/components/lounge/pixiRoom';
import { useFurnitureDrag, type DragScene } from './useFurnitureDrag';

function makeObject(overrides: Partial<RoomObject> = {}): RoomObject {
  return {
    id: 1,
    furnitureType: 'nightstand',
    label: 'Nightstand',
    description: '',
    wx: 2,
    wy: 2,
    wz: 0,
    happiness: 0,
    draggable: true,
    ...overrides,
  };
}

function expectedNextPos(startWx: number, startWy: number, dScreenX: number, dScreenY: number) {
  const [dwx, dwy] = worldDeltaFromScreen(dScreenX, dScreenY);
  const nx = Math.round(Math.max(0, Math.min(10 - 1, Math.round(startWx) + dwx)));
  const ny = Math.round(Math.max(0, Math.min(10 - 1, Math.round(startWy) + dwy)));
  return { nx, ny };
}

function renderDrag(initialObjects: RoomObject[]) {
  const objectsRef = { current: initialObjects };
  const roomWRef = { current: 10 };
  const roomHRef = { current: 10 };
  const scaleRef = { current: 1 };
  const modeRef: { current: 'visit' | 'move' } = { current: 'move' };
  const scene = {
    updateItem: vi.fn(),
    setDragHighlight: vi.fn(),
    setSelected: vi.fn(),
  };
  const sceneRef = { current: scene as DragScene | null };
  const setObjects = vi.fn();
  const pushHistorySnapshot = vi.fn();
  const view = renderHook(() =>
    useFurnitureDrag({
      objectsRef,
      roomWRef,
      roomHRef,
      scaleRef,
      modeRef,
      sceneRef,
      setObjects,
      pushHistorySnapshot,
    }),
  );
  return { ...view, objectsRef, sceneRef, scene, setObjects, pushHistorySnapshot, modeRef };
}

describe('useFurnitureDrag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not start a drag when modeRef is not "move"', () => {
    const { result, scene, modeRef } = renderDrag([makeObject()]);
    modeRef.current = 'visit';
    result.current.onDragStart(1, 100, 100);
    result.current.onPointerMove({ global: { x: 110, y: 100 } });
    expect(scene.updateItem).not.toHaveBeenCalled();
  });

  it('moves the dragged object and updates the scene on pointermove', () => {
    const { result, scene, objectsRef } = renderDrag([makeObject({ wx: 2, wy: 2 })]);
    result.current.onDragStart(1, 100, 100);
    result.current.onPointerMove({ global: { x: 130, y: 100 } });

    const { nx, ny } = expectedNextPos(2, 2, 30, 0);
    expect(scene.updateItem).toHaveBeenCalledWith(1, nx, ny, 0);
    expect(objectsRef.current.find((o) => o.id === 1)).toMatchObject({ wx: nx, wy: ny });
  });

  it('still moves the object visually into a colliding position, but flags the highlight', () => {
    const blocker = makeObject({ id: 2, wx: 5, wy: 2, furnitureType: 'nightstand' });
    const { result, scene } = renderDrag([makeObject({ wx: 2, wy: 2 }), blocker]);
    result.current.onDragStart(1, 100, 100);
    // Move far enough right to land on top of the blocker at (5, 2).
    result.current.onPointerMove({ global: { x: 100 + 3 * 56, y: 100 } });

    expect(scene.updateItem).toHaveBeenCalled();
    expect(scene.setDragHighlight).toHaveBeenCalledWith(1, true);
  });

  it('snaps back to the last non-colliding position on endDrag when the final spot collides', () => {
    const blocker = makeObject({ id: 2, wx: 5, wy: 2 });
    const { result, scene, setObjects } = renderDrag([makeObject({ wx: 2, wy: 2 }), blocker]);
    result.current.onDragStart(1, 100, 100);
    result.current.onPointerMove({ global: { x: 100 + 3 * 56, y: 100 } }); // collides
    result.current.endDrag();

    const finalCall = scene.updateItem.mock.calls[scene.updateItem.mock.calls.length - 1]!;
    const [, finalX, finalY] = finalCall;
    expect(checkCollision([makeObject({ wx: finalX, wy: finalY }), blocker], 1, finalX, finalY)).toBe(
      false,
    );
    const committed = setObjects.mock.calls[0]![0] as RoomObject[];
    expect(committed.find((o) => o.id === 1)).toMatchObject({ wx: finalX, wy: finalY });
  });

  it('pushes a pre-drag history snapshot only when the object actually moved', () => {
    const { result, pushHistorySnapshot } = renderDrag([makeObject({ wx: 2, wy: 2 })]);
    result.current.onDragStart(1, 100, 100);
    result.current.onPointerMove({ global: { x: 130, y: 100 } });
    result.current.endDrag();

    expect(pushHistorySnapshot).toHaveBeenCalledTimes(1);
    const snapshot = pushHistorySnapshot.mock.calls[0]![0] as RoomObject[];
    expect(snapshot.find((o) => o.id === 1)).toMatchObject({ wx: 2, wy: 2 });
  });

  it('does not push history when the object did not move', () => {
    const { result, pushHistorySnapshot } = renderDrag([makeObject({ wx: 2, wy: 2 })]);
    result.current.onDragStart(1, 100, 100);
    result.current.endDrag();
    expect(pushHistorySnapshot).not.toHaveBeenCalled();
  });

  it('clears selection and setObjects on endDrag', () => {
    const { result, scene, setObjects } = renderDrag([makeObject()]);
    result.current.onDragStart(1, 100, 100);
    result.current.onPointerMove({ global: { x: 130, y: 100 } });
    result.current.endDrag();
    expect(scene.setSelected).toHaveBeenCalledWith(null);
    expect(setObjects).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when onPointerMove/endDrag fire without an active drag', () => {
    const { result, scene, setObjects, pushHistorySnapshot } = renderDrag([makeObject()]);
    result.current.onPointerMove({ global: { x: 999, y: 999 } });
    result.current.endDrag();
    expect(scene.updateItem).not.toHaveBeenCalled();
    expect(setObjects).not.toHaveBeenCalled();
    expect(pushHistorySnapshot).not.toHaveBeenCalled();
  });

  it('clears the active drag after endDrag so a second endDrag is a no-op', () => {
    const { result, setObjects } = renderDrag([makeObject({ wx: 2, wy: 2 })]);
    result.current.onDragStart(1, 100, 100);
    result.current.onPointerMove({ global: { x: 130, y: 100 } });
    result.current.endDrag();
    expect(setObjects).toHaveBeenCalledTimes(1);
    result.current.endDrag();
    expect(setObjects).toHaveBeenCalledTimes(1);
  });
});
