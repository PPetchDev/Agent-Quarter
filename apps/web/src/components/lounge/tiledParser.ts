import type { RoomObject } from './roomDefs';
import { FURNITURE_CATALOG } from './furnitureCatalog';

// ─── Tiled JSON types (comprehensive — covers both pixel-based and property-based formats) ───

export interface TiledProperty {
  name: string;
  type?: 'float' | 'int' | 'string' | 'bool';
  value: number | string | boolean;
}

export interface TiledObject {
  id: number;
  name: string;
  type: string;
  visible?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  properties?: TiledProperty[];
}

export interface TiledLayer {
  id?: number;
  name: string;
  type: 'tilelayer' | 'objectgroup';
  visible?: boolean;
  data?: number[];
  objects?: TiledObject[];
}

export interface TiledMap {
  version?: string;
  name?: string;
  orientation?: string;
  width?: number;
  height?: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
}

// ─── Format detection ──────────────────────────────────────────────────────

/**
 * Detects whether a Tiled JSON uses property-based positioning (wx/wy/wz in custom properties)
 * or pixel-based positioning (x/y coords converted via tilewidth/tileheight).
 *
 * Returns 'properties' if any object has wx/wy in its properties array,
 * 'pixel' otherwise.
 */
export function detectTiledFormat(json: TiledMap): 'properties' | 'pixel' {
  for (const layer of json.layers) {
    if (layer.type !== 'objectgroup' || !layer.objects) continue;
    for (const obj of layer.objects) {
      const props = obj.properties ?? [];
      const hasWx = props.some((p) => p.name === 'wx');
      const hasWy = props.some((p) => p.name === 'wy');
      if (hasWx && hasWy) return 'properties';
    }
  }
  return 'pixel';
}

// ─── Property helpers ──────────────────────────────────────────────────────

function getProp<T>(props: TiledProperty[], name: string, fallback: T): T {
  const p = props.find((x) => x.name === name);
  return p !== undefined ? (p.value as T) : fallback;
}

// ─── Parsing: property-based format (wx/wy/wz in custom properties) ────────

function parsePropertiesFormat(json: TiledMap): RoomObject[] {
  const result: RoomObject[] = [];
  for (const layer of json.layers) {
    if (layer.type !== 'objectgroup' || !layer.objects) continue;
    for (const obj of layer.objects) {
      if (obj.visible === false) continue;
      const props = obj.properties ?? [];
      result.push({
        id: obj.id,
        furnitureType: obj.name,
        label: getProp<string>(props, 'label', obj.name),
        description: getProp<string>(props, 'description', ''),
        wx: getProp<number>(props, 'wx', 0),
        wy: getProp<number>(props, 'wy', 0),
        wz: getProp<number>(props, 'wz', 0),
        happiness: getProp<number>(props, 'happiness', 0),
        draggable: getProp<boolean>(props, 'draggable', false),
      });
    }
  }
  return result;
}

// ─── Parsing: pixel-based format (x/y → grid coords via tilewidth/tileheight) ─

/** Maps Tiled object type strings to furniture type identifiers. */
function mapTiledTypeToFurniture(tiledType: string): string | null {
  const typeMap: Record<string, string> = {
    computer_desk: 'computer_desk',
    bed: 'bed',
    low_table: 'low_table',
    bookcase: 'bookcase',
    printer: 'printer',
    document_board: 'document_board',
    sofa: 'sofa',
    rug: 'rug',
    plant: 'plant',
    lamp: 'lamp',
  };
  return typeMap[tiledType] ?? null;
}

function parsePixelFormat(json: TiledMap): RoomObject[] {
  const roomObjects: RoomObject[] = [];

  for (const layer of json.layers) {
    if (layer.type !== 'objectgroup' || !layer.objects) continue;
    for (const obj of layer.objects) {
      const furnitureType = mapTiledTypeToFurniture(obj.type);
      if (!furnitureType) continue;

      const catalogItem = FURNITURE_CATALOG.find((item) => item.type === furnitureType);
      if (!catalogItem) continue;

      const props = obj.properties?.reduce(
        (acc, p) => ({ ...acc, [p.name]: p.value }),
        {} as Record<string, unknown>,
      ) ?? {};

      const ox = obj.x ?? 0;
      const oy = obj.y ?? 0;

      roomObjects.push({
        id: obj.id,
        furnitureType,
        label: catalogItem.label,
        description: catalogItem.description,
        wx: Math.floor(ox / json.tilewidth),
        wy: Math.floor(oy / json.tileheight),
        wz: (props.floor as number) ?? 0,
        happiness: catalogItem.happiness ?? 0,
        draggable: true,
      });
    }
  }

  return roomObjects;
}

// ─── Unified parse (auto-detect) ───────────────────────────────────────────

/**
 * Parses a Tiled Editor JSON export and converts it to RoomObject[] format.
 * Auto-detects whether the map uses property-based positioning (wx/wy/wz)
 * or pixel-based positioning (x/y coords converted via tilewidth/tileheight).
 */
export function parseTiledMap(json: TiledMap): RoomObject[] {
  const format = detectTiledFormat(json);
  if (format === 'properties') {
    return parsePropertiesFormat(json);
  }
  return parsePixelFormat(json);
}

// ─── Validation ────────────────────────────────────────────────────────────

/**
 * Validates that a Tiled JSON export has the required structure.
 */
export function validateTiledMap(json: unknown): json is TiledMap {
  if (typeof json !== 'object' || json === null) return false;

  const map = json as Record<string, unknown>;
  return (
    typeof map.tilewidth === 'number' &&
    typeof map.tileheight === 'number' &&
    Array.isArray(map.layers)
  );
}