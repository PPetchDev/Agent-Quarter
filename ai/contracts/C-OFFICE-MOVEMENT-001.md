# C-OFFICE-MOVEMENT-001 — Agent Movement System

## Type
IMPLEMENTATION PROPOSAL (from C-GAME-RESEARCH-001)

## Status
REDUNDANT (2026-06-19) — All proposed functionality already implemented under other contracts:

| Proposal | Built As | Contract |
|---|---|---|
| GridMap + officeLayout | `gridPath.ts` + `loungePathGrid.ts` | C-AGENT-PATH-001/002 |
| A* Pathfinding | BFS `findGridPath()` | C-AGENT-PATH-001 |
| MovementSystem | `moveToTarget.ts` + `useAgentWalk.ts` | C-AGENT-ISO-001 |
| LoungeCanvas Integration | `useAgentWalk` hook | C-AGENT-LIFECYCLE-001 |
| IsoSorting | `roomLoader.ts` sortableChildren | C-LOUNGE-001 |
| Tests | `gridPath.test.ts` (4 tests) | C-AGENT-PATH-001 |

All grid pathfinding, movement, and Spine integration already exists. No new implementation needed.

## Goal
Add grid-based pathfinding and movement to office agents in the LoungeCanvas.

---

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  OfficeCommand    │     │  Pathfinding      │     │  MovementSystem  │
│  ("move to desk") │────▶│  (A* on grid)     │────▶│  (lerp + Spine)  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                    │
                           ┌────────▼────────┐
                           │  GridMap         │
                           │  (blocked tiles) │
                           └─────────────────┘
```

---

## Components

### 1. GridMap

```typescript
// Proposed: apps/web/src/game/grid/GridMap.ts
interface GridCell {
  x: number;
  y: number;
  walkable: boolean;
  occupiedBy?: string; // agentId
}

interface FurnitureFootprint {
  id: string;
  x: number;
  y: number;
  width: number;  // in grid cells
  height: number; // in grid cells
}

class GridMap {
  cells: GridCell[][];
  furniture: Map<string, FurnitureFootprint>;

  isWalkable(x: number, y: number): boolean;
  setOccupied(x: number, y: number, agentId: string | null): void;
  getNeighbors(x: number, y: number): GridCell[]; // 8-directional
}
```

### 2. Pathfinding (A*)

```typescript
// Proposed: apps/web/src/game/pathfinding/astar.ts
interface PathNode {
  x: number;
  y: number;
  g: number; // cost from start
  h: number; // heuristic (octile distance for isometric)
  f: number; // g + h
  parent?: PathNode;
}

function findPath(
  grid: GridMap,
  start: { x: number; y: number },
  end: { x: number; y: number }
): { x: number; y: number }[];
```

**Heuristic**: Octile distance (suitable for 8-directional grid)

```
h = max(|dx|, |dy|) + (√2 - 1) * min(|dx|, |dy|)
```

**Constraints**:
- Skip occupied cells (other agents)
- Skip furniture footprint cells
- Max path length: 50 steps (prevents infinite search)

### 3. Movement System

```typescript
// Proposed: apps/web/src/game/movement/MovementSystem.ts
type MoveState = 'idle' | 'moving' | 'arrived';

interface MovementTask {
  agentId: string;
  path: { x: number; y: number }[];
  currentStep: number;
  speed: number; // cells per second
  onArrive: () => void;
  onStep: (x: number, y: number) => void;
}

class MovementSystem {
  active: Map<string, MovementTask>;

  startMove(task: MovementTask): void;
  update(delta: number): void; // called from PixiJS ticker
  cancelMove(agentId: string): void;
}
```

**Movement Animation**:
- Walk: Spine track "walk" animation
- Idle at destination: Spine track "stand"
- Direction: flip sprite based on dx sign

### 4. Agent Integration

```typescript
// In LoungeCanvas or AgentController
function handleMoveCommand(target: string): void {
  const start = gridMap.worldToGrid(agent.sprite.x, agent.sprite.y);
  const end = resolveTarget(target); // e.g., "desk" → desk footprint adjacent cell

  const path = findPath(gridMap, start, end);
  if (path.length === 0) {
    appendOfficeChat("Can't reach that!", "system");
    return;
  }

  movementSystem.startMove({
    agentId: agent.id,
    path,
    currentStep: 0,
    speed: 3, // cells/sec
    onArrive: () => agent.setState('idle'),
    onStep: (x, y) => {
      const world = gridMap.gridToWorld(x, y);
      agent.sprite.x = world.x;
      agent.sprite.y = world.y;
    },
  });
}
```

---

## IsoSorting (Depth Layering)

```typescript
// y-sort all entities by their baseY (feet position) every frame
function sortEntities(entities: Entity[]): Entity[] {
  return entities.sort((a, b) => a.baseY - b.baseY);
}
```

**Reference**: IsoSorting (ECS-based) from killop/anything_about_game
**PixiJS equivalent**: Use `Container.sortableChildren = true` + `sprite.zIndex = baseY`

---

## Furniture Collision Data (Hardcoded MVP)

```typescript
// Proposed: apps/web/src/game/grid/officeLayout.ts
const OFFICE_FURNITURE: FurnitureFootprint[] = [
  { id: 'desk_mai',     x: 3, y: 2, width: 2, height: 1 },
  { id: 'desk_ren',     x: 7, y: 2, width: 2, height: 1 },
  { id: 'desk_aki',     x: 3, y: 6, width: 2, height: 1 },
  { id: 'desk_yuki',    x: 7, y: 6, width: 2, height: 1 },
  { id: 'bookshelf',    x: 0, y: 0, width: 1, height: 3 },
  { id: 'printer',      x: 9, y: 4, width: 1, height: 1 },
];

const GRID_WIDTH = 12;
const GRID_HEIGHT = 10;
```

---

## Implementation Slices

| Slice | Description | Files |
|-------|-------------|-------|
| S1 | GridMap class + officeLayout data | grid/GridMap.ts, grid/officeLayout.ts |
| S2 | A* pathfinding | pathfinding/astar.ts |
| S3 | MovementSystem | movement/MovementSystem.ts |
| S4 | Integrate into LoungeCanvas | LoungeCanvas.tsx |
| S5 | IsoSorting (depth sort) | LoungeCanvas.tsx (sortableChildren) |
| S6 | Tests | GridMap.test.ts, astar.test.ts |

---

## Budget

| Item | Max |
|------|-----|
| New files | 5 |
| Modified files | 1 (LoungeCanvas.tsx) |
| New dependencies | 0 |
| PixiJS version change | None |
| Spine change | None |
| Room layout change | Add furniture data only |
