import { describe, expect, it } from 'vitest';
import { FURNITURE_CATALOG, getDefaultSpawnPosition } from './furnitureCatalog';

describe('furniture catalog smoke', () => {
  it('has unique furniture types', () => {
    const ids = FURNITURE_CATALOG.map((item) => item.type);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes role-aligned station furniture', () => {
    expect(FURNITURE_CATALOG.map((item) => item.type)).toEqual(
      expect.arrayContaining(['computer_desk', 'printer', 'document_board']),
    );
  });

  it('spawns wall items on back wall', () => {
    for (const item of FURNITURE_CATALOG.filter((entry) => entry.category === 'wall')) {
      const pos = getDefaultSpawnPosition(item.type);
      expect(pos.wy).toBeGreaterThanOrEqual(7);
      expect(pos.wz).toBeGreaterThanOrEqual(2);
    }
  });

  it('spawns floor items at floor level', () => {
    for (const item of FURNITURE_CATALOG.filter((entry) => entry.category !== 'wall')) {
      const pos = getDefaultSpawnPosition(item.type);
      expect(pos.wz).toBe(0);
    }
  });

  it('prices every item in coins plus decor tokens', () => {
    for (const item of FURNITURE_CATALOG) {
      expect(item.cost).toBeGreaterThan(0);
      expect(item.tokenCost).toBeGreaterThanOrEqual(1);
      expect(Number.isInteger(item.tokenCost)).toBe(true);
    }
  });
});
