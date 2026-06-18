# C-DORM-AZUR-001 - Azur Lane Dorm System Parity

## Type
IMPLEMENT / VERIFY

## Mode
Full Contract

## Goal
Transform the lounge into an Azur Lane dorm-equivalent system: comfort, food/XP accrual,
per-character levels, morale, affection, headpat interaction, idle wandering, real per-floor
layouts, wallpaper themes, decor tokens, and offline accrual.

## User Evidence
- /goal: "ฉันต้องการให้โปรเจคนี้เหมือนกับเกม Azur Lane ระบบ dorm ทุกประการ ใช้ workflow ในการทำงานนะ"
- Existing lounge already has shop/coins/happiness/supplies/tap-collect/move-mode foundations.

## Azur Lane Mechanic Mapping
| AL Dorm | Implementation |
|---|---|
| Comfort | sum of placed furniture happiness values, displayed as Comfort; XP bonus `c/(c+100)` |
| Food gauge + feed items | dorm engine food units, drain per char per minute; SupplyPanel with 4 food items |
| Passive XP + levels | while food > 0 each char gains XP/min × comfort bonus; level curve |
| Morale | 0–150 per char, recovers in dorm, drains on task completion, emoji bands |
| Affection | 0–100 per char, passive gain + headpat (cooldown), named bands |
| Headpat | existing Spine tap rewired to affection gain + hearts |
| Tactical class (Train) | Train button grants XP to all chars + decor tokens, 4/day |
| Decor tokens | second currency, earned via Train/workflow, premium shop item |
| Offline accrual | savedAt timestamp; catch-up tick on load (cap 8h) + away summary toast |
| Chibi wandering | idle agents stroll to random free cells |
| 2nd floor | independent per-floor furniture layouts, floor switch swaps scene |
| Wallpaper | manual theme picker (auto/dawn/day/dusk/night) persisted |

## Scope (slices)
1. `apps/web/src/game/dorm/dormEngine.ts` + `dormEngine.test.ts` — pure engine (no PIXI/window/Date).
2. LoungeCanvas integration: comfort badge, food gauge, SupplyPanel feed UI, roster Lv/morale/affection,
   headpat rewire, task morale drain + XP, persistence v8 + offline catch-up, tokens, Train rework.
3. `useAgentWalk.walkToIso` + LoungeCanvas wander scheduler + focused test.
4. Per-floor layouts (floor 1/2 independent objects) + wallpaper picker via exported `ROOM_THEMES`.

## Files In Scope
- apps/web/src/game/dorm/dormEngine.ts (new)
- apps/web/src/game/dorm/dormEngine.test.ts (new)
- apps/web/src/components/lounge/SupplyPanel.tsx (new)
- apps/web/src/components/lounge/LoungeCanvas.tsx
- apps/web/src/components/lounge/ShopModal.tsx
- apps/web/src/components/lounge/furnitureCatalog.ts
- apps/web/src/components/lounge/pixiRoom.ts (export ROOM_THEMES/resolveRoomTheme only)
- apps/web/src/hooks/useAgentWalk.ts (+ walkToIso)
- apps/web/src/hooks/useAgentWalk.test.ts
- ai/maps/*.md, ai/active.* , ai/context-packet.md, ai/patches/latest.md, ai/changelog.md

## Out Of Scope
- Backend/API/Prisma changes. packages/core changes.
- Pathfinding algorithm rewrite. New dependencies.
- Spine asset changes. Office workflow planner changes.

## Acceptance Criteria
- [x] Dorm engine pure + unit-tested (comfort bonus, food drain, XP/level, morale, affection, headpat cooldown, offline cap).
- [x] /lounge HUD shows Comfort, Food gauge with real depletion ETA, per-char Lv/morale/affection.
- [x] Feeding via SupplyPanel consumes coins, adds food (cap 40000).
- [x] Headpat grants affection with 30s/char cooldown.
- [x] Task completion drains morale; rest restores extra.
- [x] Offline catch-up applies on load with away summary toast (cap 8h).
- [x] Idle agents wander to random free cells; office workflow unaffected.
- [x] Floor 1/2 keep independent layouts; both persist.
- [x] Wallpaper picker persists manual theme; auto remains default.
- [x] Web tests + tsc + root gates pass.

## Verification Commands
```bash
pnpm --filter @squad/web exec vitest run src/game/dorm/dormEngine.test.ts src/hooks/useAgentWalk.test.ts --passWithNoTests; echo "EXIT:$?"
pnpm --filter @squad/web test -- --run; echo "EXIT:$?"
pnpm exec tsc -p apps/web/tsconfig.json --noEmit; echo "EXIT:$?"
pnpm test; echo "EXIT:$?"
pnpm typecheck; echo "EXIT:$?"
pnpm lint; echo "EXIT:$?"
pnpm build; echo "EXIT:$?"
```

## Stop Conditions
- Stop if pathfinding/station semantics regress.
- Stop if changes leak into apps/api or packages/core.

## Closeout
PASS (2026-06-11). All four slices landed: pure dorm engine (25 tests), HUD integration with
SupplyPanel/comfort/tokens/roster stats/offline catch-up, idle wandering via `walkToIso`, per-floor
layouts + wallpaper picker. Two extra fixes surfaced by browser QA: `roomLoader.populateFurniture`
now preserves Spine displays across rebuilds, and persistence is gated on `roomReady` to stop the
mount-time default-state write from clobbering saved progress (pre-existing race). Verified: focused
29 tests, full web 283 tests, web tsc, root test/typecheck/lint/build, and live /lounge browser pass
(feed, train, floor toggle, wander, reload persistence, zero console errors over 20s).
Risk-fix pass (same day): token sink shipped — furniture priced in coins + decor tokens with shop gate;
addHappiness stale-ref fixed. Remaining: rate tuning after playtesting (backlog).
