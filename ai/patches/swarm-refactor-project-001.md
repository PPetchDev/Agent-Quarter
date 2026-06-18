# Swarm Dispatch - C-REFACTOR-PROJECT-001

Use this task text for claude-flow swarm orchestration.

```md
Refactor `/Users/titiwat/Downloads/AnimeAgentSquad` with best practices across
the whole project, while preserving existing behavior.

Prime directive:
Mode -> Map -> Minimal Context -> Patch

This is project-wide in objective, but bounded in execution. Do not make one
large patch. Work one slice at a time and verify each slice before continuing.

Swarm topology:
- Coordinator: owns scope boundary, anti-drift checks, and merge order.
- Map Scout: reads `ai/maps/` before source reads and proposes risk-ranked slices.
- Web Refactor: handles Next/Pixi/lounge source cleanups.
- API Refactor: handles Nest/API cleanups only after map/source discovery.
- Core Refactor: handles `packages/core` only if contract-safe.
- Test/Parity: runs exact verification and rejects behavior drift.
- Workflow Recorder: updates patch/handoff with exact commands and results.

Required workflow:
1. Select mode before source reads.
2. Read maps first:
   - `ai/maps/repo-map.md`
   - `ai/maps/feature-map.md`
   - `ai/maps/symbol-index.md`
   - `ai/maps/api-map.md`
   - `ai/maps/test-map.md`
3. Read `ai/context-packet.md` and verify Packet ID/freshness against
   `ai/active.contract.md`.
4. First response must include:
   - selected mode
   - map files read
   - context freshness result
   - proposed slice backlog ordered by risk
   - first slice files expected to edit
   - exact verification commands
5. Patch at most 3-5 files per slice unless review explicitly approves more.
6. Preserve behavior:
   - routes and APIs unchanged
   - task timing, pathfinding, station targeting, queue behavior unchanged
   - Pixi/lounge rendering semantics unchanged unless the slice is visual QA gated
   - persistence keys and public contracts unchanged
7. Stop for review if:
   - new dependency is needed
   - architecture/ADR change is needed
   - behavior parity cannot be proven
   - verification requires out-of-scope reads

Verification gate for every web/lounge slice:
- `pnpm --filter @squad/web test -- --run; echo "EXIT:$?"`
- `pnpm exec tsc -p apps/web/tsconfig.json --noEmit; echo "EXIT:$?"`

If backend or package code changes, discover and run the narrow exact package
verification command too, then report the exact command string and result.

Final output for every slice:

## Status
PASS / PARTIAL / BLOCKED

## Changed
- path - reason

## Verified
- exact command - result

## Risks
- ...

## Next
- next bounded slice
```
