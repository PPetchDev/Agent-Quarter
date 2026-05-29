# Feature Map

_Updated: C-FURNITURE-GRID-001_

| Feature | Canonical Files |
|---|---|
| Lounge simulation route | `apps/web/src/app/lounge/page.tsx` |
| Legacy office route compatibility | `apps/web/src/app/office/page.tsx` (redirect only) |
| Room footprint, projection, walls, floor, rug, primitive furniture drawings | `apps/web/src/components/lounge/pixiRoom.ts` |
| Active initial role-aligned furniture layout | `apps/web/public/maps/maple_hideout.json` |
| Furniture dimensions and tile footprints | `apps/web/src/components/lounge/roomDefs.ts` |
| Furniture catalog / shop metadata | `apps/web/src/components/lounge/furnitureCatalog.ts` |
| PixiJS scene construction, depth sorting, active-station pulse layer | `apps/web/src/components/lounge/roomLoader.ts` |
| Active station pulse highlight (gold floor ring + per-station body ambient during work) | `apps/web/src/components/lounge/pixiRoom.ts` (`drawActiveStationHighlight`, `drawStationAmbient`), `apps/web/src/components/lounge/stationAmbients.ts` (`STATION_AMBIENTS` data table), `apps/web/src/components/lounge/LoungeCanvas.tsx` (RAF pulse loop) |
| Lounge canvas, compact HUD, route debug overlay, single walking agent overlay | `apps/web/src/components/lounge/LoungeCanvas.tsx` |
| Agent task-to-station resolution + per-task work duration | `apps/web/src/game/agents/taskResolver.ts` |
| Agent work timer lifecycle (walk → work → auto-idle) and progress fields | `apps/web/src/hooks/useAgentWalk.ts`, `apps/web/src/game/agents/agentTypes.ts` |
| Agent task queue (auto-pop chain after work completion, shift-click enqueue) | `apps/web/src/game/agents/taskQueue.ts`, `apps/web/src/hooks/useAgentWalk.ts`, `apps/web/src/components/lounge/LoungeCanvas.tsx` |
| Agent type contracts | `apps/web/src/game/agents/agentTypes.ts` |
| Isometric station registry | `apps/web/src/game/scene/loungeStations.ts` |
| Lounge blocked-cell grid | `apps/web/src/game/scene/loungePathGrid.ts` |
| Isometric projection helpers | `apps/web/src/game/isometric/isoProjection.ts` |
| Movement logic | `apps/web/src/game/movement/direction.ts`, `apps/web/src/game/movement/moveToTarget.ts`, `apps/web/src/game/movement/gridPath.ts` |
| Animation resolver | `apps/web/src/game/animation/animationResolver.ts` |
| Lounge walking integration hook | `apps/web/src/hooks/useAgentWalk.ts` |
| Global navigation | `apps/web/src/components/TopBar.tsx` |

## Functional Zone Mapping

- Code -> computer workstation (`computer_desk`) with monitor, keyboard, and desk notes.
- Read -> bookcase / reading cushion zone.
- Meet -> central low table / rug zone.
- Doc -> wall document board (`document_board`) zone.
- Print -> compact printer (`printer`) utility zone.
- Rest -> bed / rest nook zone.

## Furniture Grid Contract

- Floor furniture dimensions in `FURNITURE_DIMS` should match occupied floor cells in `FURNITURE_TILES`.
- PixiJS furniture drawings in `pixiRoom.ts` should visually fill their grid footprint rather than leaving large unused tile gaps.

## Removed Legacy Prototype Feature

- Standalone flat office simulator files are absent.
- Flat pixel station registry `apps/web/src/game/scene/officeStations.ts` is absent.

## Pathfinding Mapping

- Grid planner -> `apps/web/src/game/movement/gridPath.ts`.
- Furniture blocked cells -> `apps/web/src/game/scene/loungePathGrid.ts`.
- Active furniture inputs -> `LoungeCanvas` passes current `RoomObject[]`, room width, and room height into `useAgentWalk`.
- Waypoint animation -> `useAgentWalk` plans a route at task assignment and advances through projected waypoints with `moveTowardsTarget`.
- Route debug overlay -> `useAgentWalk` exposes route debug points; `LoungeCanvas` renders them only in move/edit mode.
- Dynamic static-obstacle refresh -> `useAgentWalk` re-plans while walking after committed room object or room dimension changes.
