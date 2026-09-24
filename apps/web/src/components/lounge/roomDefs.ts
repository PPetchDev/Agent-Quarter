// Tiled Editor compatible types (re-exported from canonical tiledParser.ts)
export {
  type TiledProperty,
  type TiledObject,
  type TiledLayer,
  type TiledMap,
  parseTiledMap,
  validateTiledMap,
  detectTiledFormat,
} from './tiledParser';

import { getCatalogItem } from './furnitureCatalog';

/** 90° quarter-turn rotation: 0 = default, 1 = 90°, 2 = 180°, 3 = 270°. */
export type Rotation = 0 | 1 | 2 | 3;

// Internal model used by PixiJS renderer
export interface RoomObject {
  id: number;
  furnitureType: string;
  label: string;
  description: string;
  wx: number;
  wy: number;
  wz: number;
  happiness: number;
  draggable: boolean;
  /** Optional quarter-turn rotation. Absent = 0 (no rotation). */
  rotation?: Rotation;
  /** Optional variant tag for visually distinguishing duplicates (e.g. zabuton colors). */
  variant?: string;
}

// Approximate bounding box per furniture type (w, d, h in world units)
export const FURNITURE_DIMS: Record<string, { w: number; d: number; h: number }> = {
  bed: { w: 4.0, d: 5.0, h: 1.55 },
  nightstand: { w: 1.0, d: 1.0, h: 0.85 },
  computer_desk: { w: 3.0, d: 2.0, h: 2.35 },
  printer: { w: 1.0, d: 1.0, h: 1.25 },
  document_board: { w: 3.0, d: 0.05, h: 1.6 },
  tv_stand: { w: 4.0, d: 1.0, h: 2.95 },
  tv: { w: 4.0, d: 0.12, h: 2.1 },
  bookcase: { w: 3.0, d: 1.0, h: 3.6 },
  pool_table: { w: 4.0, d: 3.0, h: 0.9 },
  low_table: { w: 3.0, d: 2.0, h: 0.35 },
  zabuton: { w: 3.0, d: 1.0, h: 0.2 },
  plant: { w: 1.0, d: 1.0, h: 1.8 },
  hanging_scroll: { w: 2.0, d: 0.05, h: 1.55 },
  wall_shelf: { w: 3.0, d: 0.05, h: 0.65 },
};

// Tile footprint per furniture type (integer grid cells occupied)
export const FURNITURE_TILES: Record<string, { w: number; d: number }> = {
  bed: { w: 4, d: 5 },
  nightstand: { w: 1, d: 1 },
  computer_desk: { w: 3, d: 2 },
  printer: { w: 1, d: 1 },
  document_board: { w: 3, d: 1 },
  tv_stand: { w: 4, d: 1 },
  tv: { w: 4, d: 1 },
  bookcase: { w: 3, d: 1 },
  pool_table: { w: 4, d: 3 },
  low_table: { w: 3, d: 2 },
  zabuton: { w: 3, d: 1 },
  plant: { w: 1, d: 1 },
  hanging_scroll: { w: 2, d: 1 },
  wall_shelf: { w: 3, d: 1 },
};

/**
 * Tile footprint after applying rotation. Odd quarter-turns (90°/270°) swap
 * width and depth; even turns leave the footprint unchanged.
 */
export function footprintFor(type: string, rotation: Rotation = 0): { w: number; d: number } {
  const fp = FURNITURE_TILES[type] ?? { w: 1, d: 1 };
  return rotation % 2 === 1 ? { w: fp.d, d: fp.w } : { w: fp.w, d: fp.d };
}

/** Returns the set of tile coordinates occupied by an object */
export function getOccupiedTiles(obj: RoomObject): Array<[number, number]> {
  const fp = footprintFor(obj.furnitureType, obj.rotation);
  const tiles: Array<[number, number]> = [];
  for (let dx = 0; dx < fp.w; dx++) {
    for (let dy = 0; dy < fp.d; dy++) {
      tiles.push([obj.wx + dx, obj.wy + dy]);
    }
  }
  return tiles;
}

/** Check if placing dragId at (nx, ny) would collide with any other object */
export function checkCollision(
  objects: RoomObject[],
  dragId: number,
  nx: number,
  ny: number,
): boolean {
  const dragged = objects.find((o) => o.id === dragId);
  if (!dragged) return false;
  const fp = footprintFor(dragged.furnitureType, dragged.rotation);
  const others = objects.filter((o) => o.id !== dragId && !(o.wz >= 1.5 && dragged.wz < 1.0));
  for (let dx = 0; dx < fp.w; dx++) {
    for (let dy = 0; dy < fp.d; dy++) {
      const tx = nx + dx,
        ty = ny + dy;
      for (const other of others) {
        for (const [ox, oy] of getOccupiedTiles(other)) {
          if (ox === tx && oy === ty) return true;
        }
      }
    }
  }
  return false;
}
// ─── Rotation ─────────────────────────────────────────────────────────────────

const ALL_ROTATIONS: readonly Rotation[] = [0, 1, 2, 3];

/** Quarter-turns a type may take: only [0] unless the catalog marks it rotatable. */
export function allowedRotations(type: string): readonly Rotation[] {
  const item = getCatalogItem(type);
  if (!item?.rotatable) return [0];
  return item.rotations ?? ALL_ROTATIONS;
}

/** Coerces untrusted rotation input (saves, share links, Tiled props) to an allowed quarter-turn. */
export function normalizeRotation(type: string, value: unknown): Rotation {
  if (typeof value !== 'number' || !Number.isInteger(value)) return 0;
  const quarter = (((value % 4) + 4) % 4) as Rotation;
  return allowedRotations(type).includes(quarter) ? quarter : 0;
}

/** Keeps only non-empty string variants. */
export function normalizeVariant(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/** The allowed rotation after `current`, wrapping around. */
export function nextRotation(type: string, current: Rotation = 0): Rotation {
  const allowed = allowedRotations(type);
  return allowed[(allowed.indexOf(current) + 1) % allowed.length] ?? 0;
}

/**
 * Turns object `id` to its next allowed rotation, pivoting on its min corner and
 * nudging it back inside the room. Returns a new layout, or null when the object
 * cannot rotate, does not fit, or would collide with other furniture.
 */
export function rotateInLayout(
  objects: readonly RoomObject[],
  id: number,
  roomW: number,
  roomH: number,
): RoomObject[] | null {
  const target = objects.find((o) => o.id === id);
  if (!target) return null;
  const current = target.rotation ?? 0;
  const rotation = nextRotation(target.furnitureType, current);
  if (rotation === current) return null;
  const fp = footprintFor(target.furnitureType, rotation);
  if (fp.w > roomW || fp.d > roomH) return null;
  const rotated: RoomObject = {
    ...target,
    rotation,
    wx: Math.max(0, Math.min(target.wx, roomW - fp.w)),
    wy: Math.max(0, Math.min(target.wy, roomH - fp.d)),
  };
  const next = objects.map((o) => (o.id === id ? rotated : o));
  return checkCollision(next, id, rotated.wx, rotated.wy) ? null : next;
}
