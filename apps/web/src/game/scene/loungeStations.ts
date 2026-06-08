/**
 * Lounge station registry — isometric room coordinate definitions.
 *
 * All positions use the same world coordinate system as the existing
 * lounge PixiJS rendering:
 *   wx  = world x (column, 0 → left wall)
 *   wy  = world y (row,    0 → front/bottom of room)
 *   wz  = world z (height, 0 = floor level)
 *
 * This file is intentionally PixiJS-free so it can be imported in
 * pure-logic tests without a browser canvas.
 *
 * To convert iso coordinates to screen pixels, call proj(wx, wy, wz)
 * from components/lounge/pixiRoom.ts in client components or hooks.
 */

import type { IsoPoint } from '../isometric/isoProjection';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LoungeStationType =
  | 'computer'
  | 'bookshelf'
  | 'meeting_table'
  | 'whiteboard'
  | 'document_desk'
  | 'printer'
  | 'sofa';

export type LoungeStation = {
  id: string;
  label: string;
  type: LoungeStationType;
  /** Isometric world position of the station object */
  isoPosition: IsoPoint;
  /**
   * Where the agent stands to interact (iso).
   * Convert to screen via proj() at task-assignment time.
   */
  interactionIsoPoint: IsoPoint;
};

export type LoungeStationFurniture = {
  furnitureType: string;
  wx: number;
  wy: number;
  wz: number;
};

type LoungeStationDef = LoungeStation & {
  furnitureType: string;
  interactionOffset: IsoPoint;
};

// ─── Station definitions ──────────────────────────────────────────────────────

const stationDefs = {
  computerDesk: {
    id: 'computerDesk',
    label: 'Computer Workstation',
    type: 'computer' as LoungeStationType,
    isoPosition: { x: 6.0, y: 6.0, z: 0 },
    interactionIsoPoint: { x: 7.45, y: 5.35, z: 0.2 },
    furnitureType: 'computer_desk',
    interactionOffset: { x: 1.45, y: -0.65, z: 0.2 },
  },
  bookshelf: {
    id: 'bookshelf',
    label: 'Bookshelf',
    type: 'bookshelf' as LoungeStationType,
    isoPosition: { x: 1.0, y: 7.0, z: 0 },
    interactionIsoPoint: { x: 3.45, y: 6.25, z: 0.2 },
    furnitureType: 'bookcase',
    interactionOffset: { x: 2.45, y: -0.75, z: 0.2 },
  },
  meetingTable: {
    id: 'meetingTable',
    label: 'Meeting Table',
    type: 'meeting_table' as LoungeStationType,
    isoPosition: { x: 2.0, y: 3.0, z: 0 },
    interactionIsoPoint: { x: 5.45, y: 4.2, z: 0.2 },
    furnitureType: 'low_table',
    interactionOffset: { x: 3.45, y: 1.2, z: 0.2 },
  },
  documentDesk: {
    id: 'documentDesk',
    label: 'Document Board',
    type: 'document_desk' as LoungeStationType,
    isoPosition: { x: 4.0, y: 8.0, z: 2.25 },
    interactionIsoPoint: { x: 4.6, y: 6.45, z: 0.2 },
    furnitureType: 'document_board',
    interactionOffset: { x: 0.6, y: -1.55, z: -2.05 },
  },
  printer: {
    id: 'printer',
    label: 'Printer Station',
    type: 'printer' as LoungeStationType,
    isoPosition: { x: 9.0, y: 5.0, z: 0 },
    interactionIsoPoint: { x: 8.45, y: 5.35, z: 0.2 },
    furnitureType: 'printer',
    interactionOffset: { x: -0.55, y: 0.35, z: 0.2 },
  },
  sofa: {
    id: 'sofa',
    label: 'Rest Nook',
    type: 'sofa' as LoungeStationType,
    isoPosition: { x: 6.0, y: 0.0, z: 0 },
    interactionIsoPoint: { x: 5.45, y: 2.0, z: 0.2 },
    furnitureType: 'bed',
    interactionOffset: { x: -0.55, y: 2.0, z: 0.2 },
  },
} satisfies Record<string, LoungeStationDef>;

export const loungeStations: {
  [K in keyof typeof stationDefs]: (typeof stationDefs)[K];
} = stationDefs;

export type LoungeStationId = keyof typeof stationDefs;

export function resolveLoungeStation(
  stationId: LoungeStationId,
  roomObjects: LoungeStationFurniture[] = [],
): LoungeStation {
  const station = stationDefs[stationId];
  const stationObject = roomObjects.find(
    (object) => object.furnitureType === station.furnitureType,
  );

  if (!stationObject) return station;

  const offset = station.interactionOffset;
  return {
    id: station.id,
    label: station.label,
    type: station.type,
    isoPosition: {
      x: stationObject.wx,
      y: stationObject.wy,
      z: stationObject.wz,
    },
    interactionIsoPoint: {
      x: stationObject.wx + offset.x,
      y: stationObject.wy + offset.y,
      z: stationObject.wz + (offset.z ?? 0),
    },
  };
}

/**
 * Return the interactionIsoPoint for a station.
 * Callers that need screen coordinates should call proj() from
 * components/lounge/pixiRoom.ts directly.
 */
export function getLoungeStationIsoPoint(
  stationId: LoungeStationId,
  roomObjects: LoungeStationFurniture[] = [],
): IsoPoint {
  return resolveLoungeStation(stationId, roomObjects).interactionIsoPoint;
}
