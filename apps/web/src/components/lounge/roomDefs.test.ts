import { describe, expect, it } from 'vitest';
import {
  allowedRotations,
  footprintFor,
  FURNITURE_DIMS,
  FURNITURE_TILES,
  nextRotation,
  normalizeRotation,
  normalizeVariant,
  rotateInLayout,
  type RoomObject,
} from './roomDefs';

const floorGridFilledTypes = [
  'bed',
  'nightstand',
  'computer_desk',
  'printer',
  'tv_stand',
  'bookcase',
  'pool_table',
  'low_table',
  'zabuton',
  'plant',
] as const;

describe('furniture grid footprint dimensions', () => {
  it('keeps floor furniture dimensions aligned with occupied grid tiles', () => {
    for (const type of floorGridFilledTypes) {
      expect(FURNITURE_DIMS[type]?.w).toBe(FURNITURE_TILES[type]?.w);
      expect(FURNITURE_DIMS[type]?.d).toBe(FURNITURE_TILES[type]?.d);
    }
  });
});

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

describe('rotation helpers', () => {
  it('swaps footprint width and depth on odd quarter-turns', () => {
    expect(footprintFor('low_table', 1)).toEqual({ w: 2, d: 3 });
    expect(footprintFor('low_table', 2)).toEqual({ w: 3, d: 2 });
  });

  it('only lets rotatable catalog items turn, and limits the bookcase to two orientations', () => {
    expect(allowedRotations('bed')).toEqual([0]);
    expect(allowedRotations('low_table')).toEqual([0, 1, 2, 3]);
    expect(allowedRotations('bookcase')).toEqual([0, 1]);
  });

  it('normalizes untrusted rotation input to an allowed quarter-turn', () => {
    expect(normalizeRotation('low_table', 5)).toBe(1);
    expect(normalizeRotation('low_table', -1)).toBe(3);
    expect(normalizeRotation('low_table', 1.5)).toBe(0);
    expect(normalizeRotation('low_table', '1')).toBe(0);
    expect(normalizeRotation('bed', 1)).toBe(0);
    expect(normalizeRotation('bookcase', 2)).toBe(0);
  });

  it('keeps only non-empty string variants', () => {
    expect(normalizeVariant('rose')).toBe('rose');
    expect(normalizeVariant('')).toBeUndefined();
    expect(normalizeVariant(3)).toBeUndefined();
  });

  it('cycles through the allowed rotations', () => {
    expect(nextRotation('low_table', 3)).toBe(0);
    expect(nextRotation('bookcase', 1)).toBe(0);
    expect(nextRotation('bed', 0)).toBe(0);
  });
});

describe('rotateInLayout', () => {
  it('rotates to the next quarter-turn without mutating the input layout', () => {
    const layout = [obj({ id: 1, furnitureType: 'low_table', wx: 2, wy: 2 })];
    const next = rotateInLayout(layout, 1, 10, 8);
    expect(next?.[0]).toMatchObject({ rotation: 1, wx: 2, wy: 2 });
    expect(layout[0]?.rotation).toBeUndefined();
  });

  it('nudges the rotated footprint back inside the room', () => {
    // Rotated to 2x3 at wy=6 the table would reach row 8 of an 8-row room.
    const next = rotateInLayout(
      [obj({ id: 1, furnitureType: 'low_table', wx: 0, wy: 6 })],
      1,
      10,
      8,
    );
    expect(next?.[0]).toMatchObject({ rotation: 1, wx: 0, wy: 5 });
  });

  it('refuses a rotation that would collide with other furniture', () => {
    const layout = [
      obj({ id: 1, furnitureType: 'low_table', wx: 0, wy: 0 }),
      obj({ id: 2, furnitureType: 'plant', wx: 1, wy: 2 }),
    ];
    expect(rotateInLayout(layout, 1, 10, 8)).toBeNull();
  });

  it('refuses furniture that cannot rotate', () => {
    expect(rotateInLayout([obj({ id: 1, furnitureType: 'bed' })], 1, 10, 8)).toBeNull();
  });
});
