# C-DORM-AZUR-002 - Dorm Follow-up: Furniture Interaction Slots + Rate Tuning

## Type
IMPLEMENT / VERIFY

## Mode
Full Contract

## Goal
Deepen Azur Lane dorm parity with two focused enhancements:
1. **Furniture Interaction Slots** — Agents sit/sleep on beds, chairs, cushions with matching Spine animations (deeper AL dorm parity).
2. **Rate Tuning** — Adjust dorm simulation constants (food drain, XP, morale/affection rates) based on playtesting feedback.

## User Evidence
- From C-DORM-AZUR-001 closeout: "Remaining: furniture interaction slots; rate tuning after playtesting (backlog)."
- Azur Lane dorm: characters occupy specific furniture (beds, sofas, chairs) with bespoke idle/sleep/sit animations.
- Playtest feedback: food drains too fast / morale recovery feels slow / XP curve too flat.

## Scope (slices)

### Slice A — Furniture Interaction Slots
- Extend `loungeStations.ts` with `interactionSlot` metadata per furniture type:
  - `bed` → `{ fuzzy: true, anim: 'sleep', slotCount: 2 }` (head/foot)
  - `low_table` + `zabuton` → `{ fuzzy: true, anim: 'sit', slotCount: 2 }`
  - `computer_desk` → `{ fuzzy: false, anim: 'normal', slotCount: 1 }` (only during `code`/`review`)
- `useAgentWalk.walkToIso` (dorm wandering): when target is a bed/low_table, agent arrives → plays `sit`/`sleep` animation instead of looping `walk`.
- `Spine animation mapping` (LoungeCanvas.tsx): add `resting` → `sit`/`sleep` priority; ensure one-shot `touch`/`motou`(headpat) still queues correctly.
- Do **not** add new station types — reuse existing `sofa`/`rest` mapping but allow multiple agents on one furniture if `slotCount > 1`.
- Persist no new data — purely visual/animation behavior.

### Slice B — Rate Tuning
- Adjust constants in `dormEngine.ts` based on playtest targets:
  - **Food drain**: reduce from `60` → `45` per char/min (slower depletion, ~15h full gauge vs 11h).
  - **XP base**: increase from `30` → `40` per char/min (faster leveling, ~25min Lv1→2 at comfort 0).
  - **Morale recovery**: increase from `1` → `2` per min (visible recovery during rest).
  - **Affection passive**: increase from `0.06` → `0.1` per min (harder to cap without headpats).
  - **Headpat affection**: reduce from `0.6` → `0.5` (balance with higher passive).
  - **Comfort bonus scaling**: keep `c/(c+100)` but cap effective bonus at `0.5` (comfort 100).
- Add `PLAYTEST_PRESET` export for easy A/B comparison (opt-in via env or dev panel).

## Files In Scope
- `apps/web/src/game/dorm/dormEngine.ts` (+ `dormEngine.test.ts`)
- `apps/web/src/game/scene/loungeStations.ts`
- `apps/web/src/hooks/useAgentWalk.ts` (+ `useAgentWalk.test.ts`)
- `apps/web/src/components/lounge/LoungeCanvas.tsx` (Spine anim mapping only)
- `ai/maps/*.md`, `ai/active.*`, `ai/context-packet.md`, `ai/patches/latest.md`, `ai/changelog.md`

## Out Of Scope
- New furniture types or Spine assets.
- Backend/API/Prisma changes. `packages/core` changes.
- Pathfinding rewrite. Multi-agent collision on same slot (fuzzy = allow overlap).
- Office workflow planner changes.

## Acceptance Criteria
### Furniture Interaction Slots
- [ ] Agents wandering to a `bed` arrive and play `sleep` animation (loop) until next task/wander.
- [ ] Agents wandering to `low_table`+`zabuton` arrive and play `sit` animation (loop).
- [ ] Multiple agents can simultaneously occupy the same `bed` (slotCount=2, fuzzy overlap).
- [ ] Headpat one-shot animation (`touch`/`motou`) still plays and queues calm correctly.
- [ ] No regression: task-driven agents (code/research/meeting/document/print/rest) work as before.

### Rate Tuning
- [ ] Food gauge 12000 → 0 takes ~15h for 1 character (was ~11h).
- [ ] Lv1→2 at comfort 0 takes ~25min (was ~33min).
- [ ] Morale 0 → 150 passive takes ~75min (was ~150min).
- [ ] Affection 50 → 100 passive takes ~8.3h (was ~13.9h).
- [ ] All existing dorm engine unit tests pass with updated expected values.
- [ ] `PLAYTEST_PRESET` exported and documented in code.

## Verification Commands
```bash
# Focused dorm engine tests (updated constants)
pnpm --filter @squad/web exec vitest run src/game/dorm/dormEngine.test.ts src/hooks/useAgentWalk.test.ts --passWithNoTests; echo "EXIT:$?"

# Full web test suite
pnpm --filter @squad/web test -- --run; echo "EXIT:$?"

# TypeScript
pnpm exec tsc -p apps/web/tsconfig.json --noEmit; echo "EXIT:$?"

# Root gates
pnpm test; echo "EXIT:$?"
pnpm typecheck; echo "EXIT:$?"
pnpm lint; echo "EXIT:$?"
pnpm build; echo "EXIT:$?"
```

## Stop Conditions
- Stop if Spine animation glitches (agent stuck in wrong anim, flickering).
- Stop if pathfinding/station semantics regress.
- Stop if changes leak into `apps/api` or `packages/core`.
- Stop if new dependencies introduced.

## Closeout
[To be filled on completion]