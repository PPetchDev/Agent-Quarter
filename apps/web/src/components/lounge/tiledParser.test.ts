import { describe, it, expect } from 'vitest';
import {
  parseTiledMap,
  validateTiledMap,
  detectTiledFormat,
  type TiledMap,
} from './tiledParser';

describe('tiledParser', () => {
  describe('detectTiledFormat', () => {
    it('should return "properties" when objects have wx/wy', () => {
      const map: TiledMap = {
        tilewidth: 40,
        tileheight: 20,
        layers: [
          {
            name: 'furniture',
            type: 'objectgroup',
            objects: [
              {
                id: 1,
                name: 'computer_desk',
                type: 'furniture',
                properties: [
                  { name: 'wx', value: 5 },
                  { name: 'wy', value: 3 },
                ],
              },
            ],
          },
        ],
      };
      expect(detectTiledFormat(map)).toBe('properties');
    });

    it('should return "pixel" when no objects have wx/wy', () => {
      const map: TiledMap = {
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
                name: 'Test',
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
      expect(detectTiledFormat(map)).toBe('pixel');
    });

    it('should return "pixel" for empty layers', () => {
      const map: TiledMap = {
        tilewidth: 32,
        tileheight: 32,
        layers: [],
      };
      expect(detectTiledFormat(map)).toBe('pixel');
    });
  });

  describe('parseTiledMap — property-based format', () => {
    it('should parse maple_hideout-style objects with wx/wy/wz props', () => {
      const map: TiledMap = {
        version: '1.10',
        name: 'Test Hideout',
        orientation: 'isometric',
        tilewidth: 40,
        tileheight: 20,
        layers: [
          {
            name: 'Furniture',
            type: 'objectgroup',
            objects: [
              {
                id: 1,
                name: 'computer_desk',
                type: 'furniture',
                visible: true,
                x: 0,
                y: 0,
                width: 0,
                height: 0,
                properties: [
                  { name: 'wx', type: 'float', value: 5 },
                  { name: 'wy', type: 'float', value: 3 },
                  { name: 'wz', type: 'float', value: 1 },
                  { name: 'label', type: 'string', value: 'My Desk' },
                  {
                    name: 'description',
                    type: 'string',
                    value: 'A wooden desk',
                  },
                  { name: 'happiness', type: 'int', value: 10 },
                  { name: 'draggable', type: 'bool', value: true },
                ],
              },
            ],
          },
        ],
      };

      const result = parseTiledMap(map);
      expect(result).toHaveLength(1);
      expect(result[0].furnitureType).toBe('computer_desk');
      expect(result[0].label).toBe('My Desk');
      expect(result[0].description).toBe('A wooden desk');
      expect(result[0].wx).toBe(5);
      expect(result[0].wy).toBe(3);
      expect(result[0].wz).toBe(1);
      expect(result[0].happiness).toBe(10);
      expect(result[0].draggable).toBe(true);
    });

    it('should skip invisible objects in property format', () => {
      const map: TiledMap = {
        tilewidth: 40,
        tileheight: 20,
        layers: [
          {
            name: 'Furniture',
            type: 'objectgroup',
            objects: [
              {
                id: 1,
                name: 'printer',
                type: 'furniture',
                visible: false,
                x: 0,
                y: 0,
                width: 0,
                height: 0,
                properties: [
                  { name: 'wx', value: 2 },
                  { name: 'wy', value: 1 },
                ],
              },
            ],
          },
        ],
      };

      const result = parseTiledMap(map);
      expect(result).toHaveLength(0);
    });

    it('should default missing props in property format', () => {
      const map: TiledMap = {
        tilewidth: 40,
        tileheight: 20,
        layers: [
          {
            name: 'Furniture',
            type: 'objectgroup',
            objects: [
              {
                id: 1,
                name: 'plant',
                type: 'furniture',
                visible: true,
                x: 0,
                y: 0,
                width: 0,
                height: 0,
                properties: [
                  { name: 'wx', value: 0 },
                  { name: 'wy', value: 0 },
                  // Intentionally omit label, description, happiness, draggable
                  // to verify defaults
                ],
              },
            ],
          },
        ],
      };

      const result = parseTiledMap(map);
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('plant');
      expect(result[0].wx).toBe(0);
      expect(result[0].wy).toBe(0);
      expect(result[0].wz).toBe(0);
      expect(result[0].happiness).toBe(0);
      expect(result[0].draggable).toBe(false);
    });
  });

  describe('parseTiledMap — pixel-based format', () => {
    it('should parse pixel-coordinate Tiled objects', () => {
      const map: TiledMap = {
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

      const result = parseTiledMap(map);
      expect(result).toHaveLength(1);
      expect(result[0].furnitureType).toBe('computer_desk');
      expect(result[0].wx).toBe(3); // 96/32
      expect(result[0].wy).toBe(4); // 128/32
    });

    it('should skip unknown furniture types in pixel format', () => {
      const map: TiledMap = {
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

      const result = parseTiledMap(map);
      expect(result).toHaveLength(0);
    });

    it('should handle floor property in pixel format', () => {
      const map: TiledMap = {
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

      const result = parseTiledMap(map);
      expect(result[0].wz).toBe(1);
    });
  });

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

    it('should accept minimal valid map (only required fields)', () => {
      const minimalMap: TiledMap = {
        tilewidth: 32,
        tileheight: 32,
        layers: [],
      };
      expect(validateTiledMap(minimalMap)).toBe(true);
    });

    it('should reject invalid structures', () => {
      expect(validateTiledMap(null)).toBe(false);
      expect(validateTiledMap({})).toBe(false);
      expect(validateTiledMap({ width: 20 })).toBe(false);
      expect(validateTiledMap({ tilewidth: 32, tileheight: 32 })).toBe(false);
      expect(validateTiledMap({ layers: [] })).toBe(false);
    });
  });
});