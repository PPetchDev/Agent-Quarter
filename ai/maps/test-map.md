# Test Map

_Updated: C-DORM-AZUR-001_

## Dorm Tests

| Area | File |
|---|---|
| Dorm engine (comfort, food drain, XP/levels, morale, affection, headpat cooldown, training, offline cap, revival clamps) | `apps/web/src/game/dorm/dormEngine.test.ts` |
| Wander stroll (`walkToIso` from idle, refuses non-idle) | `apps/web/src/hooks/useAgentWalk.test.ts` |

```bash
pnpm --filter @squad/web exec vitest run src/game/dorm/dormEngine.test.ts src/hooks/useAgentWalk.test.ts --passWithNoTests; echo "EXIT:$?"
```

## Core Domain Tests

| Area | File |
|---|---|
| Character registry and mood resolution | `packages/core/src/__tests__/character.test.ts` |
| Stage runtime tracker | `packages/core/src/__tests__/stage-tracker.test.ts` |
| Emotion override parser | `packages/core/src/__tests__/emotion-parser.test.ts` |
| Project/task/run lifecycle helpers | `packages/core/src/__tests__/project-lifecycle.test.ts` |

## Core Verification Commands

```bash
pnpm --filter @squad/core run test; echo "EXIT:$?"
pnpm --filter @squad/core run build; echo "EXIT:$?"
```

## Canonical Web Simulation Tests

| Area | File |
|---|---|
| Isometric projection | `apps/web/src/game/isometric/isoProjection.test.ts` |
| Task resolver mapping | `apps/web/src/game/agents/taskResolver.test.ts` |
| Task queue helpers | `apps/web/src/game/agents/taskQueue.test.ts` |
| Office workflow planner, chat handoff formatter, and tool boundary events | `apps/web/src/game/agents/officeWorkflow.test.ts` |
| Office run adapter — startOfficeRun / completeOfficeRun / createAndStartRun | `apps/web/src/game/agents/officeRunAdapter.test.ts` |
| Agent walking hook idle RAF loop and task activation | `apps/web/src/hooks/useAgentWalk.test.ts` |
| useRunSocket hook — socket /runs namespace connection + event registration + cleanup | `apps/web/src/hooks/useRunSocket.test.ts` |
| Station ambient shape table invariants | `apps/web/src/components/lounge/stationAmbients.test.ts` |
| Direction resolver | `apps/web/src/game/movement/direction.test.ts` |
| Movement helper | `apps/web/src/game/movement/moveToTarget.test.ts` |
| Grid path planner | `apps/web/src/game/movement/gridPath.test.ts` |
| Lounge blocked-cell routing and shared route grid reuse | `apps/web/src/game/scene/loungePathGrid.test.ts` |
| Animation resolver | `apps/web/src/game/animation/animationResolver.test.ts` |
| Lounge furniture catalog | `apps/web/src/components/lounge/furnitureCatalog.test.ts` |
| Lounge furniture dimensions + rotation helpers (`normalizeRotation`, `rotateInLayout`, `rotateFootprintLocal`) | `apps/web/src/components/lounge/roomDefs.test.ts` |
| Office agent Spine asset mapping, fallback overlay rules, and bubble anchor resolver | `apps/web/src/components/lounge/spineAgents.test.ts` |
| Dialogue scheduler | `apps/web/src/game/dialogue/dialogueScheduler.test.ts` |

## Verification Commands

```bash
pnpm --filter @squad/web test -- --run; echo "EXIT:$?"
pnpm exec tsc -p apps/web/tsconfig.json --noEmit; echo "EXIT:$?"
```

## Expected For C-FURNITURE-GRID-001

- No test imports reference removed `components/office/*` files.
- No test imports reference removed `game/scene/officeStations.ts`.
- Room definition tests validate that floor furniture dimensions align with occupied grid tiles.
- Task resolver tests validate lounge station targeting and isometric points.
- Grid planner tests validate obstacle avoidance, blocked target snapping, and null route failure.
- Furniture catalog tests validate role-aligned station furniture exists.
- Lounge path grid tests validate semantic map furniture, furniture blocked cells, all required station routes, and re-planning around a newly committed blocker.
- Browser smoke covers `/lounge` nonblank desktop/mobile canvas, loaded Spine agents, avatar fallback state, and console/runtime errors.
- Use `LOUNGE_SMOKE_URL` and `LOUNGE_SMOKE_DEBUG_PORT` when port 3000 or the default Chrome debug port is occupied.

## API Tests

| Area | File |
|---|---|
| App module smoke | `apps/api/src/app.module.test.ts` |
| Runs controller execute endpoint (dev-only, env-gated) | `apps/api/src/projects/projects.controller.test.ts` |
| Runs gateway (execution events) | `apps/api/src/projects/runs.gateway.test.ts` |
| Local Codex runner (mocked spawn) | `apps/api/src/execution/local-codex-runner.test.ts` |
| Run execution service (orchestration + timeout guard) | `apps/api/src/projects/run-execution.service.test.ts` |
| Dialogue service (mock provider, fallback) | `apps/api/src/dialogue/dialogue.service.test.ts` |
| Dialogue controller (REST endpoint) | `apps/api/src/dialogue/dialogue.controller.test.ts` |
| Dialogue adapter (frontend fetch) | `apps/web/src/game/dialogue/dialogueAdapter.test.ts` |
| Frontend dev execution adapter — `executeRunDev` request shape, read-only mode only, no cwd/workspace-write/danger-full-access/raw args, HTTP errors, network failure, empty prompt | `apps/web/src/lib/api.test.ts` |
| Projects dev-only execution button — env visibility guard, production guard, run-id requirement, fixed read-only prompt, pending guard, accepted/error local status, no real backend/Codex | `apps/web/src/app/projects/RunExecutionButton.test.ts` |
| Execution event reducer + sanitizer — 27 tests: all 5 event types, sanitizeMessage (whitespace collapse, truncation to 240 chars, stack trace stripping, secret masking with mixed-case+digit base64/API key/PEM patterns), event cap at 20, terminal status transitions, RESET | `apps/web/src/hooks/useRunExecutionSocket.test.ts` |
| Execution events panel helpers — 26 tests: formatEventLabel for started/log/tool/completed/failed, unknown type fallback, color/label constant invariants, safety assertions (no raw HTML, no cwd, no workspace-write, no danger-full-access), hydration safety | `apps/web/src/app/projects/RunExecutionEventsPanel.test.ts` |
| Hook enabled gate — 3 tests: enabled option prevents socket connection, defaults to false, runId scoping | `apps/web/src/hooks/useRunExecutionSocket.test.ts` |
| Hook cleanup — 2 tests: disconnect on unmount, runId change triggers RESET | `apps/web/src/hooks/useRunExecutionSocket.test.ts` |
| Dynamic import safety — 1 test: socket.io-client imported inside useEffect | `apps/web/src/hooks/useRunExecutionSocket.test.ts` |

## C-OFFICE-RUN-EXECUTION-FRONTEND-006B Verification

```bash
pnpm --filter @squad/web exec vitest run src/lib/api.test.ts --passWithNoTests; echo "EXIT:$?"
pnpm exec tsc -p apps/web/tsconfig.json --noEmit; echo "EXIT:$?"
```

Notes:

- `executeRunDev` tests mock `fetch`; they do not run a backend or real Codex.
- Adapter coverage pins read-only-only payload behavior and confirms no `cwd`, `workspace-write`, `danger-full-access`, or raw command args are sent.

## C-OFFICE-RUN-EXECUTION-FRONTEND-006C Verification

```bash
pnpm --filter @squad/web exec vitest run src/app/projects/RunExecutionButton.test.ts --passWithNoTests; echo "EXIT:$?"
pnpm --filter @squad/web exec vitest run src/lib/api.test.ts --passWithNoTests; echo "EXIT:$?"
pnpm exec tsc -p apps/web/tsconfig.json --noEmit; echo "EXIT:$?"
```

Notes:

- Button tests exercise pure component helpers and the click handler without a backend or real Codex.
- Production branch is covered through the exported env guard because the current web test setup has no DOM component testing dependency.
- Execution event display is now implemented (see 006D below).

## C-OFFICE-RUN-EXECUTION-FRONTEND-006D Verification

```bash
pnpm --filter @squad/web exec vitest run src/hooks/useRunExecutionSocket.test.ts --passWithNoTests; echo "EXIT:$?"
pnpm --filter @squad/web exec vitest run src/app/projects/RunExecutionEventsPanel.test.ts --passWithNoTests; echo "EXIT:$?"
pnpm --filter @squad/web exec vitest run src/app/projects/RunExecutionButton.test.ts --passWithNoTests; echo "EXIT:$?"
pnpm --filter @squad/web exec vitest run src/lib/api.test.ts --passWithNoTests; echo "EXIT:$?"
pnpm exec tsc -p apps/web/tsconfig.json --noEmit; echo "EXIT:$?"
```

Notes:

- Reducer + sanitizer tests (27) are pure — no socket, no backend, no real Codex.
- Panel helper tests (24 + 2 hydration) are pure — no DOM, no socket, no backend.
- Button + adapter regression tests (10 + 11) confirm no breakage.
- Runtime socket integration testing deferred to 006E (needs running backend).

## C-OFFICE-RUN-EXECUTION-FRONTEND-ENV-FIX-006J Verification

```bash
pnpm --filter @squad/web exec vitest run src/app/projects/RunExecutionButton.test.ts --passWithNoTests; echo "EXIT:$?"
pnpm --filter @squad/web exec vitest run src/app/projects/RunExecutionEventsPanel.test.ts --passWithNoTests; echo "EXIT:$?"
pnpm --filter @squad/web exec vitest run src/hooks/useRunExecutionSocket.test.ts --passWithNoTests; echo "EXIT:$?"
pnpm --filter @squad/web exec vitest run src/lib/api.test.ts --passWithNoTests; echo "EXIT:$?"
pnpm exec tsc -p apps/web/tsconfig.json --noEmit; echo "EXIT:$?"
```

Static pattern check:
```bash
rg -n "const env = process.env|env\.NEXT_PUBLIC_ENABLE_LOCAL_CODEX_UI|process\.env\[[^\]]+\]" apps/web/src
```

Notes:
- RunExecutionButton tests exercise pure component helpers and the click handler without a backend or real Codex.
- Button tests now verify the env gate helpers work with direct process.env references (Next.js inlineable).
- Panel helper tests (26) are pure — no DOM, no socket, no backend.
- All targeted tests pass.
- Frontend TypeScript passes.

## C-OFFICE-RUN-EXECUTION-FRONTEND-SOCKET-READY-FIX-006M Verification

```bash
pnpm --filter @squad/web exec vitest run src/hooks/useRunExecutionSocket.test.ts --passWithNoTests; echo "EXIT:$?"
pnpm --filter @squad/web exec vitest run src/app/projects/RunExecutionEventsPanel.test.ts --passWithNoTests; echo "EXIT:$?"
pnpm --filter @squad/web exec vitest run src/app/projects/RunExecutionButton.test.ts --passWithNoTests; echo "EXIT:$?"
pnpm --filter @squad/web exec vitest run src/lib/api.test.ts --passWithNoTests; echo "EXIT:$?"
pnpm exec tsc -p apps/web/tsconfig.json --noEmit; echo "EXIT:$?"
```

Notes:
- `useRunExecutionSocket.test.ts` now has 43 tests (was 37): +7 enabled-gate tests (A–D + defaults + dynamic import), -1 removed duplicate.
- New tests use `@testing-library/react` `renderHook` + `jsdom` environment for hook lifecycle testing.
- Socket mock (`vi.mock('socket.io-client')`) used — no real backend, no real socket, no real Codex.
- Sanitizer pattern tests fixed: test data now correctly triggers regex patterns (40+ char mixed-case+digit, 20+ char sk-).
- 006M fix: `useEffect` dependency array changed from `[runId]` to `[runId, enabled]`.

## C-OFFICE-RUN-EXECUTION-FRONTEND-RUNTIME-006K (Previous)

## Lounge Rotation, Extracted Hooks, and Planner Abort Tests

| Area | File |
|---|---|
| Rotated furniture bodies match their footprint (`drawFurnitureObject`, rotation-aware `isoBox`) | `apps/web/src/components/lounge/pixiRoom.rotation.test.ts` |
| Station interaction points turn with rotated furniture | `apps/web/src/game/scene/loungeStations.test.ts` |
| Zabuton variant palettes + legacy aliases | `apps/web/src/components/lounge/furnitureCatalog.test.ts` |
| Lounge persistence / dorm tick / furniture drag (incl. rotated clamp) / dialogue scheduler hooks | `apps/web/src/hooks/use{LoungePersistence,DormTickLoop,FurnitureDrag,DialogueScheduler}.test.ts` |
| Planner request abort + parse-error handling | `apps/web/src/game/dialogue/dialogueAdapter.test.ts` |

```bash
pnpm --filter @squad/web exec vitest run src/components/lounge src/game/scene src/hooks src/game/dialogue --passWithNoTests; echo "EXIT:$?"
pnpm typecheck; echo "EXIT:$?"
```

`pnpm typecheck` builds `@squad/core` first (api/web resolve it from `packages/core/dist`), then runs `tsc --noEmit` in every workspace.

