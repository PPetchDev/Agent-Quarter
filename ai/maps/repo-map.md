# Repo Map

_Updated: C-FURNITURE-GRID-001_

## Monorepo Layout

```txt
AnimeAgentSquad/
├── apps/
│   ├── api/                      # NestJS backend
│   └── web/                      # Next.js frontend
│       ├── public/maps/
│       │   └── maple_hideout.json # Active initial role-aligned lounge furniture layout
│       ├── src/app/
│       │   ├── lounge/page.tsx    # Canonical simulation route
│       │   ├── office/page.tsx    # Redirects to /lounge
│       │   ├── projects/page.tsx
│       │   └── stages/page.tsx
│       ├── src/components/
│       │   ├── lounge/            # Canonical lounge rendering layer
│       │   ├── stages/
│       │   └── TopBar.tsx
│       ├── src/game/
│       │   ├── agents/
│       │   ├── animation/
│       │   ├── isometric/
│       │   ├── movement/          # Direction, linear segment movement, grid pathfinding
│       │   └── scene/             # Lounge stations and furniture-blocked path grid
│       ├── src/hooks/useAgentWalk.ts
│       └── tsconfig.json
└── packages/
    └── core/
```

## Canonical Simulation Source Of Truth

- Route: `apps/web/src/app/lounge/page.tsx`
- Legacy route: `apps/web/src/app/office/page.tsx` redirects to `/lounge`
- Room footprint, projection, walls, floor, rug, fallback furniture, and grid-filled primitive furniture drawings: `apps/web/src/components/lounge/pixiRoom.ts`
- Active initial role-aligned furniture map: `apps/web/public/maps/maple_hideout.json`
- Furniture dimensions and collision footprints, including `computer_desk`, `printer`, and `document_board`: `apps/web/src/components/lounge/roomDefs.ts`
- Furniture shop catalog: `apps/web/src/components/lounge/furnitureCatalog.ts`
- Renderer integration, HUD, and edit-mode route overlay: `apps/web/src/components/lounge/LoungeCanvas.tsx`
- Station registry: `apps/web/src/game/scene/loungeStations.ts`
- Static furniture collision grid: `apps/web/src/game/scene/loungePathGrid.ts`
- Task resolver: `apps/web/src/game/agents/taskResolver.ts`
- Pure grid planner: `apps/web/src/game/movement/gridPath.ts`
- Segment movement helper: `apps/web/src/game/movement/moveToTarget.ts`
- Movement hook, route waypoint runner, route debug data, and active route refresh: `apps/web/src/hooks/useAgentWalk.ts`

## Removed Duplicate Prototype Paths

- Office component files are absent from `apps/web/src/components/office/`.
- `apps/web/src/game/scene/officeStations.ts` is absent.

## Workflow Files

```txt
ai/
├── active.contract.md
├── active.task.md
├── backlog.md
├── context-packet.md
├── handoff.md
├── changelog.md
├── maps/
└── patches/latest.md
```
