// @vitest-environment jsdom
import * as PIXI from 'pixi.js';
import { describe, expect, it } from 'vitest';
import type { RoomObject } from './roomDefs';
import { buildRoomScene } from './roomLoader';

// jsdom has no 2D canvas; Pixi only needs one to paint Texture.WHITE, so a no-op context is enough.
const noopContext: unknown = new Proxy({}, { get: () => () => {}, set: () => true });
HTMLCanvasElement.prototype.getContext = (() => noopContext) as HTMLCanvasElement['getContext'];

const obj = (over: Partial<RoomObject> & Pick<RoomObject, 'id' | 'furnitureType'>): RoomObject => ({
  label: '',
  description: '',
  wx: 0,
  wy: 0,
  wz: 0,
  happiness: 0,
  draggable: true,
  ...over,
});

const handlers = { onSelect: () => {}, onDragStart: () => {} };
const zOf = (scene: ReturnType<typeof buildRoomScene>, id: number) =>
  scene.items.get(id)!.container.zIndex;

describe('buildRoomScene depth', () => {
  it('re-resolves depth scene-wide when an item moves next to a quarter-turned bookcase', () => {
    const bookcase = obj({ id: 1, furnitureType: 'bookcase', wx: 1, wy: 5, rotation: 1 });
    const plant = obj({ id: 2, furnitureType: 'plant', wx: 5, wy: 0 });
    const scene = buildRoomScene(new PIXI.Container(), [bookcase, plant], handlers);
    const bookcaseBase = zOf(scene, 1);
    expect(bookcaseBase).toBeLessThan(zOf(scene, 2));

    // Moving the plant (not the bookcase) must lift the bookcase over it...
    scene.updateItem(2, 0, 5, 0);
    expect(zOf(scene, 1)).toBeGreaterThan(zOf(scene, 2));

    // ...and moving it away again must drop the lift.
    scene.updateItem(2, 5, 0, 0);
    expect(zOf(scene, 1)).toBe(bookcaseBase);
  });

  it('applies lifts to items added and dropped after the scene is built', () => {
    const bookcase = obj({ id: 1, furnitureType: 'bookcase', wx: 1, wy: 5, rotation: 1 });
    const plant = obj({ id: 2, furnitureType: 'plant', wx: 0, wy: 5 });
    const scene = buildRoomScene(new PIXI.Container(), [bookcase], handlers);
    const bookcaseBase = zOf(scene, 1);
    const built = buildRoomScene(new PIXI.Container(), [bookcase, plant], handlers);

    // Adding must give exactly the depths a scene built with both items would have.
    scene.addItem(plant);
    expect(zOf(scene, 2)).toBe(zOf(built, 2));
    expect(zOf(scene, 1)).toBe(zOf(built, 1));
    expect(zOf(scene, 1)).toBeGreaterThan(zOf(scene, 2));

    scene.removeItem(2);
    expect(zOf(scene, 1)).toBe(bookcaseBase);
  });
});
