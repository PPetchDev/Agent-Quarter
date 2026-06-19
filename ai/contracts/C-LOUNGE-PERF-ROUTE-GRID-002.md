# C-LOUNGE-PERF-ROUTE-GRID-002 - Shared Lounge Route Grid

## Status
PASS (2026-06-10)

## Goal
Reduce repeated `/lounge` route-planning input work by sharing one precomputed blocked-cell route grid across visible office walkers.

## Scope
- `apps/web/src/game/scene/loungePathGrid.ts`
- `apps/web/src/game/scene/loungePathGrid.test.ts`
- `apps/web/src/hooks/useAgentWalk.ts`
- `apps/web/src/components/lounge/LoungeCanvas.tsx`
- `ai/maps/*`
- `ai/patches/latest.md`
- `ai/handoff.md`

## Acceptance Criteria
- [x] Shared route grid is built once per committed room layout.
- [x] All five visible walkers receive the shared grid.
- [x] Fallback route planning remains available.
- [x] Route-grid reuse is tested.
- [x] Web/root verification and browser smoke pass.
- [x] Temporary ports are clean after closeout.

## Out Of Scope
- Pathfinding algorithm rewrite.
- UI redesign.
- Backend/API work.
- New dependencies.

## Closeout
Active risks: none.
