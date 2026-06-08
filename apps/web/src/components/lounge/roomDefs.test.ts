import { describe, expect, it } from 'vitest';
import { FURNITURE_DIMS, FURNITURE_TILES } from './roomDefs';

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
