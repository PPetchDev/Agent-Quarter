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

  it('moved computer desk changes its target; route is best-effort when blocked shifts', () => {
    const movedObjects = roomObjects.map((object) =>
      object.furnitureType === 'computer_desk' ? { ...object, wx: 1, wy: 4 } : object,
    );
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
    if (route === null) {
      expect(
        buildLoungeBlockedCells(movedObjects, roomWidth, roomHeight).some(
          (cell) =>
            cell.x === 2 && cell.y === 3,
        ),
      ).toBe(true);
      return;
    }

    const targetCell = isoToGridCell(resolved.targetIsoPoint, roomWidth, roomHeight);
    const finalCell = route.at(-1)!.cell;
    expect(finalCell).not.toEqual(
      isoToGridCell(defaultResolved.targetIsoPoint, roomWidth, roomHeight),
    );
    expect(
      Math.abs(finalCell.x - targetCell.x) + Math.abs(finalCell.y - targetCell.y),
    ).toBeLessThanOrEqual(1);
  });
});
