import type { IsoWorldPoint } from "../agents/agentTypes";

export type GridCell = {
  x: number;
  y: number;
};

export type IsoRoutePoint = IsoWorldPoint & {
  cell: GridCell;
};

export type GridPathOptions = {
  cols: number;
  rows: number;
  start: IsoWorldPoint;
  target: IsoWorldPoint;
  blockedCells: Iterable<GridCell>;
  waypointZ?: number;
};

export function cellKey(cell: GridCell): string {
  return `${cell.x},${cell.y}`;
}

export function isoToGridCell(
  point: IsoWorldPoint,
  cols: number,
  rows: number,
): GridCell {
  return {
    x: Math.max(0, Math.min(cols - 1, Math.floor(point.wx))),
    y: Math.max(0, Math.min(rows - 1, Math.floor(point.wy))),
  };
}

export function cellCenterToIso(
  cell: GridCell,
  wz = 0.2,
): IsoWorldPoint {
  return {
    wx: cell.x + 0.5,
    wy: cell.y + 0.5,
    wz,
  };
}

export function isCellInBounds(
  cell: GridCell,
  cols: number,
  rows: number,
): boolean {
  return cell.x >= 0 && cell.y >= 0 && cell.x < cols && cell.y < rows;
}

export function normalizeBlockedCells(
  blockedCells: Iterable<GridCell>,
  cols: number,
  rows: number,
): Set<string> {
  const blocked = new Set<string>();
  for (const cell of blockedCells) {
    if (isCellInBounds(cell, cols, rows)) {
      blocked.add(cellKey(cell));
    }
  }
  return blocked;
}

export function findNearestWalkableCell(params: {
  cell: GridCell;
  cols: number;
  rows: number;
  blocked: Set<string>;
}): GridCell | null {
  const { cell, cols, rows, blocked } = params;
  if (!isCellInBounds(cell, cols, rows)) return null;
  if (!blocked.has(cellKey(cell))) return cell;

  const seen = new Set<string>([cellKey(cell)]);
  const queue: GridCell[] = [cell];

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]!;
    for (const next of getNeighbors(current, cols, rows)) {
      const key = cellKey(next);
      if (seen.has(key)) continue;
      if (!blocked.has(key)) return next;
      seen.add(key);
      queue.push(next);
    }
  }

  return null;
}

export function findGridPath(params: {
  cols: number;
  rows: number;
  start: GridCell;
  target: GridCell;
  blocked: Set<string>;
}): GridCell[] | null {
  const { cols, rows, start, target, blocked } = params;
  const startKey = cellKey(start);
  const targetKey = cellKey(target);

  if (!isCellInBounds(start, cols, rows) || !isCellInBounds(target, cols, rows)) {
    return null;
  }
  if (blocked.has(startKey) || blocked.has(targetKey)) {
    return null;
  }
  if (startKey === targetKey) {
    return [start];
  }

  const queue: GridCell[] = [start];
  const cameFrom = new Map<string, string | null>([[startKey, null]]);
  const cells = new Map<string, GridCell>([[startKey, start]]);

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]!;
    for (const next of getNeighbors(current, cols, rows)) {
      const key = cellKey(next);
      if (blocked.has(key) || cameFrom.has(key)) continue;

      cameFrom.set(key, cellKey(current));
      cells.set(key, next);

      if (key === targetKey) {
        return rebuildPath(targetKey, cameFrom, cells);
      }

      queue.push(next);
    }
  }

  return null;
}

export function planIsoGridPath(options: GridPathOptions): IsoRoutePoint[] | null {
  const { cols, rows, start, target, waypointZ = 0.2 } = options;
  const blocked = normalizeBlockedCells(options.blockedCells, cols, rows);
  const rawStart = isoToGridCell(start, cols, rows);
  const rawTarget = isoToGridCell(target, cols, rows);
  const startCell = findNearestWalkableCell({ cell: rawStart, cols, rows, blocked });
  const targetCell = findNearestWalkableCell({ cell: rawTarget, cols, rows, blocked });

  if (!startCell || !targetCell) return null;

  const cells = findGridPath({
    cols,
    rows,
    start: startCell,
    target: targetCell,
    blocked,
  });

  if (!cells) return null;

  const targetWasWalkable = cellKey(rawTarget) === cellKey(targetCell);
  const routeCells = cells.slice(1);
  const route = routeCells.map((cell, index): IsoRoutePoint => {
    const isFinal = index === routeCells.length - 1;
    const iso = isFinal && targetWasWalkable
      ? target
      : cellCenterToIso(cell, waypointZ);
    return { ...iso, cell };
  });

  if (route.length === 0) {
    const iso = targetWasWalkable ? target : cellCenterToIso(targetCell, waypointZ);
    return [{ ...iso, cell: targetCell }];
  }

  return route;
}

function getNeighbors(cell: GridCell, cols: number, rows: number): GridCell[] {
  const candidates = [
    { x: cell.x + 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
    { x: cell.x - 1, y: cell.y },
    { x: cell.x, y: cell.y - 1 },
  ];
  return candidates.filter((next) => isCellInBounds(next, cols, rows));
}

function rebuildPath(
  targetKey: string,
  cameFrom: Map<string, string | null>,
  cells: Map<string, GridCell>,
): GridCell[] {
  const path: GridCell[] = [];
  let currentKey: string | null = targetKey;

  while (currentKey !== null) {
    const cell = cells.get(currentKey);
    if (cell) path.push(cell);
    currentKey = cameFrom.get(currentKey) ?? null;
  }

  return path.reverse();
}
