# Symbol Index

_Updated: C-FURNITURE-GRID-001_

## Lounge Room Layout

| Symbol | Kind | Description |
|---|---|---|
| `ROOM_TILES_X` / `ROOM_TILES_Y` | constants | Canonical lounge footprint dimensions in `pixiRoom.ts` |
| `computeRoomProjection` | function | Calculates canvas scale/origin from room width/depth |
| `setRoomProjection` | function | Applies live projection globals for PixiJS rendering |
| `proj` | function | Projects lounge world coordinates to screen coordinates |
| `drawBackground` | function | Draws floor, walls, rug, room edges, and theme tints |
| `DEFAULT_OBJECTS` | constant | Fallback non-overlapping furniture layout |
| `FURNITURE_DIMS` | constant | Furniture visual/highlight dimensions; floor objects should match occupied grid footprint |
| `FURNITURE_TILES` | constant | Tile footprints used for collision and hit polygons |
| `drawComputerDesk` | function | Draws the coding workstation with monitor, keyboard, desk notes, and mug |
| `drawPrinter` | function | Draws the compact print/utility station |
| `drawDocumentBoard` | function | Draws the wall planning/document board |
| `drawActiveStationHighlight` | function | Draws a gold floor ring at a parameterised alpha used to pulse the active work station |
| `RoomScene.setActiveStation` | method | Draws or clears the pulsing active-station highlight on its own graphics layer |
| `activeStationGraphics` | PIXI layer | Scene layer hosting the active-station pulse, drawn below `highlightGraphics` |
| `FURNITURE_CATALOG` | constant | Furniture shop metadata, including role-aligned station types |
| `loungeStations` | constant | Canonical station registry for agent tasks |
| `resolveAgentTask` | function | Maps task types to lounge station ids and target iso points |
| `buildLoungeBlockedCells` | function | Converts floor furniture footprints into blocked lounge grid cells |
| `planLoungeGridRoute` | function | Plans a lounge route around static furniture to a station target |
| `planIsoGridPath` | function | Pure grid route planner for bounded room cells |
| `findGridPath` | function | Breadth-first path search over unblocked cells |
| `AgentRouteDebug` | type | Route overlay data exposed by `useAgentWalk` |
| `useAgentWalk` | hook | Plans route waypoints, animates segment by segment, exposes route debug data, refreshes routes after committed layout changes, and ticks the post-arrival work timer to auto-return the agent to idle |
| `taskWorkDurationMap` | constant | Per-task work durations in `taskResolver.ts` (code 8000, research 6000, meeting 7000, document 6500, review 7000, print 3500, rest 9000, idle 0 ms) |
| `Agent.workDurationMs` | field | Total milliseconds for the current work session |
| `Agent.workElapsedMs` | field | Milliseconds elapsed in the current work session |

## Routes

| Symbol | Kind | Description |
|---|---|---|
| `LoungePage` | Next.js page | Renders canonical lounge route |
| `OfficePage` | Next.js page | Redirects `/office` to `/lounge` |

## Stage / Projects

| Symbol | Kind | Description |
|---|---|---|
| `ClaudeGateway` | class | Socket.io gateway, room-scoped emit |
| `ProjectsController` | class | GET `/projects`, `/projects/:id`, `/projects/:id/tasks` |
| `TasksController` | class | GET `/tasks/:id/runs` |
