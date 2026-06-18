# Context Packet - P-DORM-AZUR-002

_Compiled for: Claude Code | Date: 2026-06-12 | Status: ACTIVE_

## Packet ID

`P-DORM-AZUR-002`

## Contract

`C-DORM-AZUR-002`

## User Problem

Deepen Azur Lane dorm parity with two follow-ups from C-DORM-AZUR-001:
1. **Furniture Interaction Slots** — Agents sit/sleep on beds, chairs, cushions with matching Spine animations.
2. **Rate Tuning** — Adjust dorm simulation constants (food drain, XP, morale/affection rates) based on playtesting.

## Required Reads

- AGENTS.md
- ai/maps/feature-map.md, ai/maps/symbol-index.md, ai/maps/test-map.md
- apps/web/src/game/dorm/dormEngine.ts
- apps/web/src/game/dorm/dormEngine.test.ts
- apps/web/src/game/scene/loungeStations.ts
- apps/web/src/hooks/useAgentWalk.ts
- apps/web/src/hooks/useAgentWalk.test.ts
- apps/web/src/components/lounge/LoungeCanvas.tsx (Spine anim mapping section)
- apps/web/src/components/lounge/roomDefs.ts (FURNITURE_DIMS, FURNITURE_TILES)

## Map Findings

### From feature-map.md
- Dorm engine: `apps/web/src/game/dorm/dormEngine.ts` (pure, no PIXI/window/Date)
- Lounge stations: `apps/web/src/game/scene/loungeStations.ts` — maps task types to furniture types via `furnitureType` field
- Current stations: `computerDesk`→`computer_desk`, `bookshelf`→`bookcase`, `meetingTable`→`low_table`, `documentDesk`→`document_board`, `printer`→`printer`, `sofa`→`bed`
- Chair/sit station is `meetingTable` using `low_table`; rest station is `sofa` using `bed`
- Spine anim mapping in LoungeCanvas: `SPINE_ANIM_CANDIDATES` maps `resting` → `['sit', 'sleep', 'normal', 'stand']`

### From symbol-index.md
- `walkToIso` in `useAgentWalk` — used for idle wandering, arrives in `idle` state
- `loungeStations` registry with `furnitureType` and `interactionOffset`
- `FURNITURE_DIMS` / `FURNITURE_TILES` in `roomDefs.ts` — seat/slot capacity derivable from footprint
- Current tune constants in `dormEngine.ts`:
  - `FOOD_DRAIN_PER_CHAR_PER_MIN = 60`
  - `XP_PER_MIN_BASE = 30`
  - `MORALE_RECOVERY_PER_MIN = 1`
  - `AFFECTION_PER_MIN = 0.06`
  - `HEADPAT_AFFECTION = 0.6`
  - `HEADPAT_COOLDOWN_MS = 30000`

## Implementation Intent

### Slice A — Furniture Interaction Slots
1. **Extend `loungeStations.ts`** station definitions with `interactionSlot` metadata:
   - `sofa` (bed): `{ fuzzy: true, anim: 'sleep', slotCount: 2 }`
   - `meetingTable` (low_table): `{ fuzzy: true, anim: 'sit', slotCount: 2 }` (when paired with zabuton)
   - `computerDesk`: `{ fuzzy: false, anim: 'normal', slotCount: 1 }`

2. **Modify `useAgentWalk.walkToIso`** to detect target furniture type on arrival:
   - If target is a `bed` with fuzzy slot → set agent state to a new `furnitureResting` or reuse `resting` with `arriveAnim: 'sleep'`
   - If target is `low_table`/`zabuton` → `arriveAnim: 'sit'`
   - Store `arriveAnim` on agent so Spine mapping picks correct animation

3. **Update LoungeCanvas Spine mapping** (`SPINE_ANIM_CANDIDATES`):
   - `resting` / new `furnitureResting` → prioritize `sleep` for bed, `sit` for low_table
   - Ensure one-shot `touch`/`motou` (headpat) still interrupts and queues calm correctly

### Slice B — Rate Tuning
Update constants in `dormEngine.ts`:
- `FOOD_DRAIN_PER_CHAR_PER_MIN: 60 → 45`
- `XP_PER_MIN_BASE: 30 → 40`
- `MORALE_RECOVERY_PER_MIN: 1 → 2`
- `AFFECTION_PER_MIN: 0.06 → 0.1`
- `HEADPAT_AFFECTION: 0.6 → 0.5`
- Add `COMFORT_BONUS_CAP = 0.5` and apply in `comfortXpBonus`
- Export `PLAYTEST_PRESET` object with tuned values for A/B comparison

## Verification Commands

```bash
# Focused dorm engine + walk tests
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

## Out Of Scope

- New furniture types or Spine assets.
- Backend/API/Prisma changes. `packages/core` changes.
- Pathfinding rewrite. Multi-agent collision on same slot (fuzzy = allow overlap).
- Office workflow planner changes.