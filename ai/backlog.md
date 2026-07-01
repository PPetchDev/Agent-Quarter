# Backlog — Anime Agent Squad

_Contract-oriented. Lane = Now / Next / Later / Parking Lot._
_Each item has a Contract ID. Items without a contract are not executable._

---

## Now

### C-EVENT-001 — Agent Event Model (Socket.io)

**Status:** PASS (2026-06-19)
**Goal:** Define Socket.io event schema for lounge agent state → character emotion mapping. Create AgentGateway on /lounge namespace + useAgentSocket frontend hook.
**Scope:** `packages/core/src/agent-events.*`, `apps/api/src/agents/*`, `apps/web/src/hooks/useAgentSocket.*`
**Result:** STABLE — 486 tests PASS (57 core + 116 API + 313 web), typecheck + lint all PASS. Gateway follows RunsGateway pattern, hook uses SSR-safe dynamic import.

### C-ORCHESTRATE-LLM-002 — LLM-Powered Workflow Planner (Phase 2)

**Status:** PASS (2026-06-19)
**Goal:** Replace rule-based agent scoring with LLM-powered planning via DialogueService. Backend `POST /api/dialogue/plan-workflow` delegates to Claude with deterministic fallback. Frontend `planWorkflowStepsLLM()` + `convertLLMSteps()` integrated into LoungeCanvas workflow start.
**Scope:** `apps/api/src/dialogue/*`, `apps/web/src/game/agents/officeWorkflow.*`, `apps/web/src/game/dialogue/dialogueAdapter.ts`, `apps/web/src/components/lounge/LoungeCanvas.tsx`
**Result:** STABLE — 37 API dialogue tests, 29 web workflow tests, 305 web total, typecheck + lint + build all PASS.

### C-AGENT-DIALOGUE-001 — Agent-to-Agent Autonomous Dialogue System

**Status:** PASS (2026-06-19)
**Goal:** Verify and close out the autonomous agent-to-agent dialogue system (REST API + deterministic pools + LLM fallback), built during C-GAME-RESEARCH-001 but never formally closed out.
**Scope:** `apps/api/src/dialogue/*`, `apps/web/src/game/dialogue/*`, `apps/web/src/components/lounge/LoungeCanvas.tsx` (lines 1487-1622, 2623-2637)
**Result:** STABLE — 60 dialogue tests pass (30 API + 30 web), 399 total, TypeScript + lint clean, browser QA confirms dialogue bubbles + AGENT CHAT panel working with zero JS errors.

### C-RUN-001 — Define run/task lifecycle for Projects page

**Status:** PASS (2026-06-30)
**Goal:** Lead character spawns Member agents per todo item
**Evidence pointer:** Design spec §2.3
**Result:** STABLE — Added `memberAgentIds` to Task type, member agent spawning in RunsService, member agent visualization in Projects page. 486 tests PASS. TypeScript clean.

### C-LOUNGE-002 — Time-based theme system

**Status:** PASS (2026-06-30)
**Goal:** Sky/wall/floor/lighting changes based on client time
**Evidence pointer:** Design spec §2.1 (time-based theme table)
**Result:** STABLE — Already implemented: `getTimeTheme()`, `resolveRoomTheme()` with 'auto' mode, default themeKey='auto'. No changes needed.

### C-TILED-001 — Tiled Editor map import

**Status:** PASS (2026-06-30)
**Goal:** Import room layouts from Tiled Editor JSON format
**Scope:** `apps/web/src/components/lounge/roomLoader.ts`, `apps/web/src/components/lounge/tiledParser.ts` (new), `apps/web/public/maps/`
**Result:** STABLE — Added `parseTiledMap`, `validateTiledMap`, and type definitions. 6 new tests pass. Total 319 tests PASS. TypeScript clean.

### C-PROJECTS-FULL-001 — Projects page full implementation

**Status:** PASS (2026-06-30)
**Goal:** Full CRUD implementation for Projects page with create/edit/delete capabilities
**Scope:** `apps/web/src/app/projects/page.tsx`, `apps/web/src/app/projects/*Modal.tsx` (new), `apps/web/src/lib/api.ts`, `apps/api/src/projects/*`
**Result:** STABLE — Added ProjectsService with CRUD methods, updated ProjectsController with POST/PATCH/DELETE endpoints, added CreateProjectModal, updated Projects page with create/delete UI. 319 tests PASS. TypeScript clean.

### C-LOUNGE-PERF-ROUTE-GRID-002 — Shared Lounge Route Grid

**Status:** PASS (2026-06-10)
**Goal:** Reduce repeated `/lounge` route-planning input work by sharing one precomputed blocked-cell route grid across the five visible walkers.
**Scope:** `apps/web/src/game/scene/loungePathGrid.ts`, `apps/web/src/game/scene/loungePathGrid.test.ts`, `apps/web/src/hooks/useAgentWalk.ts`, `apps/web/src/components/lounge/LoungeCanvas.tsx`, `ai/maps/*`, `ai/patches/latest.md`, `ai/handoff.md`, `ai/changelog.md`
**Result:** STABLE — `LoungeCanvas` memoizes one `LoungeRouteGrid` per layout and passes it into all five `useAgentWalk` instances; fallback planning remains; focused/web/root tests, build, lint, browser smoke, and port cleanup pass. Active risks: none.

### C-LOUNGE-PERF-RAF-001 — Lounge Agent Idle RAF Optimization

**Status:** PASS (2026-06-10)
**Goal:** Reduce `/lounge` idle CPU work by preventing idle `useAgentWalk` instances from scheduling continuous RAF loops.
**Scope:** `apps/web/src/hooks/useAgentWalk.ts`, `apps/web/src/hooks/useAgentWalk.test.ts`, `apps/web/vitest.config.ts`, `ai/maps/test-map.md`, `ai/patches/latest.md`, `ai/handoff.md`, `ai/changelog.md`
**Result:** STABLE — idle walkers no longer schedule RAF; task assignment starts the loop; task clearing cancels it. Focused hook test, full web tests, root test/typecheck/build/lint, browser smoke on temporary port 3002, port cleanup, web TypeScript, and diff check pass. Active workflow artifacts now point at this contract instead of the completed Spine contract. Active risks: none.

### C-AGENT-RISKS-002 — Close Remaining Open Risks

**Status:** PASS (2026-05-29)
**Goal:** Close every remaining open risk from prior agent slices in tight sequential commits — ambient extensibility, configurable queue cap, throttled work-tick re-renders, multi-agent foundation, pure-interpreter rendering tests, packages/core promotion ADR.
**Scope:** `apps/web/src/components/lounge/{stationAmbients.ts,stationAmbients.test.ts,pixiRoom.ts,LoungeCanvas.tsx}`, `apps/web/src/game/agents/{taskQueue.ts,taskQueue.test.ts}`, `apps/web/src/hooks/useAgentWalk.ts`, `ai/decisions/ADR-0002-stationAmbients-stays-in-web.md`, `ai/maps/*`, `ai/patches/latest.md`, `ai/handoff.md`, `ai/changelog.md`

### C-AGENT-POLISH-001 — Agent Lifecycle Polish (Risks Pass)

**Status:** PASS (2026-05-29)
**Goal:** Close four open agent-lifecycle risks in one polish patch: per-task done bubble, facing direction on arrival, queue cap, pulse-flicker dep reduction.
**Scope:** `apps/web/src/game/agents/taskResolver.ts`, `apps/web/src/game/agents/taskResolver.test.ts`, `apps/web/src/game/agents/taskQueue.ts`, `apps/web/src/game/agents/taskQueue.test.ts`, `apps/web/src/hooks/useAgentWalk.ts`, `apps/web/src/components/lounge/LoungeCanvas.tsx`, `ai/maps/*`, `ai/patches/latest.md`, `ai/handoff.md`, `ai/changelog.md`

### C-STATION-AMBIENT-003 — Extract Station Ambient Table

**Status:** PASS (2026-05-29)
**Goal:** Move `STATION_AMBIENTS` + `AmbientShape` out of `pixiRoom.ts` into a dedicated PIXI-free module + add structural tests pinning shape invariants.
**Scope:** `apps/web/src/components/lounge/stationAmbients.ts` (new), `apps/web/src/components/lounge/stationAmbients.test.ts` (new), `apps/web/src/components/lounge/pixiRoom.ts`, `ai/maps/*`, `ai/patches/latest.md`, `ai/handoff.md`, `ai/changelog.md`

### C-STATION-AMBIENT-002 — Ambient Geometry Robustness Pass

**Status:** PASS (2026-05-29)
**Goal:** Refactor station ambient overlays from per-type helpers with hand-tuned absolute coordinates into a single declarative `STATION_AMBIENTS` table whose offsets scale by `FURNITURE_DIMS`.
**Scope:** `apps/web/src/components/lounge/pixiRoom.ts`, `ai/maps/*`, `ai/patches/latest.md`, `ai/handoff.md`, `ai/changelog.md`

### C-STATION-AMBIENT-001 — Station Body Ambient Glow

**Status:** PASS (2026-05-29)
**Goal:** Extend the active-station highlight from a floor ring into the station's furniture body so each task type produces its own ambient.
**Scope:** `apps/web/src/components/lounge/pixiRoom.ts`, `ai/maps/*`, `ai/patches/latest.md`, `ai/handoff.md`, `ai/changelog.md`

### C-AGENT-LOOP-001 — Agent Task Queue With Auto-Pop

**Status:** PASS (2026-05-28)
**Goal:** Let the lounge agent chain tasks by queueing additional task types; auto-start the next one when the current work timer completes.
**Scope:** `apps/web/src/game/agents/agentTypes.ts`, `apps/web/src/game/agents/taskQueue.ts`, `apps/web/src/game/agents/taskQueue.test.ts`, `apps/web/src/hooks/useAgentWalk.ts`, `apps/web/src/components/lounge/LoungeCanvas.tsx`, `ai/maps/*`, `ai/patches/latest.md`, `ai/handoff.md`, `ai/changelog.md`

### C-STATION-HIGHLIGHT-001 — Pulse Active Station During Work

**Status:** PASS (2026-05-28)
**Goal:** Pulse the active station's PixiJS footprint while the agent works at it, so the simulation visibly couples agent state with the station the agent is using.
**Scope:** `apps/web/src/components/lounge/pixiRoom.ts`, `apps/web/src/components/lounge/roomLoader.ts`, `apps/web/src/components/lounge/LoungeCanvas.tsx`, `ai/maps/*`, `ai/patches/latest.md`, `ai/handoff.md`, `ai/changelog.md`

### C-AGENT-LIFECYCLE-001 — Agent Task Lifecycle With Work Timer

**Status:** PASS (2026-05-28)
**Goal:** Give the lounge agent a deterministic walk → work → idle lifecycle with a visible progress bar.
**Scope:** `apps/web/src/game/agents/agentTypes.ts`, `apps/web/src/game/agents/taskResolver.ts`, `apps/web/src/game/agents/taskResolver.test.ts`, `apps/web/src/hooks/useAgentWalk.ts`, `apps/web/src/components/lounge/LoungeCanvas.tsx`, `ai/maps/*`, `ai/patches/latest.md`, `ai/handoff.md`, `ai/changelog.md`

### C-HUD-COMPACT-001 — Compact Lounge HUD For Fullscreen Room View

**Status:** PASS (2026-05-28)
**Goal:** Reduce HUD chrome around the `/lounge` canvas so the isometric room feels more fullscreen, without removing functionality.
**Scope:** `apps/web/src/components/lounge/LoungeCanvas.tsx`, `ai/maps/*`, `ai/patches/latest.md`, `ai/handoff.md`, `ai/changelog.md`

### C-FURNITURE-GRID-001 — Grid-Filled Furniture Redraw

**Status:** PASS (2026-05-28)
**Goal:** Redraw lounge furniture so visible objects fill their grid footprints more coherently.
**Scope:** `apps/web/src/components/lounge/roomDefs.ts`, `apps/web/src/components/lounge/pixiRoom.ts`, furniture tests, `ai/maps/*`, `ai/patches/latest.md`, `ai/handoff.md`, `ai/changelog.md`

### C-ROOM-ROLE-001 — Role-Aligned Furniture Semantics

**Status:** PASS (2026-05-28)
**Goal:** Make lounge furniture visually match agent task roles, especially Code as a clear computer workstation.
**Scope:** `apps/web/src/components/lounge/roomDefs.ts`, `apps/web/src/components/lounge/pixiRoom.ts`, `apps/web/src/components/lounge/furnitureCatalog.ts`, `apps/web/public/maps/maple_hideout.json`, `apps/web/src/game/scene/loungeStations.ts`, path/furniture tests, `ai/maps/*`, `ai/patches/latest.md`, `ai/handoff.md`, `ai/changelog.md`

### C-AGENT-PATH-002 — Path Debug Overlay and Dynamic Obstacle Refresh

**Status:** PASS (2026-05-28)
**Goal:** Show the current route in edit/debug context and refresh active route planning when static furniture or room dimensions change.
**Scope:** `apps/web/src/hooks/useAgentWalk.ts`, `apps/web/src/components/lounge/LoungeCanvas.tsx`, `apps/web/src/game/movement/gridPath.ts`, `apps/web/src/game/scene/loungePathGrid.ts`, path tests, `ai/maps/*`, `ai/patches/latest.md`, `ai/handoff.md`, `ai/changelog.md`

### C-AGENT-PATH-001 — Isometric Grid Pathfinding and Collision

**Status:** PASS (2026-05-28)
**Goal:** Add single-agent lounge grid pathfinding so task movement routes around static furniture footprints.
**Scope:** `apps/web/src/game/movement/`, `apps/web/src/game/scene/loungeStations.ts`, `apps/web/src/hooks/useAgentWalk.ts`, `apps/web/src/components/lounge/roomDefs.ts`, `apps/web/src/components/lounge/pixiRoom.ts`, `apps/web/public/maps/maple_hideout.json`, `ai/maps/*`, `ai/patches/latest.md`, `ai/handoff.md`, `ai/changelog.md`

### C-ROOM-LAYOUT-002 — Furniture Alignment and Symmetrical Room Layout

**Status:** PASS (2026-05-27)
**Goal:** Normalize the canonical isometric lounge room geometry and furniture placement so it feels balanced, symmetrical, and non-overlapping.
**Scope:** `apps/web/src/components/lounge/`, `apps/web/src/game/scene/loungeStations.ts`, `apps/web/src/game/agents/taskResolver.ts`, `apps/web/src/hooks/useAgentWalk.ts`, `ai/maps/*`, `ai/patches/latest.md`, `ai/handoff.md`, `ai/changelog.md`

### C-PROJECT-CLEAN-001 — Canonical Isometric Lounge Cleanup

**Status:** PASS (2026-05-27)
**Goal:** Consolidate around one simulation concept: existing lounge + isometric room + agent task walking
**Scope:** `apps/web/src/app/lounge`, `apps/web/src/app/office`, `apps/web/src/components/lounge`, `apps/web/src/components/office`, `apps/web/src/game`, `apps/web/src/hooks/useAgentWalk.ts`, `ai/maps/*`, `ai/patches/latest.md`, `ai/handoff.md`, `ai/changelog.md`

### C-AGENT-ISO-001 — Isometric Lounge Agent Movement

**Status:** PASS (2026-06-08)
**Goal:** Move agent task walking from duplicate flat `/office` simulator into existing lounge scene using isometric room coordinates
**Scope:** `apps/web/src/game/isometric/`, `apps/web/src/game/scene/loungeStations.ts`, `apps/web/src/game/agents/`, `apps/web/src/hooks/useAgentWalk.ts`, `apps/web/src/components/lounge/LoungeCanvas.tsx`, `apps/web/src/app/office/page.tsx`
**Result:** STABLE — `/office` redirects to `/lounge`; lounge stations expose iso world coordinates; task resolver returns `targetIsoPoint`; `useAgentWalk` plans lounge grid routes and projects waypoints through `projAt`; LoungeCanvas wires task buttons and office workflow to `assignTask`.

---

### C-BOOT-001 — Migrate AI workflow to Kernel → Contract → Packet → Patch

**Status:** PASS (2026-06-08)
**Goal:** Establish ai/ workflow structure so all future agents work from compact context
**Owner:** Claude Code (sole migration agent)
**Result:** STABLE — Kernel, active contract/task, context packet, patch report, backlog, maps, commands, handoff, changelog, token budget, and ADR-0001 workflow artifacts are present. Changelog already records C-BOOT-001 as PASS; backlog status is now aligned.

### C-LOUNGE-001 — Lounge polish pass

**Status:** PASS (2026-06-08)
**Goal:** Furniture interaction, hit areas, depth sorting, room resize correctness
**Scope:** `apps/web/src/components/lounge/` only
**Recent wins:** polygon hit areas, 0.65 iso factor, dynamic projection, pool table removed
**Result:** STABLE — source verified furniture footprint hit polygons, collision checks, depth sorting, projection reset/rebuild on room resize, drag clamping, route/debug overlay, and active station pulse. Lounge-focused tests and web typecheck pass. Browser smoke proves `/lounge` loads with one nonblank canvas across desktop/mobile-ish viewports and no console/runtime errors when headless Chrome is run with SwiftShader renderer flags.

### C-AGENT-SPINE-001 — Spine Agent Visual Layering and Asset Mapping

**Status:** PASS (2026-06-08)
**Goal:** Stop lounge agents from being visually covered/duplicated by overlay avatars and wire the prepared Spine assets for the remaining visible agents.
**Scope:** `apps/web/src/components/lounge/LoungeCanvas.tsx`, `apps/web/src/game/agents/officeWorkflow.ts`, optional small helper/test files under `apps/web/src/components/lounge/` or `apps/web/src/game/agents/`, `apps/web/public/azur-char/*`, `ai/maps/*`, `ai/patches/latest.md`, `ai/handoff.md`
**User evidence:** `/lounge` screenshot shows Spine characters/agent visuals stacked at the workstation; prepared assets exist under `apps/web/public/azur-char/{adiliao,dunkeerke,fusang,kala,keerke,kewei,qiye}`.
**Result:** STABLE — added deterministic Spine asset mapping for all five visible office agents, loaded all mapped agents through Pixi, hid HTML avatar fallbacks unless Spine fails, moved speech/status bubbles beside Spine bodies, refreshed maps/tests, and verified browser smoke shows all five agents `spineStatus: loaded` with `avatarFallback: false`.

---

## Next

### C-SCAFFOLD-001 — Confirm repo structure and build commands

**Status:** PASS (2026-06-08)
**Goal:** Verify monorepo builds clean — `pnpm build` passes all workspaces
**Scope:** `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json` review only
**Verification:** `pnpm exec tsc --noEmit` passes; no missing deps
**Result:** STABLE — root workspace layout, root scripts, TypeScript references, `pnpm build`, `pnpm test`, `pnpm lint`, and `pnpm typecheck` all pass on synced `development`.

### C-DOMAIN-001 — Define minimal orchestration domain model

**Status:** PASS (2026-06-01)
**Goal:** Confirm `packages/core` character types, mood system, StageTracker are stable
**Scope:** `packages/core/src/` read-only audit
**Evidence pointer:** `docs/superpowers/specs/2026-05-21-anime-agent-squad-design.md` §3
**Result:** STABLE — added direct core tests for mood registry / `readCharacterMood`
and StageTracker chunk deadline behavior.

### C-STAGE-001 — Verify Stage page Claude API streaming

**Status:** PASS (2026-05-25)
**Goal:** Confirm streaming chat works with character mood parsing
**Scope:** `apps/api/src/claude/` + `apps/web/src/components/stages/`
**Result:** STABLE — 3 non-blocking issues documented. See ai/changelog.md.

---

## Later

---

## Parking Lot

### Ideas that need a contract before they can move to Now

- Sprite asset pipeline (PNG/WebP furniture)
- Mobile responsive Lounge

## From C-DORM-AZUR-001 (2026-06-11)

- Furniture interaction slots: agents sit/sleep on chairs/beds with matching Spine anims (deeper AL dorm parity). **PASS (2026-06-12, C-DORM-AZUR-002 Slice A)**
- Tune dorm rates (food drain, XP, morale) after playtesting. **PASS (2026-06-12, C-DORM-AZUR-002 Slice B)**
