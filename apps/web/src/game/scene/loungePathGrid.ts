import type { RoomObject } from '../../components/lounge/roomDefs';
import { FURNITURE_TILES, footprintFor } from '../../components/lounge/roomDefs';
import type { IsoWorldPoint } from '../agents/agentTypes';
import type { GridCell, IsoRoutePoint } from '../movement/gridPath';
import { isCellInBounds, planIsoGridPath } from '../movement/gridPath';

export type LoungeGridRouteParams = {
  objects: RoomObject[];
  routeGrid?: LoungeRouteGrid;
  roomWidth: number;
  roomHeight: number;
  start: IsoWorldPoint;
  target: IsoWorldPoint;
};

export type LoungeRouteGrid = {
  roomWidth: number;
  roomHeight: number;
  blockedCells: GridCell[];
};

export function buildLoungeBlockedCells(
  objects: RoomObject[],
  roomWidth: number,
  roomHeight: number,
): GridCell[] {
  const blocked: GridCell[] = [];

  for (const obj of objects) {
    if (!isFloorBlockingObject(obj)) continue;

    const footprint = footprintFor(obj.furnitureType, obj.rotation);
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

export function buildLoungeRouteGrid(
  objects: RoomObject[],
  roomWidth: number,
  roomHeight: number,
): LoungeRouteGrid {
  return {
    roomWidth,
    roomHeight,
    blockedCells: buildLoungeBlockedCells(objects, roomWidth, roomHeight),
  };
}

export function planLoungeGridRoute(params: LoungeGridRouteParams): IsoRoutePoint[] | null {
  const routeGrid =
    params.routeGrid ?? buildLoungeRouteGrid(params.objects, params.roomWidth, params.roomHeight);

  return planIsoGridPath({
    cols: routeGrid.roomWidth,
    rows: routeGrid.roomHeight,
    start: params.start,
    target: params.target,
    blockedCells: routeGrid.blockedCells,
  });
}

function isFloorBlockingObject(obj: RoomObject): boolean {
  return obj.wz < 1.5;
}
