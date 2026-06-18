# Patch — C-DORM-AZUR-001 (Azur Lane Dorm System Parity)

## Status
PASS

## Changed
- apps/web/src/game/dorm/dormEngine.ts (new) — pure dorm engine: comfort sum + `c/(c+100)` XP bonus,
  food gauge (cap 40000, drain 60/char/min), fractional XP + level curve, morale 0–150 with bands,
  affection 0–100 with bands, headpat (+0.6, 30s cd), task morale deltas, training XP, offline cap 8h.
- apps/web/src/game/dorm/dormEngine.test.ts (new) — 25 unit tests.
- apps/web/src/components/lounge/SupplyPanel.tsx (new) — feed UI with 4 AL-style food items.
- apps/web/src/components/lounge/LoungeCanvas.tsx — dorm state + 10s tick, comfort/tokens/food HUD chips,
  roster Lv/morale/affection, headpat rewired to affection, low-food reward penalty, Train → XP class +
  decor tokens, workflow-done tokens, SupplyPanel + Feed buttons, wander scheduler (9s), per-floor
  layouts with floor-2 starter template + walker clear on switch, wallpaper picker, persistence v8
  (both floors, dorm, tokens, themeKey, savedAt; v7 fallback) gated on roomReady, offline catch-up toast.
- apps/web/src/hooks/useAgentWalk.ts — `walkToIso` wander API (idle-only, never errors, cancelled on
  layout change); re-plan effect guards stationless strolls.
- apps/web/src/hooks/useAgentWalk.test.ts — +2 wander tests.
- apps/web/src/components/lounge/pixiRoom.ts — exported `RoomThemeKey`, `ROOM_THEME_KEYS`, `resolveRoomTheme`.
- apps/web/src/components/lounge/roomLoader.ts — `populateFurniture` removes only tracked furniture
  containers so Spine agent displays survive rebuilds (fixes chibis vanishing on floor switch/room resize).
- ai/maps/{repo,feature,symbol-index,test}-map.md — dorm entries.
- .claude/launch.json — preview dev-server config pointed at the worktree.
- apps/web/src/components/lounge/furnitureCatalog.ts — `tokenCost` on every item (AL dual-currency
  furniture pricing, 1–7 tokens scaled to comfort value) + focused catalog test.
- apps/web/src/components/lounge/ShopModal.tsx — tokens prop, 🎀 header chip, per-item token price,
  dual-currency affordability gate ("Need coins" / "Need tokens").
- apps/web/src/components/lounge/LoungeCanvas.tsx — INITIAL_TOKENS 20, task completion +1 token,
  purchase deducts coins + tokens (tokensRef), `addHappiness` rewritten as pure functional update
  with max-toast moved to an effect (stale-ref double-click risk closed).

## Verified
- `pnpm --filter @squad/web exec vitest run src/game/dorm/dormEngine.test.ts src/hooks/useAgentWalk.test.ts --passWithNoTests; echo "EXIT:$?"` — 2 files / 29 tests, EXIT:0
- `pnpm --filter @squad/web test -- --run; echo "EXIT:$?"` — 24 files / 283 tests, EXIT:0
- `pnpm exec tsc -p apps/web/tsconfig.json --noEmit; echo "EXIT:$?"` — EXIT:0
- `pnpm test; echo "EXIT:$?"` — EXIT:0
- `pnpm typecheck; echo "EXIT:$?"` — EXIT:0
- `pnpm lint; echo "EXIT:$?"` — EXIT:0
- `pnpm build; echo "EXIT:$?"` — EXIT:0 (first attempt failed only because the dev server was writing
  `.next` concurrently; clean run passes)
- Browser (preview, port 3001, worktree): /lounge renders dorm HUD; SupplyPanel feed −50 coins +1000 food;
  Train ×2 → +4 tokens + level-ups; floor toggle keeps Spine agents and seeds floor-2 layout; wander
  shows idle agents Moving; reload preserves Lv/tokens/coins (v8); 20s console error counter = 0.

## Risk Fixes (2026-06-11, second pass)
- Token sink shipped: all furniture now priced in coins + decor tokens; earn loop = Train (+2),
  workflow done (+3), task completion (+1); INITIAL_TOKENS 20 so fresh saves can buy starter items.
- `addHappiness` stale-ref fixed via functional setState; max-happiness toast via effect.
- Verified: web 284 tests, web tsc, root test/typecheck/lint/build all EXIT:0; browser pass —
  shop shows 🎀 prices + gate, buying nightstand deducted 80 🪙 + 1 🎀, 15s console errors = 0.

## Remaining Risks
- Tuning constants approximate AL feel (drain/XP/morale/token prices) — adjust in dormEngine /
  furnitureCatalog constants after playtesting.

## Next
- Furniture interaction slots (sit/sleep animations on chairs/beds) for deeper AL parity.
