// @vitest-environment jsdom
import type * as PIXI from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { zabutonPalette } from './furnitureCatalog';
import { drawFurnitureObject, isoBox, proj } from './pixiRoom';
import type { RoomObject } from './roomDefs';

/** Graphics stand-in that records every polygon drawn. */
function recorder() {
  const polygons: number[][] = [];
  const g: any = new Proxy(
    {},
    {
      get:
        (_target, prop) =>
        (...args: unknown[]) => {
          if (prop === 'drawPolygon') polygons.push(args[0] as number[]);
          return g;
        },
    },
  );
  return { g: g as PIXI.Graphics, polygons };
}

const zabuton = (rotation: RoomObject['rotation']): RoomObject => ({
  id: 1,
  furnitureType: 'zabuton',
  label: '',
  description: '',
  wx: 2,
  wy: 5,
  wz: 0,
  happiness: 0,
  draggable: true,
  rotation,
  variant: 'blue',
});

function drawnBox(w: number, d: number) {
  const { g, polygons } = recorder();
  const { top, front, side } = zabutonPalette('blue');
  isoBox(g, 2, 5, 0, w, d, 0.18, top, front, side);
  return polygons;
}

describe('drawFurnitureObject rotation', () => {
  it('draws an unrotated zabuton as its 3x1 box', () => {
    const { g, polygons } = recorder();
    drawFurnitureObject(g, zabuton(0));
    expect(polygons).toEqual(drawnBox(3, 1));
  });

  it('draws a quarter-turned zabuton as an axis-aligned box over its rotated 1x3 footprint', () => {
    const { g, polygons } = recorder();
    drawFurnitureObject(g, zabuton(1));
    expect(polygons).toEqual(drawnBox(1, 3));
  });

  it('draws a half-turned zabuton over the same 3x1 footprint', () => {
    const { g, polygons } = recorder();
    drawFurnitureObject(g, zabuton(2));
    expect(polygons).toEqual(drawnBox(3, 1));
  });

  it('leaves the shared projection unrotated afterwards', () => {
    const before = proj(1, 1, 0);
    drawFurnitureObject(recorder().g, zabuton(1));
    expect(proj(1, 1, 0)).toEqual(before);
  });
});
