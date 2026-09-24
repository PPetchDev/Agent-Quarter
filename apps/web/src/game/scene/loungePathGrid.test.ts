import { describe, expect, it } from 'vitest';
import mapJson from '../../../public/maps/maple_hideout.json';
import { parseTiledMap, type RoomObject, type TiledMap } from '../../components/lounge/roomDefs';
import { resolveAgentTask } from '../agents/taskResolver';
import type { AgentTaskType } from '../agents/agentTypes';
import { cellKey, isoToGridCell } from '../movement/gridPath';
import {
  buildLoungeBlockedCells,
  buildLoungeRouteGrid,
  planLoungeGridRoute,
} from './loungePathGrid';

const roomWidth = 10;
const roomHeight = 8;
const defaultStart = { wx: 3.0, wy: 0.65, wz: 0.2 };
const roomObjects = parseTiledMap(mapJson as TiledMap);
/** Zabuton at (2,5) that the default map rotates a quarter-turn (1x3 footprint). */
const ROTATED_ZABUTON_ID = 11;

describe('role-aligned lounge map', () => {
  it('uses semantic furniture for agent task stations', () => {
    const furnitureTypes = roomObjects.map((object) => object.furnitureType);

    expect(furnitureTypes).toEqual(
      expect.arrayContaining(['computer_desk', 'printer', 'document_board']),
    );
    expect(furnitureTypes).not.toEqual(expect.arrayContaining(['tv_stand', 'tv']));
  });
});

describe('buildLoungeBlockedCells', () => {
  it('blocks floor furniture footprints and ignores wall-mounted objects', () => {
    const blocked = new Set(
      buildLoungeBlockedCells(roomObjects, roomWidth, roomHeight).map(cellKey),
    );

    expect(blocked.has(cellKey({ x: 6, y: 0 }))).toBe(true);
    expect(blocked.has(cellKey({ x: 2, y: 3 }))).toBe(true);
    expect(blocked.has(cellKey({ x: 7, y: 6 }))).toBe(true);
    expect(blocked.has(cellKey({ x: 7, y: 7 }))).toBe(true);
    expect(blocked.has(cellKey({ x: 4, y: 7 }))).toBe(false);
    expect(blocked.has(cellKey({ x: 8, y: 5 }))).toBe(false);
    expect(blocked.has(cellKey({ x: 9, y: 5 }))).toBe(true);
  });
});

describe('buildLoungeRouteGrid', () => {
  it('reuses a precomputed blocked-cell grid for route planning', () => {
    const routeGrid = buildLoungeRouteGrid(roomObjects, roomWidth, roomHeight);
    const resolved = resolveAgentTask('code', roomObjects);
    const route = planLoungeGridRoute({
      objects: [],
      routeGrid,
      roomWidth,
      roomHeight,
      start: defaultStart,
      target: resolved.targetIsoPoint,
    });
    const blocked = new Set(routeGrid.blockedCells.map(cellKey));

    expect(routeGrid.blockedCells.length).toBeGreaterThan(0);
    expect(route).not.toBeNull();
    for (const point of route ?? []) {
      expect(blocked.has(cellKey(point.cell))).toBe(false);
    }
    expect(route?.at(-1)?.cell).toEqual(
      isoToGridCell(resolved.targetIsoPoint, roomWidth, roomHeight),
    );
  });
});

describe('planLoungeGridRoute', () => {
  it.each(['code', 'research', 'meeting', 'document', 'print', 'rest'] satisfies AgentTaskType[])(
    'routes from the default start to %s',
    (task) => {
      const resolved = resolveAgentTask(task, roomObjects);
      const route = planLoungeGridRoute({
        objects: roomObjects,
        roomWidth,
        roomHeight,
        start: defaultStart,
        target: resolved.targetIsoPoint,
      });
      const blocked = new Set(
        buildLoungeBlockedCells(roomObjects, roomWidth, roomHeight).map(cellKey),
      );

      expect(route).not.toBeNull();
      expect(route?.length).toBeGreaterThan(0);
      for (const point of route ?? []) {
        expect(blocked.has(cellKey(point.cell))).toBe(false);
      }

      const finalCell = route?.at(-1)?.cell;
      const expectedTargetCell = isoToGridCell(resolved.targetIsoPoint, roomWidth, roomHeight);
      expect(finalCell).toEqual(expectedTargetCell);
    },
  );

  it('replans around a newly committed furniture blocker', () => {
    const resolved = resolveAgentTask('code', roomObjects);
    const initialRoute = planLoungeGridRoute({
      objects: roomObjects,
      roomWidth,
      roomHeight,
      start: defaultStart,
      target: resolved.targetIsoPoint,
    });
    const blockedCell = initialRoute?.[0]?.cell;

    expect(blockedCell).toBeDefined();

    const blocker: RoomObject = {
      id: 9999,
      furnitureType: 'plant',
      label: 'Temporary blocker',
      description: '',
      wx: blockedCell!.x,
      wy: blockedCell!.y,
      wz: 0,
      happiness: 0,
      draggable: true,
    };
    const refreshedRoute = planLoungeGridRoute({
      objects: [...roomObjects, blocker],
      roomWidth,
      roomHeight,
      start: defaultStart,
      target: resolved.targetIsoPoint,
    });

    expect(refreshedRoute).not.toBeNull();
    expect(refreshedRoute?.some((point) => cellKey(point.cell) === cellKey(blockedCell!))).toBe(
      false,
    );
    expect(refreshedRoute?.at(-1)?.cell).toEqual(
      isoToGridCell(resolved.targetIsoPoint, roomWidth, roomHeight),
    );
  });

  it('routes near the moved computer desk instead of the default desk target', () => {
    // Zabuton 11 at (2,5) with rotation 1 seals the pocket around this target (pinned by the
    // next test), so it is turned back to 0 here to test only that the route follows the desk.
    const movedObjects = roomObjects.map((object) => {
      if (object.furnitureType === 'computer_desk') return { ...object, wx: 1, wy: 4 };
      if (object.id === ROTATED_ZABUTON_ID) return { ...object, rotation: 0 as const };
      return object;
    });
    const defaultResolved = resolveAgentTask('code', roomObjects);
    const resolved = resolveAgentTask('code', movedObjects);
    const route = planLoungeGridRoute({
      objects: movedObjects,
      roomWidth,
      roomHeight,
      start: defaultStart,
      target: resolved.targetIsoPoint,
    });

    expect(resolved.targetIsoPoint).toEqual({ wx: 2.45, wy: 3.35, wz: 0.2 });
    expect(resolved.targetIsoPoint).not.toEqual(defaultResolved.targetIsoPoint);
    expect(route).not.toBeNull();

    const targetCell = isoToGridCell(resolved.targetIsoPoint, roomWidth, roomHeight);
    const finalCell = route!.at(-1)!.cell;
    expect(finalCell).not.toEqual(
      isoToGridCell(defaultResolved.targetIsoPoint, roomWidth, roomHeight),
    );
    expect(
      Math.abs(finalCell.x - targetCell.x) + Math.abs(finalCell.y - targetCell.y),
    ).toBeLessThanOrEqual(1);
  });
  it('seals the pocket around the moved-desk target while zabuton 11 is quarter-turned', () => {
    const zabuton = roomObjects.find((object) => object.id === ROTATED_ZABUTON_ID);
    expect(zabuton).toMatchObject({ furnitureType: 'zabuton', wx: 2, wy: 5, rotation: 1 });

    const movedObjects = roomObjects.map((object) =>
      object.furnitureType === 'computer_desk' ? { ...object, wx: 1, wy: 4 } : object,
    );
    const blocked = buildLoungeBlockedCells(movedObjects, roomWidth, roomHeight).map(cellKey);
    expect(blocked).toEqual(expect.arrayContaining(['2,5', '2,6', '2,7']));

    const route = planLoungeGridRoute({
      objects: movedObjects,
      roomWidth,
      roomHeight,
      start: defaultStart,
      target: resolveAgentTask('code', movedObjects).targetIsoPoint,
    });
    expect(route).toBeNull();
  });
});
