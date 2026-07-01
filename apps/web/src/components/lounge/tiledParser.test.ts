import { describe, it, expect } from 'vitest';
import { parseTiledMap, validateTiledMap, type TiledMap } from './tiledParser';

describe('tiledParser', () => {
  describe('validateTiledMap', () => {
    it('should validate a correct Tiled JSON structure', () => {
      const validMap: TiledMap = {
        width: 20,
        height: 15,
        tilewidth: 32,
        tileheight: 32,
        layers: [],
      };
      expect(validateTiledMap(validMap)).toBe(true);
    });

    it('should reject invalid structures', () => {
      expect(validateTiledMap(null)).toBe(false);
      expect(validateTiledMap({})).toBe(false);
      expect(validateTiledMap({ width: 20 })).toBe(false);
    });
  });

  describe('parseTiledMap', () => {
    it('should parse objectgroup layers into RoomObjects', () => {
      const tiledMap: TiledMap = {
        width: 20,
        height: 15,
        tilewidth: 32,
        tileheight: 32,
        layers: [
          {
            name: 'furniture',
            type: 'objectgroup',
            objects: [
              {
                id: 1,
                name: 'Desk 1',
                type: 'computer_desk',
                x: 96,
                y: 128,
                width: 96,
                height: 64,
                properties: [],
              },
            ],
          },
        ],
      };

      const result = parseTiledMap(tiledMap);
      expect(result).toHaveLength(1);
      expect(result[0].furnitureType).toBe('computer_desk');
      expect(result[0].wx).toBe(3); // 96 / 32
      expect(result[0].wy).toBe(4); // 128 / 32
    });

    it('should skip unknown furniture types', () => {
      const tiledMap: TiledMap = {
        width: 20,
        height: 15,
        tilewidth: 32,
        tileheight: 32,
        layers: [
          {
            name: 'furniture',
            type: 'objectgroup',
            objects: [
              {
                id: 1,
                name: 'Unknown',
                type: 'unknown_type',
                x: 96,
                y: 128,
                width: 32,
                height: 32,
                properties: [],
              },
            ],
          },
        ],
      };

      const result = parseTiledMap(tiledMap);
      expect(result).toHaveLength(0);
    });

    it('should handle floor property', () => {
      const tiledMap: TiledMap = {
        width: 20,
        height: 15,
        tilewidth: 32,
        tileheight: 32,
        layers: [
          {
            name: 'furniture',
            type: 'objectgroup',
            objects: [
              {
                id: 1,
                name: 'Bed',
                type: 'bed',
                x: 96,
                y: 128,
                width: 128,
                height: 160,
                properties: [{ name: 'floor', value: 1 }],
              },
            ],
          },
        ],
      };

      const result = parseTiledMap(tiledMap);
      expect(result[0].wz).toBe(1);
    });

    it('should handle tilelayer layers (ignored)', () => {
      const tiledMap: TiledMap = {
        width: 20,
        height: 15,
        tilewidth: 32,
        tileheight: 32,
        layers: [
          {
            name: 'tiles',
            type: 'tilelayer',
            data: [1, 2, 3],
          },
        ],
      };

      const result = parseTiledMap(tiledMap);
      expect(result).toHaveLength(0);
    });
  });
});
