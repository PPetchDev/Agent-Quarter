// Tiled Editor compatible types + internal RoomObject model

export interface TiledProperty {
  name: string;
  type: "float" | "int" | "string" | "bool";
  value: number | string | boolean;
}

export interface TiledObject {
  id: number;
  name: string;
  type: string;
  visible: boolean;
  properties: TiledProperty[];
}

export interface TiledLayer {
  id: number;
  name: string;
  type: "objectgroup" | "tilelayer";
  visible: boolean;
  objects?: TiledObject[];
}

export interface TiledMap {
  version: string;
  name: string;
  orientation: string;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
}

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
}

// Approximate bounding box per furniture type (w, d, h in world units)
export const FURNITURE_DIMS: Record<string, { w: number; d: number; h: number }> = {
  bed:            { w: 4.0, d: 5.0, h: 1.55 },
  nightstand:     { w: 1.0, d: 1.0, h: 0.85 },
  tv_stand:       { w: 4.0, d: 0.8, h: 2.95 },
  tv:             { w: 4.0, d: 0.12, h: 2.1 },
  bookcase:       { w: 3.0, d: 0.7, h: 3.6 },
  pool_table:     { w: 4.0, d: 3.0, h: 0.9 },
  low_table:      { w: 3.0, d: 2.0, h: 0.35 },
  zabuton:        { w: 2.8, d: 0.85, h: 0.2 },
  plant:          { w: 0.9, d: 0.8, h: 1.8 },
  hanging_scroll: { w: 2.0, d: 0.05, h: 1.55 },
  wall_shelf:     { w: 3.0, d: 0.05, h: 0.65 },
};

// Tile footprint per furniture type (integer grid cells occupied)
export const FURNITURE_TILES: Record<string, { w: number; d: number }> = {
  bed:            { w: 4, d: 5 },
  nightstand:     { w: 1, d: 1 },
  tv_stand:       { w: 4, d: 1 },
  tv:             { w: 4, d: 1 },
  bookcase:       { w: 3, d: 1 },
  pool_table:     { w: 4, d: 3 },
  low_table:      { w: 3, d: 2 },
  zabuton:        { w: 3, d: 1 },
  plant:          { w: 1, d: 1 },
  hanging_scroll: { w: 2, d: 1 },
  wall_shelf:     { w: 3, d: 1 },
};

/** Returns the set of tile coordinates occupied by an object */
export function getOccupiedTiles(obj: RoomObject): Array<[number, number]> {
  const fp = FURNITURE_TILES[obj.furnitureType] ?? { w: 1, d: 1 };
  const tiles: Array<[number, number]> = [];
  for (let dx = 0; dx < fp.w; dx++) {
    for (let dy = 0; dy < fp.d; dy++) {
      tiles.push([obj.wx + dx, obj.wy + dy]);
    }
  }
  return tiles;
}

/** Check if placing dragId at (nx, ny) would collide with any other object */
export function checkCollision(objects: RoomObject[], dragId: number, nx: number, ny: number): boolean {
  const dragged = objects.find(o => o.id === dragId);
  if (!dragged) return false;
  const fp = FURNITURE_TILES[dragged.furnitureType] ?? { w: 1, d: 1 };
  const others = objects.filter(o => o.id !== dragId && !(o.wz >= 1.5 && dragged.wz < 1.0));
  for (let dx = 0; dx < fp.w; dx++) {
    for (let dy = 0; dy < fp.d; dy++) {
      const tx = nx + dx, ty = ny + dy;
      for (const other of others) {
        for (const [ox, oy] of getOccupiedTiles(other)) {
          if (ox === tx && oy === ty) return true;
        }
      }
    }
  }
  return false;
}

function getProp<T>(props: TiledProperty[], name: string, fallback: T): T {
  const p = props.find((x) => x.name === name);
  return p !== undefined ? (p.value as T) : fallback;
}

export function parseTiledMap(json: TiledMap): RoomObject[] {
  const result: RoomObject[] = [];
  for (const layer of json.layers) {
    if (layer.type !== "objectgroup" || !layer.objects) continue;
    for (const obj of layer.objects) {
      if (!obj.visible) continue;
      result.push({
        id: obj.id,
        furnitureType: obj.name,
        label:       getProp<string>(obj.properties, "label",       obj.name),
        description: getProp<string>(obj.properties, "description", ""),
        wx:          getProp<number>(obj.properties, "wx",          0),
        wy:          getProp<number>(obj.properties, "wy",          0),
        wz:          getProp<number>(obj.properties, "wz",          0),
        happiness:   getProp<number>(obj.properties, "happiness",   0),
        draggable:   getProp<boolean>(obj.properties,"draggable",  false),
      });
    }
  }
  return result;
}
