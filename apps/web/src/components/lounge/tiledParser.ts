import type { RoomObject } from './roomDefs';
import { FURNITURE_CATALOG } from './furnitureCatalog';

export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
}

export interface TiledLayer {
  name: string;
  type: 'tilelayer' | 'objectgroup';
  data?: number[];
  objects?: TiledObject[];
}

export interface TiledObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: { name: string; value: string | number }[];
}

/**
 * Parses a Tiled Editor JSON export and converts it to RoomObject[] format.
 * Maps Tiled tile/object layers to furniture types and positions.
 */
export function parseTiledMap(tiledJson: TiledMap): RoomObject[] {
  const roomObjects: RoomObject[] = [];

  for (const layer of tiledJson.layers) {
    if (layer.type === 'objectgroup' && layer.objects) {
      for (const obj of layer.objects) {
        const furnitureType = mapTiledTypeToFurniture(obj.type);
        if (!furnitureType) continue;

        const catalogItem = FURNITURE_CATALOG.find((item) => item.type === furnitureType);
        if (!catalogItem) continue;

        const props = obj.properties?.reduce(
          (acc, p) => ({ ...acc, [p.name]: p.value }),
          {} as Record<string, unknown>,
        ) ?? {};

        roomObjects.push({
          id: obj.id,
          furnitureType,
          label: catalogItem.label,
          description: catalogItem.description,
          wx: Math.floor(obj.x / tiledJson.tilewidth),
          wy: Math.floor(obj.y / tiledJson.tileheight),
          wz: (props.floor as number) ?? 0,
          happiness: catalogItem.happiness ?? 0,
          draggable: true,
        });
      }
    }
  }

  return roomObjects;
}

/**
 * Maps Tiled object type strings to furniture type identifiers.
 * Extend this mapping as new furniture types are added.
 */
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

/**
 * Validates that a Tiled JSON export has the required structure.
 */
export function validateTiledMap(json: unknown): json is TiledMap {
  if (typeof json !== 'object' || json === null) return false;

  const map = json as Record<string, unknown>;
  return (
    typeof map.width === 'number' &&
    typeof map.height === 'number' &&
    typeof map.tilewidth === 'number' &&
    typeof map.tileheight === 'number' &&
    Array.isArray(map.layers)
  );
}
