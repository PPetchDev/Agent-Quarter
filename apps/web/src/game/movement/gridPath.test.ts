import { describe, expect, it } from 'vitest';
import {
  cellKey,
  findNearestWalkableCell,
  normalizeBlockedCells,
  planIsoGridPath,
} from './gridPath';

describe('planIsoGridPath', () => {
  it('routes around blocked cells', () => {
    const blockedCells = [
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ];

    const route = planIsoGridPath({
      cols: 5,
      rows: 5,
      start: { wx: 0.5, wy: 1.5, wz: 0.2 },
      target: { wx: 4.5, wy: 1.5, wz: 0.2 },
      blockedCells,
    });

    expect(route).not.toBeNull();
    const blocked = new Set(blockedCells.map(cellKey));
    for (const point of route ?? []) {
      expect(blocked.has(cellKey(point.cell))).toBe(false);
    }
  });

  it('snaps a blocked target to the nearest walkable cell', () => {
    const route = planIsoGridPath({
      cols: 4,
      rows: 4,
      start: { wx: 0.5, wy: 0.5, wz: 0.2 },
      target: { wx: 2.2, wy: 2.2, wz: 0.2 },
      blockedCells: [{ x: 2, y: 2 }],
    });

    expect(route).not.toBeNull();
    expect(route?.at(-1)?.cell).not.toEqual({ x: 2, y: 2 });
  });

  it('returns null when every cell is blocked', () => {
    const blockedCells = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ];

    const route = planIsoGridPath({
      cols: 2,
      rows: 2,
      start: { wx: 0.2, wy: 0.2, wz: 0.2 },
      target: { wx: 1.2, wy: 1.2, wz: 0.2 },
      blockedCells,
    });

    expect(route).toBeNull();
  });
});

describe('findNearestWalkableCell', () => {
  it('finds an adjacent open cell deterministically', () => {
    const blocked = normalizeBlockedCells([{ x: 1, y: 1 }], 3, 3);
    const nearest = findNearestWalkableCell({
      cell: { x: 1, y: 1 },
      cols: 3,
      rows: 3,
      blocked,
    });

    expect(nearest).toEqual({ x: 2, y: 1 });
  });
});
