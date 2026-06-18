# C-AGENT-SPINE-001 — Spine Agent Visual Layering and Asset Mapping

## Status
PASS (2026-06-08)

## Goal
Fix `/lounge` agent visuals so Spine characters are not covered or duplicated by overlay avatars, and wire the prepared Spine assets for the remaining visible agents.

## Scope
- `apps/web/src/components/lounge/LoungeCanvas.tsx`
- `apps/web/src/game/agents/officeWorkflow.ts`
- `apps/web/src/game/agents/agentTypes.ts`
- `apps/web/src/hooks/useAgentWalk.ts`
- `apps/web/src/game/scene/loungeStations.ts`
- `apps/web/public/azur-char/*`
- Optional focused helper/test files under web source
- `ai/maps/*`, `ai/patches/latest.md`, `ai/handoff.md`

## Acceptance Criteria
- [x] All visible office agents have deterministic Spine asset assignments.
- [x] The lounge renders one primary in-room visual per agent.
- [x] HTML/avatar overlays no longer cover Spine bodies.
- [x] Speech/status bubbles remain readable without hiding characters.
- [x] Movement/facing/task lifecycle behavior is preserved.
- [x] Pixi depth order remains coherent with furniture and other agents.
- [x] Focused tests, web typecheck, browser smoke, and visual overlap proof pass.

## Out Of Scope
- Backend/API changes.
- New dependencies.
- Furniture layout redesign.
- Projects/run lifecycle work.
