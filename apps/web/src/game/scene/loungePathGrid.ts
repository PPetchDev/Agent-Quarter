import type { RoomObject } from "../../components/lounge/roomDefs";
import { FURNITURE_TILES } from "../../components/lounge/roomDefs";
import type { IsoWorldPoint } from "../agents/agentTypes";
import type { GridCell, IsoRoutePoint } from "../movement/gridPath";
import { isCellInBounds, planIsoGridPath } from "../movement/gridPath";

export type LoungeGridRouteParams = {
  objects: RoomObject[];
  roomWidth: number;
  roomHeight: number;
  start: IsoWorldPoint;
  target: IsoWorldPoint;
};

export function buildLoungeBlockedCells(
  objects: RoomObject[],
  roomWidth: number,
  roomHeight: number,
): GridCell[] {
  const blocked: GridCell[] = [];

  for (const obj of objects) {
    if (!isFloorBlockingObject(obj)) continue;

    const footprint = FURNITURE_TILES[obj.furnitureType] ?? { w: 1, d: 1 };
    const originX = Math.round(obj.wx);
    const originY = Math.round(obj.wy);

    for (let dx = 0; dx < footprint.w; dx++) {
      for (let dy = 0; dy < footprint.d; dy++) {
        const cell = { x: originX + dx, y: originY + dy };
        if (isCellInBounds(cell, roomWidth, roomHeight)) {
          blocked.push(cell);
        }
      }
    }
  }

  return blocked;
}

export function planLoungeGridRoute(params: LoungeGridRouteParams): IsoRoutePoint[] | null {
  return planIsoGridPath({
    cols: params.roomWidth,
    rows: params.roomHeight,
    start: params.start,
    target: params.target,
    blockedCells: buildLoungeBlockedCells(
      params.objects,
      params.roomWidth,
      params.roomHeight,
    ),
  });
}

function isFloorBlockingObject(obj: RoomObject): boolean {
  return obj.wz < 1.5;
}
