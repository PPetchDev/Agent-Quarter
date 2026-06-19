# C-LOUNGE-PERF-RAF-001 - Lounge Agent Idle RAF Optimization

## Status
PASS (2026-06-10)

## Goal
Reduce `/lounge` idle CPU work by ensuring idle agent walkers do not keep a `requestAnimationFrame` loop alive.

## Scope
- `apps/web/src/hooks/useAgentWalk.ts`
- `apps/web/src/hooks/useAgentWalk.test.ts`
- `apps/web/vitest.config.ts`
- `ai/maps/test-map.md`
- `ai/verification/lounge-smoke.mjs`
- `ai/patches/latest.md`
- `ai/handoff.md`

## Acceptance Criteria
- [x] Idle `useAgentWalk` does not schedule RAF.
- [x] Assigning a task starts the RAF loop.
- [x] Clearing a task cancels the loop.
- [x] Existing web tests pass.
- [x] Web TypeScript passes.
- [x] Workflow artifacts point to this contract after closeout.
- [x] Root test/typecheck/build/lint pass.
- [x] Browser smoke passes on a verified AnimeAgentSquad local server.
- [x] Temporary browser/dev ports are clean after closeout.

## Out Of Scope
- Backend/API changes.
- Pathfinding rewrite.
- Visual lounge redesign.
- New runtime dependencies.
- Full project performance audit.

## Closeout
Active risks: none.
