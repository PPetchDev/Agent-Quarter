import { describe, expect, it } from 'vitest';
import { footprintFor } from '../../components/lounge/roomDefs';
import { resolveLoungeStation } from './loungeStations';

const bookcase = (rotation: 0 | 1) => ({
  furnitureType: 'bookcase',
  wx: 1,
  wy: 5,
  wz: 0,
  rotation,
});

describe('resolveLoungeStation with rotated furniture', () => {
  it('keeps the unrotated interaction point unchanged', () => {
    expect(resolveLoungeStation('bookshelf', [bookcase(0)]).interactionIsoPoint).toEqual({
      x: 3.45,
      y: 4.25,
      z: 0.2,
    });
  });

  it('moves the interaction point in front of the book face after a quarter-turn', () => {
    const point = resolveLoungeStation('bookshelf', [bookcase(1)]).interactionIsoPoint;
    const fp = footprintFor('bookcase', 1);

    // The spines face +x after one turn: stand just outside x = wx + w, alongside the case.
    expect(point.x).toBeCloseTo(1 + fp.w + 0.75);
    expect(point.y).toBeGreaterThan(5);
    expect(point.y).toBeLessThan(5 + fp.d);
  });
});
