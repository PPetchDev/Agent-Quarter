# Test Map

_Updated: C-FURNITURE-GRID-001_

## Canonical Web Simulation Tests

| Area | File |
|---|---|
| Isometric projection | `apps/web/src/game/isometric/isoProjection.test.ts` |
| Task resolver mapping | `apps/web/src/game/agents/taskResolver.test.ts` |
| Task queue helpers | `apps/web/src/game/agents/taskQueue.test.ts` |
| Direction resolver | `apps/web/src/game/movement/direction.test.ts` |
| Movement helper | `apps/web/src/game/movement/moveToTarget.test.ts` |
| Grid path planner | `apps/web/src/game/movement/gridPath.test.ts` |
| Lounge blocked-cell routing | `apps/web/src/game/scene/loungePathGrid.test.ts` |
| Animation resolver | `apps/web/src/game/animation/animationResolver.test.ts` |
| Lounge furniture catalog | `apps/web/src/components/lounge/furnitureCatalog.test.ts` |
| Lounge furniture dimensions | `apps/web/src/components/lounge/roomDefs.test.ts` |

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
- Visual layout still requires manual browser inspection at `/lounge`.
