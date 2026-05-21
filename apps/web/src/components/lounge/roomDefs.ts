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
  bed:            { w: 3.4, d: 5.0, h: 1.55 },
  nightstand:     { w: 1.0, d: 1.0, h: 0.85 },
  tv_stand:       { w: 3.9, d: 0.8, h: 2.95 },
  tv:             { w: 3.5, d: 0.12, h: 2.1 },
  bookcase:       { w: 2.3, d: 0.7, h: 3.6 },
  pool_table:     { w: 3.6, d: 2.3, h: 0.9 },
  low_table:      { w: 3.0, d: 2.0, h: 0.35 },
  zabuton:        { w: 2.8, d: 0.85, h: 0.2 },
  plant:          { w: 0.9, d: 0.8, h: 1.8 },
  hanging_scroll: { w: 1.9, d: 0.05, h: 1.55 },
  wall_shelf:     { w: 2.5, d: 0.05, h: 0.65 },
};

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
