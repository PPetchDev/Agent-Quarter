# Changelog — Anime Agent Squad

> ⚠️ **Recovery note (2026-06-03):**
> This file was accidentally overwritten during C-OFFICE-RUN-EXECUTION-API-004B.
> The original untracked 53KB file could not be restored from git.
> Entries below are reconstructed from: partial read cache, `ai/backlog.md`, session history, `ai/maps/*`, and verified patch reports.
> Entries marked `[reconstructed]` were rebuilt from available evidence — exact original wording may differ.
> Entries marked `[verified]` match original changelog content recovered from read cache.
>
> **Unrecoverable:** ~865 lines (lines 501–1365) of the original changelog were never read and cannot be recovered.
> See `ai/backlog.md` for a comprehensive contract inventory covering the same contracts.

---

## C-MOOD-001 — Character Mood Animation (Float Loop + Enhanced Glow)

**Date:** 2026-06-18
**Status:** PASS

Added character mood animation to all 5 Spine characters:
- Y-axis float loop (bobbing) with per-state amplitude and speed: idle=2px/3s, working=4px/1.5s, resting=1px/5s, walking/error/done=0px
- Enhanced alpha breath: working 0.80–1.0 (was 0.88–1.0), resting 0.92–1.0 (subtle)
- `getMoodFloatConfig()` in spineAgents.ts with 12-state lookup tables
- Spine-loaded guard prevents stale Y position capture
- `spinesReady` useMemo for stable dependency array

Web TypeScript, 290 tests (6 new), and lint all PASS. Browser QA: all characters at correct positions, zero JS errors.

---

## C-LOUNGE-003 — Time Theme: Split Day → Morning + Afternoon

**Date:** 2026-06-18
**Status:** PASS

Split the existing 4-period time theme into 5 periods matching design spec §2.1:
- Replaced `'day'` (08:00–18:00) with `'morning'` (07:30–12:00, blue sky) and `'afternoon'` (12:00–17:00, bright warm daylight)
- Adjusted all time boundaries: dusk 17:00–20:00 (was 18:00–21:00), night 20:00–05:00 (was 21:00–05:00), dawn 05:00–07:30 (was 05:00–08:00)
- Added `'day'` → `'morning'` migration for legacy localStorage keys
- Room settings picker auto-updated via dynamic `ROOM_THEME_KEYS`

Web TypeScript, 284 tests, and lint all PASS.

---

## C-DORM-AZUR-002 — Dorm Follow-up: Furniture Interaction Slots + Rate Tuning

**Date:** 2026-06-12
**Status:** PASS

Deepen Azur Lane dorm parity with two focused slices:

**Slice A — Furniture Interaction Slots**
- Extended `loungeStations.ts` with `interactionSlot` metadata per furniture type:
  - `bed` (sofa station) → `{ fuzzy: true, anim: 'sleep', slotCount: 2 }`
  - `low_table` (meetingTable station) → `{ fuzzy: true, anim: 'sit', slotCount: 2 }`
  - `computer_desk`, `bookcase`, `printer`, `document_board` → `{ fuzzy: false, anim: 'normal', slotCount: 1 }`
- Modified `useAgentWalk.walkToIso` to detect target furniture and set `arriveAnim` on the agent
- Updated LoungeCanvas Spine animation mapping to prioritize `arriveAnim` when set (sleep on beds, sit on cushions)
- Fuzzy slots allow multiple agents on same furniture without collision

**Slice B — Rate Tuning (Playtest Adjustments)**
- `FOOD_DRAIN_PER_CHAR_PER_MIN`: 60 → 45 (slower depletion, ~15h full gauge vs 11h)
- `XP_PER_MIN_BASE`: 30 → 40 (faster leveling, ~25min Lv1→2 at comfort 0)
- `MORALE_RECOVERY_PER_MIN`: 1 → 2 (visible recovery during rest)
- `AFFECTION_PER_MIN`: 0.06 → 0.1 (harder to cap without headpats)
- `HEADPAT_AFFECTION`: 0.6 → 0.5 (balanced with higher passive)
- Added `COMFORT_BONUS_CAP = 0.5` to prevent runaway XP at high comfort
- Exported `PLAYTEST_PRESET` for A/B comparison

All 29 focused tests (dormEngine + useAgentWalk), 284 web tests, 440 root tests, TypeScript, lint, and build PASS.

---

## C-LOUNGE-PERF-ROUTE-GRID-002 — Shared Lounge Route Grid

**Date:** 2026-06-10
**Status:** PASS

Reduced repeated `/lounge` route-planning input work by adding `LoungeRouteGrid` and `buildLoungeRouteGrid`, memoizing one grid per room layout in `LoungeCanvas`, and passing the shared grid into all five visible `useAgentWalk` instances. `planLoungeGridRoute` keeps fallback behavior for existing callers. Added focused tests for precomputed grid reuse; full web tests pass (256 tests), root test/typecheck/build/lint pass, browser smoke passes on temporary port 3002, and temporary ports are clean. Active risks: none.

---

## C-LOUNGE-PERF-RAF-001 — Lounge Agent Idle RAF Optimization

**Date:** 2026-06-10
**Status:** PASS

Optimized `/lounge` idle behavior by keeping `useAgentWalk`'s RAF loop asleep unless the agent is walking or running a work timer. Added focused jsdom regression tests proving idle walkers do not schedule RAF, task assignment starts the loop, and clearing the task cancels it. Added `apps/web/vitest.config.ts` so Vitest resolves the existing web `@/` alias and can import real hook source. Added env overrides to `ai/verification/lounge-smoke.mjs` for port-collision-safe browser QA. Full web tests pass (255 tests), root test/typecheck/build/lint pass, browser smoke passes on temporary port 3002, temporary ports are clean, and workflow artifacts now point to `C-LOUNGE-PERF-RAF-001` instead of the completed Spine contract. Active risks: none.

---

## C-OFFICE-RUN-EXECUTION-FRONTEND-HOOK-ORDER-FIX-006H — Fix Conditional Hook Call in RunExecutionEventsPanel

**Date:** 2026-06-06
**Status:** PASS

Fixed React hook-order/hydration error that caused an Application Error page on `/projects`. Root cause: `RunExecutionEventsPanel.tsx` called `useRunExecutionSocket(runId)` conditionally after early return (when `!mounted || !isExecutionUiEnabled()`), so SSR render (hooks not called) and client mount (hook called) had different hook orders. Fix: (1) Added `UseRunExecutionSocketOptions` with `enabled` boolean to `useRunExecutionSocket` — hook can be called every render safely but only connects socket when `enabled=true` && `runId` exists; (2) `RunExecutionEventsPanel` now calls hook unconditionally before early return, passing computed `executionUiEnabled` (mounted + env gate + runId). Hook order stable across all renders. All targeted tests pass (82 tests: 26 panel + 34 hook + 11 button + 11 adapter). TypeScript clean. No backend, LoungeCanvas, real Codex, or new dependencies. Dynamic socket.io-client import remains inside useEffect. Next: 006I runtime QA.

---

## C-OFFICE-RUN-EXECUTION-FRONTEND-006C — Dev-only Read-only Execution Button

**Date:** 2026-06-04
**Status:** PASS

Added a small Projects page dev-only trigger for existing runs. `RunExecutionButton` is hidden unless the app is non-production and `NEXT_PUBLIC_ENABLE_LOCAL_CODEX_UI=true`, appears only when a real latest run id exists, calls `executeRunDev` with a fixed read-only prompt, disables while pending, and shows only local accepted/error status. Added focused tests for env gating, production guard, run-id requirement, fixed prompt, pending guard, accepted state, and safe error formatting. No backend, `LoungeCanvas`, `useRunSocket`, execution event display, workspace-write UI, cwd exposure, dependencies, or real Codex execution were added.

---

## C-OFFICE-RUN-EXECUTION-FRONTEND-HYDRATION-FIX-006F — Fix Dev-Only Execution UI Hydration

**Date:** 2026-06-05
**Status:** PASS

Fixed React hydration errors that prevented `RunExecutionButton` and `RunExecutionEventsPanel` from appearing in the browser DOM after client-side hydration (3 JS exceptions during mount). Root cause: top-level `import { io } from 'socket.io-client'` in `useRunExecutionSocket.ts` caused socket.io-client module evaluation during SSR/bundling, creating mismatches between server and client renders. Two-part fix: (1) dynamic `import('socket.io-client')` inside `useEffect` with `cancelled` guard, replacing top-level import with `import type { Socket }` only; (2) `mounted` guard (`useState`+`useEffect`) in `RunExecutionButton` and `RunExecutionEventsPanel` — components render null until client mount, ensuring server and client first render match. 74 tests pass (28 hook + 11 button + 24 panel + 11 adapter). TypeScript clean. No backend, LoungeCanvas, or useRunSocket changes. No real Codex.

---

---

## C-OFFICE-RUN-EXECUTION-FRONTEND-006D — Safe Frontend Execution Event Display

**Date:** 2026-06-05
**Status:** PASS

Added safe frontend display for `run.execution.*` socket events in the Projects page. New `useRunExecutionSocket` hook connects to `/runs` namespace with env gate, runId scoping, and event reset on runId change. Pure `executionReducer` caps events at 20 and delegates to `sanitizeMessage` (stack trace stripping, whitespace collapse, 240-char truncation, mixed-case base64/API key/PEM secret masking). `RunExecutionEventsPanel` renders events as plain colored text with terminal status badge (completed/failed). 51 new tests (27 reducer/sanitizer + 24 panel helpers). All regression tests pass (10 button + 11 adapter). No backend, `LoungeCanvas`, `useRunSocket`, workspace-write UI, cwd exposure, dependencies, or real Codex execution were added.

---

## C-OFFICE-RUN-EXECUTION-FRONTEND-006B — Frontend Dev Execution Adapter

**Date:** 2026-06-04
**Status:** PASS

Added `executeRunDev` to `apps/web/src/lib/api.ts` as the adapter-only frontend slice for dev run execution. The adapter posts to `/api/runs/:id/execute`, validates empty prompts before request, sends only `{ prompt, mode: 'read-only' }`, never accepts or sends `cwd` or workspace-write options, and returns structured success/error results for accepted, HTTP error, and network failure paths. Added mocked frontend tests in `apps/web/src/lib/api.test.ts`. No UI, backend, socket event display, dependencies, or real Codex execution were added.

---

## C-OFFICE-RUN-EXECUTION-SETUP-FIX-005C — Port/Env Ownership Isolation + One Smoke Retry

**Date:** 2026-06-04
**Status:** PASS

Isolated stale API port ownership on `:3001`, verified active listener process carried required env gates (`ENABLE_LOCAL_CODEX=true`, `ALLOW_LOCAL_PROCESS_EXECUTION=true`, `CODEX_CWD=...`), validated pre-smoke route path with missing-prompt `400` (not `503`), then executed exactly one read-only smoke call to `POST /api/runs/r-002/execute` and received `202 Accepted` with `executionStarted: true`. Real `codex exec --sandbox read-only` process invocation was observed. Run lifecycle remained unchanged (`r-002` stayed `running`). No product source changes were made in this verification contract.

---

## C-OFFICE-RUN-EXECUTION-SMOKE-005B — One-shot Real Codex Read-only Smoke

**Date:** 2026-06-04
**Status:** PARTIAL

One intentional smoke call was executed via `POST /api/runs/r-002/execute` with `mode: read-only` and the exact short smoke prompt. Runtime returned `503 Local execution is disabled`, so real Codex execution was not reached. No run lifecycle mutation was observed (`r-002` remained `running`), and no product source mutation was attributed to the smoke call.

---

## C-OFFICE-RUN-EXECUTION-API-004B — Dev-only POST /api/runs/:id/execute

**Date:** 2026-06-03
**Status:** PASS

Added explicit dev-only `POST /api/runs/:id/execute` endpoint to RunsController.
Fire-and-forget, 202 Accepted, env-gated (NODE_ENV/ENABLE_LOCAL_CODEX/ALLOW_LOCAL_PROCESS_EXECUTION), cwd server-side only. 15 new tests (28 total controller, 100 total API). TypeScript clean.

---

## C-OFFICE-RUN-EXECUTION-API-004A — Investigation

**Date:** 2026-06-03
**Status:** PASS (investigation only)

Recommended `POST /api/runs/:id/execute` with fire-and-forget, 202, cwd server-side. Read-only — no source modified.

---

## C-OFFICE-RUN-EXECUTION-SERVICE-003B — RunExecutionService

**Date:** 2026-06-03
**Status:** PASS

Added RunExecutionService that orchestrates LocalCodexRunner and emits execution events through RunsGateway. Not wired into controllers. No run state mutation. 13 tests. TypeScript clean.

---

## C-OFFICE-RUN-EXECUTION-SERVICE-003A — Architecture Investigation

**Date:** 2026-06-03
**Status:** PASS [reconstructed]

Architecture-only investigation for safe `RunExecutionService` integration seam.
Inspected run lifecycle, LocalCodexRunner boundary, execution event contract. Recommended service-first approach (not controller-wired). Selected C-OFFICE-RUN-EXECUTION-SERVICE-003B as next contract.

---

## C-OFFICE-LOCAL-CODEX-RUNNER-002B — LocalCodexRunner

**Date:** 2026-06-02
**Status:** PASS [reconstructed]

Dev-only Codex CLI subprocess wrapper. Env-gated (ENABLE_LOCAL_CODEX + ALLOW_LOCAL_PROCESS_EXECUTION), production-blocked, spawn('codex', args) with shell=false, JSONL parser, 120s timeout, 256KB max output, SIGTERM on overflow. Mocked tests only — no real Codex execution.

---

## C-OFFICE-EXECUTION-EVENTS-001B — Execution Event Contract

**Date:** 2026-06-01
**Status:** PASS [reconstructed]

Added execution event types to RunsGateway: `run.execution.started`, `run.execution.log`, `run.execution.tool`, `run.execution.completed`, `run.execution.failed`. No runner or consumer at this stage.

---

## C-OFFICE-RUN-LIFECYCLE-E2E-001B — End-to-End Verification

**Date:** 2026-06-01
**Status:** PASS (with caveats) [reconstructed]

E2E verification of run lifecycle: API boot (prisma generate predev), TS clean, tests pass, REST start/complete/cancel work, socket events verified via ad-hoc scripts. Socket proof partially truncated.

---

## C-OFFICE-API-PRISMA-GENERATE-001B — API Boot Fix

**Date:** 2026-06-01
**Status:** PASS [reconstructed]

Added `"predev": "prisma generate"` to `apps/api/package.json`. Fixes Prisma client initialization error on cold boot.

---

## C-OFFICE-RUN-LIFECYCLE-E2E-001A — E2E Verification

**Date:** 2026-06-01
**Status:** PASS [reconstructed]

Run lifecycle E2E verification: API TS clean, web TS clean, targeted tests pass. API runtime partially blocked.

---

## C-OFFICE-FRONTEND-SUBSCRIBE-001B — Frontend useRunSocket

**Date:** 2026-06-01
**Status:** PASS [reconstructed]

Created `useRunSocket.ts` hook for `/runs` namespace: `run.started`, `run.completed`, `run.failed`, `run.cancelled` with cleanup. Wired into `LoungeCanvas.tsx` for failed/cancelled only (avoids duplicate started/completed).

---

## C-OFFICE-BACKEND-RUN-EVENTS-001B — Backend Run Lifecycle Events

**Date:** 2026-06-01
**Status:** PASS [verified]

Backend run lifecycle socket events: dedicated RunsGateway on `/runs` namespace.

- Added `runs.gateway.ts` — server-push only, namespace `/runs`
- Emits `run.started` after `POST /api/tasks/:id/start`
- Emits `run.completed`, `run.failed`, `run.cancelled` on PATCH transitions
- Safe emit via `server?.emit(...)` — no-op when server unavailable

---

## C-OFFICE-RUN-STATE-CONTRACT-001C — Run State Contract

**Date:** 2026-06-01
**Status:** PASS [reconstructed]

Backend run-state contract: task start creates and returns real `Run`. Added `RunsService` as in-memory run store seeded from core `RUNS`. `POST /api/tasks/:id/start` returns `Run`. `PATCH /api/runs/:id/{complete|fail|cancel}` updates and returns run.

---

## C-OFFICE-FRONTEND-ADAPTER-001B — Run Adapter Stabilization

**Date:** 2026-06-01
**Status:** PASS [verified]

Stabilized run adapter: dynamic run ID tracking replaces hardcoded constant.

- `startOfficeRun` returns Run.id → stored in `officeInFlightRunIdRef`
- `completeOfficeRun` uses dynamic run ID
- `OFFICE_CANONICAL_RUN_ID` removed

---

## C-OFFICE-FRONTEND-ADAPTER-001 — REST Office Run Adapter

**Date:** 2026-06-01
**Status:** PASS [verified]

REST-backed office run adapter bridges visual workflow to backend run endpoints.

- `officeRunAdapter.ts`: `startOfficeRun` → POST /api/tasks/:taskId/start, `completeOfficeRun` → PATCH /api/runs/:runId/complete
- LoungeCanvas autonomous loop: fire-and-forget API calls on step start/complete
- Canonical seed IDs: t-008 (task start), r-002 (run complete)

---

## C-AGENT-DIALOGUE-LLM-PROVIDER-006B — Provider Abstraction

**Date:** 2026-06-02
**Status:** PASS [reconstructed]

Added `LlmTextProvider` interface + `LLM_TEXT_PROVIDER` injection token with `useExisting: ClaudeService`. `DialogueService` decoupled from `ClaudeService` via provider token.

---

## C-AGENT-DIALOGUE-LLM-FRONTEND-005B — Frontend Integration

**Date:** 2026-06-02
**Status:** PASS [reconstructed]

Frontend dialogue adapter: `generateOfficeDialogue` fetch adapter POSTs to `/api/dialogue/office`. Returns `DialogueResponse` or null on failure.

---

## C-AGENT-DIALOGUE-LLM-FRONTEND-004C — Frontend Integration

**Date:** 2026-06-02
**Status:** PASS [reconstructed]

Frontend dialogue integration into LoungeCanvas — Claude-powered office dialogue with deterministic fallback visible in lounge chat.

---

## C-AGENT-DIALOGUE-LLM-FRONTEND-ADAPTER-004B — Frontend Adapter

**Date:** 2026-06-02
**Status:** PASS [reconstructed]

Frontend fetch adapter for office dialogue API.

---

## C-AGENT-DIALOGUE-LLM-CLAUDE-003B — Claude One-Shot Boundary

**Date:** 2026-06-02
**Status:** PASS [reconstructed]

Added `ClaudeService.generateText()` one-shot method. Exported ClaudeService from ClaudeModule. DialogueModule imports ClaudeModule. DialogueService tries Claude → falls back to deterministic pool on failure/empty output. Source: 'llm' on success, 'deterministic' on fallback.

---

## C-AGENT-DIALOGUE-LLM-API-002B — Dialogue REST Endpoint

**Date:** 2026-06-02
**Status:** PASS [reconstructed]

Added `POST /api/dialogue/office` REST endpoint. `DialogueController` delegates to `DialogueService.generateOfficeDialogue`. `DialogueModule` wires controller + service.

---

## C-AGENT-DIALOGUE-LLM-SERVICE-001B — DialogueService

**Date:** 2026-06-02
**Status:** PASS [reconstructed]

`DialogueService` with deterministic pool fallback. Agent persona-aware prompt construction. Cooldown/dedup/validation. Source: 'deterministic', fallbackUsed: true.

---

## C-AGENT-DIALOGUE-BUBBLES-001B — Dialogue Bubbles

**Date:** 2026-06-02
**Status:** PASS [reconstructed]

Dialogue bubble UI in LoungeCanvas — agent-to-agent chat bubbles rendered above Spine characters.

---

## C-AGENT-DIALOGUE-SCHEDULER-001A — Dialogue Scheduler

**Date:** 2026-06-02
**Status:** PASS [reconstructed]

`pickAgentDialogue` pure deterministic scheduler — selects speaker/target, respects cooldown/probability/dedup.

---

## C-GAME-LOOP-005 — Happiness Cap

**Date:** 2026-05-30
**Status:** PASS [verified]

Happiness cap at 200 with max milestone feedback. `HAPPINESS_MAX = 200`, `addHappiness` helper clamps and toasts "Max happiness! 🥳" once. 5 gain paths use helper.

---

## C-GAME-LOOP-004 — Daily Train Reset

**Date:** 2026-05-30
**Status:** PASS [verified]

Daily Train reset and persistence. trainCount persists in localStorage. Resets to 0/4 at start of new local day. Reload on same day restores saved count.

---

## C-GAME-LOOP-003 — Supplies Visibility

**Date:** 2026-05-30
**Status:** PASS [verified]

Supplies visibility and soft low-supplies consequence. HUD shows `🍱 {suppliesPct}%`. Task reward at ≤20% supplies → 25% penalty.

---

## C-GAME-LOOP-002 — Collect Cooldown

**Date:** 2026-05-30
**Status:** PASS [verified]

Collect button cooldown anti-spam. 8s cooldown on ♡ Collect button. Spam clicks blocked with "Wait a moment~" toast. Button dims during cooldown.

---

## C-AGENT-UI-002 — Task Progress Clarity

**Date:** 2026-05-30
**Status:** PASS [verified]

Task progress and next-action clarity. Progress bar shows "Working · Xs left". Queue chip format "Next: 💻 Code +N". Error state shows "✕ to clear" hint.

---

## C-GAME-LOOP-001 — Gameplay Reward Loop

**Date:** 2026-05-30
**Status:** PASS [reconstructed]

Basic gameplay reward loop. Task completion grants coins+happiness, furniture applies happiness on purchase, supplies empty indicator. TASK_REWARDS lookup per task type.

---

## C-AGENT-UI-001 — Agent Status Labels

**Date:** 2026-05-30
**Status:** PASS [reconstructed]

Agent status and task clarity. STATE_LABEL map with emoji-prefixed labels, STATE_COLOR color-coded pill badges. Active task button with ring highlight.

---

## C-UI-002 — Mobile/Compact HUD

**Date:** 2026-05-29
**Status:** PASS [verified]

Mobile/compact lounge HUD — responsive Tailwind breakpoints for sub-640px viewports. Move-mode banner, top zone, bottom HUD, toast all responsive.

---

## C-UI-001 — HUD Clarity

**Date:** 2026-05-29
**Status:** PASS [verified]

Lounge HUD clarity cleanup. Toast shifts in move mode, duplicate floor button removed, bottom HUD spacing tightened, Collect promoted to pink pill.

---

## C-ROOM-006 — Purchase Placement Tests

**Date:** 2026-05-29
**Status:** PASS [reconstructed]

Purchase placement test coverage. Extracted `selectPurchasePlacement` pure helper. Tests cover occupied spawn fallback, no free space, default placement.

---

## C-ROOM-005 — Collision-Safe Shop Spawn

**Date:** 2026-05-29
**Status:** PASS [reconstructed]

Collision-safe shop spawn placement. Purchase flow checks collision at default spawn, deterministic fallback scan, coin deduction only after valid placement confirmed.

---

## C-ROOM-001 — Room Layout Balance

**Date:** 2026-05-28
**Status:** PASS [reconstructed]

Room layout balance: nudged furniture + character positions for visual symmetry. Bed centered, characters near workstations.

---

## C-SPINE-007 — Cooldown Feedback

**Date:** 2026-05-28
**Status:** PASS [reconstructed]

Cooldown feedback: "Wait a moment~" toast with 1s throttle when tapping Spine character during collect cooldown.

---

## C-SPINE-006 — Collect Mechanic

**Date:** 2026-05-28
**Status:** PASS [reconstructed]

Collect mechanic: tapping Spine characters gives +3 happiness, +15 coins, floating hearts, and toast. 3000ms per-character cooldown.

---

## C-SPINE-005 — Touch Interaction

**Date:** 2026-05-28
**Status:** PASS [reconstructed]

Touch interaction: clicking Spine characters plays touch/motou once, returns to calm. Visual-only — no agent state changes.

---

## C-SPINE-004 — One-Shot Animations

**Date:** 2026-05-28
**Status:** PASS [reconstructed]

One-shot Spine animations: victory and break play once, auto-return to calm. addAnimation queue for post-one-shot return.

---

## C-SPINE-003 — Animation State Mapping

**Date:** 2026-05-28
**Status:** PASS [reconstructed]

Spine animation state mapping. Characters switch animations based on agent state. SPINE_ANIM_CANDIDATES priority fallback table.

---

## C-SPINE-002 — Character Placement

**Date:** 2026-05-28
**Status:** PASS [reconstructed]

Visual tuned Spine character placement in lounge. furnitureLayer depth-sorting, correct zIndex formula, floor-level wz, proportional scale.

---

## C-DORM-001 — Dorm Aesthetic

**Date:** 2026-05-28
**Status:** PASS [reconstructed]

Azur Lane / Idolmaster dorm aesthetic. Sakura pink wallpaper, 5-petal flowers, honey-brown floor, floating petals, pastel rug, heart wreath door, frosted glass HUD cards.

---

## C-PANZOOM-001 — Pan & Zoom

**Date:** 2026-05-27
**Status:** PASS [reconstructed]

Mouse-drag panning and mouse-wheel zooming for lounge viewport. grab/grabbing cursor, 0.5×–2.5× zoom range.

---

## C-VISUAL-001 — Depth Sorting & Viewport

**Date:** 2026-05-27
**Status:** PASS [reconstructed]

Isometric depth sorting, viewport fill, visual polish. Fixed zIndex formula, boosted canvas size, warmer colors.

---

## C-REFACTOR-001 — Codebase Readability

**Date:** 2026-05-27
**Status:** PASS [reconstructed]

Lounge codebase readability refactor. Extracted useCountdown hook, consolidated TASK_CONFIG, extracted projAt pure projection, extracted loungeHelpers.

---

## C-AGENT-RISKS-002 — Remaining Risk Closure

**Date:** 2026-05-29
**Status:** PASS [verified]

Closed remaining open risks: ambient extensibility, configurable queue cap, throttled work-tick re-renders, multi-agent foundation (Aki), pure-interpreter rendering tests, ADR-0002.

---

## C-AGENT-POLISH-001 — Agent Lifecycle Polish

**Date:** 2026-05-29
**Status:** PASS [verified]

Closed four agent-lifecycle risks: per-task done bubble, facing direction on arrival, queue cap at MAX_TASK_QUEUE_LENGTH=8, pulse-flicker dep reduction.

---

## C-STATION-AMBIENT-003 — Ambient Table Extraction

**Date:** 2026-05-29
**Status:** PASS [verified]

Extracted AmbientShape + STATION_AMBIENTS from pixiRoom.ts into PIXI-free module. 8 structural tests.

---

## C-STATION-AMBIENT-002 — Ambient Geometry Robustness

**Date:** 2026-05-29
**Status:** PASS [verified]

Refactored station ambient overlays to declarative STATION_AMBIENTS table with FURNITURE_DIMS-scaled offsets.

---

## C-STATION-AMBIENT-001 — Station Body Ambient Glow

**Date:** 2026-05-29
**Status:** PASS [verified]

Active-station highlight extended from floor ring into furniture body. Per-furniture-type ambient helpers. Sine alpha pulse curve.

---

## C-AGENT-LOOP-001 — Agent Task Queue

**Date:** 2026-05-28
**Status:** PASS [verified]

Per-agent task queue with auto-pop on work-timer completion. enqueueTask/dequeueTask pure helpers. MAX_TASK_QUEUE_LENGTH = 8.

---

## C-STATION-HIGHLIGHT-001 — Pulse Active Station

**Date:** 2026-05-28
**Status:** PASS [reconstructed]

Pulse active station's PixiJS footprint while agent works. Gold floor ring + ambient body glow with sine alpha pulse.

---

## C-AGENT-LIFECYCLE-001 — Agent Task Lifecycle

**Date:** 2026-05-28
**Status:** PASS [reconstructed]

Agent walk → work → idle lifecycle with deterministic work timer and visible progress bar.

---

## C-HUD-COMPACT-001 — Compact Lounge HUD

**Date:** 2026-05-28
**Status:** PASS [reconstructed]

Reduced HUD chrome around lounge canvas for more fullscreen isometric room view.

---

## C-FURNITURE-GRID-001 — Grid-Filled Furniture

**Date:** 2026-05-28
**Status:** PASS [reconstructed]

Redrawn lounge furniture so visible objects fill grid footprints more coherently.

---

## C-ROOM-ROLE-001 — Role-Aligned Furniture

**Date:** 2026-05-28
**Status:** PASS [reconstructed]

Lounge furniture visually matches agent task roles. Code station as clear computer workstation.

---

## C-AGENT-PATH-002 — Path Debug Overlay

**Date:** 2026-05-28
**Status:** PASS [reconstructed]

Route debug overlay and dynamic obstacle refresh. Show current route in edit/debug context.

---

## C-AGENT-PATH-001 — Grid Pathfinding

**Date:** 2026-05-28
**Status:** PASS [reconstructed]

Single-agent lounge grid pathfinding. BFS over unblocked cells. Routes around static furniture footprints.

---

## C-ROOM-LAYOUT-002 — Symmetrical Room Layout

**Date:** 2026-05-27
**Status:** PASS [reconstructed]

Normalized canonical isometric lounge room geometry. Balanced, symmetrical, non-overlapping furniture placement.

---

## C-PROJECT-CLEAN-001 — Canonical Lounge Cleanup

**Date:** 2026-05-27
**Status:** PASS [reconstructed]

Consolidated around single simulation concept: existing lounge + isometric room + agent task walking. /office → /lounge redirect.

---

## C-AGENT-ISO-001 — Isometric Agent Movement

**Date:** 2026-05-27
**Status:** PASS [reconstructed]

Agent task walking moved from duplicate flat /office simulator into existing lounge scene using isometric room coordinates.

---

## C-DOMAIN-001 — Domain Model Audit

**Date:** 2026-06-01
**Status:** PASS [reconstructed]

Confirmed `packages/core` character types, mood system, StageTracker are stable. Added direct core tests for mood registry and StageTracker chunk deadline behavior.

---

## C-STAGE-001 — Stage Page Claude Streaming

**Date:** 2026-05-25
**Status:** PASS [reconstructed]

Confirmed streaming chat works with character mood parsing. 3 non-blocking issues documented.

---

## C-SCAFFOLD-001 — Repo Structure

**Date:** 2026-05-25
**Status:** PASS [reconstructed]

Verified monorepo builds clean. pnpm build passes all workspaces.

---

## C-BOOT-001 — AI Workflow Migration

**Date:** 2026-05-26
**Status:** PASS [reconstructed]

Established ai/ workflow structure: Kernel → Contract → Packet → Patch. All future agents work from compact context.

---

## C-SPINE-001 — Spine Character Loading

**Date:** 2026-05-28
**Status:** PASS [reconstructed]

PixiJS v7 + pixi-spine@4.0.4 migration. Spine 3.8 characters (qiye/dunkeerke) load from .skel+.atlas+.png, placed in furnitureLayer.

---

## Unrecovered Historical Entries

The original `ai/changelog.md` was 53KB (~1365 lines). Only lines 1–500 were cached during a partial read before the overwrite. Lines 501–1365 are unrecoverable from git (file was untracked).

These contracts are documented in `ai/backlog.md` and may have had changelog entries:

- C-LOUNGE-001 — Lounge polish pass
- C-EVENT-001 — Simulated agent event model
- C-RUN-001 — Run/task lifecycle
- C-LOUNGE-002 — Time-based theme system

See `ai/backlog.md` for full contract inventory.

---

_Last updated: 2026-06-03 — Recovery complete (best-effort reconstruction)_

## 2026-06-11 — C-DORM-AZUR-001 (PASS)
Azur Lane dorm parity: pure dorm engine (comfort/food/XP/morale/affection/headpat/training/offline cap, 25 tests), LoungeCanvas dorm HUD + SupplyPanel + tokens + away toast, walkToIso idle wandering, per-floor layouts + wallpaper picker, persistence v8 (roomReady-gated; fixes mount-time clobber race), roomLoader rebuild now preserves Spine displays. Gates: web 283 tests, tsc, root test/typecheck/lint/build, live browser pass.

## 2026-06-11 — C-DORM-AZUR-001 risk-fix pass (PASS)
Token sink: all furniture priced in coins + decor tokens (tokenCost 1-7), ShopModal dual-currency gate + token chip, INITIAL_TOKENS 20, task completion +1 token. addHappiness rewritten as functional update (stale-ref fix). Gates: web 284 tests, tsc, root test/typecheck/lint/build, browser purchase verified (-80 coins -1 token).
