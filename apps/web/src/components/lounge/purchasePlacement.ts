import type { RoomObject } from './roomDefs';
import { checkCollision, FURNITURE_TILES } from './roomDefs';

export interface SpawnPoint {
  wx: number;
  wy: number;
  wz: number;
}

export interface PurchasePlacementInput {
  item: {
    type: string;
    label: string;
    description: string;
    happiness: number;
    draggable: boolean;
  };
  existingObjects: RoomObject[];
  defaultSpawn: SpawnPoint;
  roomW: number;
  roomH: number;
}

export function selectPurchasePlacement(input: PurchasePlacementInput): RoomObject | null {
  const { item, existingObjects, defaultSpawn, roomW, roomH } = input;
  const footprint = FURNITURE_TILES[item.type] ?? { w: 1, d: 1 };
  const maxX = Math.max(0, roomW - footprint.w);
  const maxY = Math.max(0, roomH - footprint.d);

  const tryPlace = (wx: number, wy: number): RoomObject | null => {
    const candidate: RoomObject = {
      id: -1,
      furnitureType: item.type,
      label: item.label,
      description: item.description,
      wx,
      wy,
      wz: defaultSpawn.wz,
      happiness: item.happiness,
      draggable: item.draggable,
    };
    const colliding = checkCollision(
      [...existingObjects, candidate],
      candidate.id,
      candidate.wx,
      candidate.wy,
    );
    return colliding ? null : candidate;
  };

  const clampedSpawnX = Math.max(0, Math.min(maxX, Math.round(defaultSpawn.wx)));
  const clampedSpawnY = Math.max(0, Math.min(maxY, Math.round(defaultSpawn.wy)));

  let placed = tryPlace(clampedSpawnX, clampedSpawnY);
  if (placed) return placed;

  const wallItem = defaultSpawn.wz >= 1.5;
  const scanYStart = wallItem ? maxY : 0;
  const scanYEnd = wallItem ? maxY : maxY;

  for (let y = scanYStart; y <= scanYEnd && !placed; y++) {
    for (let x = 0; x <= maxX; x++) {
      placed = tryPlace(x, y);
      if (placed) break;
    }
  }

  return placed;
}
