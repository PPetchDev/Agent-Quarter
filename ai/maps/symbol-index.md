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
| `drawActiveStationHighlight` | function | Draws a gold floor ring + dispatches ambient body glow at a parameterised alpha used to pulse the active work station |
| `drawStationAmbient` | function | Interpreter that walks the `STATION_AMBIENTS` table for the given furniture type and draws each shape with coordinates scaled by `FURNITURE_DIMS` |
| `STATION_AMBIENTS` | constant | Per-station ambient shape table (`face`/`halo`/`point`/`topOutline`) with proportional w/h offsets — lives in `stationAmbients.ts` (PIXI-free, unit-tested) |
| `AmbientShape` | type | Union of ambient shape kinds for `STATION_AMBIENTS` entries — defined in `stationAmbients.ts` |
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
| `TASK_CONFIG` | constant | Consolidated task config: stationId, arriveState, walkingBubble, bubble, doneBubble, workDurationMs per task type in `taskResolver.ts` (replaces 6 separate Record maps) |
| `useCountdown` | hook | Reusable countdown timer hook returning formatted HH:MM:SS in `hooks/useCountdown.ts` |
| `projAt` | function | Pure isometric projection with explicit S/OX/OY params in `pixiRoom.ts` (used by `useAgentWalk` to avoid duplicating projection math) |
| `Agent.workDurationMs` | field | Total milliseconds for the current work session |
| `Agent.workElapsedMs` | field | Milliseconds elapsed in the current work session |
| `Agent.taskQueue` | field | Pending task types the agent will auto-run after the current work completes |
| `enqueueTask` | function | Pure helper that appends a task to the queue (immutable) in `taskQueue.ts` |
| `dequeueTask` | function | Pure helper that pops the queue head and returns `{ next, rest }` |
| `useAgentWalk.enqueueTask` | hook API | Append a task to the agent's queue without interrupting the current task |
| `useAgentWalk.clearQueue` | hook API | Empty the agent's task queue without affecting the active task |
| `MAX_TASK_QUEUE_LENGTH` | constant | Default hard cap on the agent's pending task queue (8); `enqueueTask` and `useAgentWalk` accept `maxLength` / `maxQueueLength` overrides |
| `AmbientDrawContext` | type | PIXI-free draw context (`proj`, `fillQuad`, `strokeQuad`, `circle`, `ellipse`, `dim`) supplied to `applyStationAmbient` and to `custom`-kind shape draw fns |
| `applyStationAmbient` | function | Pure interpreter — walks `STATION_AMBIENTS[type]` and dispatches each shape through a draw context |
| `getStationDim` | function | Returns `FURNITURE_DIMS[type]` with a `{w:1,d:1,h:1}` fallback for unknown types |
| `ResolvedAgentTask.doneBubbleText` | field | Per-task completion bubble shown when the work timer auto-completes |

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
