# C-LOUNGE-003 — Time Theme: Split Day → Morning + Afternoon

## Type
IMPLEMENT

## Mode
Full Contract

## Goal
Refine the existing 4-period time theme system (dawn/day/dusk/night) into 5 periods matching the design spec §2.1 by splitting "day" into "morning" (เช้า) and "afternoon" (บ่าย).

## User Evidence
- Design spec §2.1 defines 5 time periods: กลางคืน/เช้าตรู่/เช้า/บ่าย/พระอาทิตย์ตก
- C-LOUNGE-002 audit found `getTimeTheme()` already exists with 4 periods; `day` (08:00–18:00) covers both "เช้า" and "บ่าย"
- User requested split to match spec exactly

## Scope (1 slice)

### Slice A — Split day → morning + afternoon
- **`pixiRoom.ts`**:
  - Change `RoomThemeKey` type: `'dawn' | 'day' | 'dusk' | 'night'` → `'dawn' | 'morning' | 'afternoon' | 'dusk' | 'night'`
  - Replace `day` theme with `morning` (blue sky, bright room) + `afternoon` (bright blue, full daylight)
  - Update `getTimeTheme()` time ranges:
    - `night`: 20:00–05:00 (was 21:00–05:00)
    - `dawn`: 05:00–07:30 (was 05:00–08:00)
    - `morning`: 07:30–12:00 (NEW)
    - `afternoon`: 12:00–17:00 (NEW)
    - `dusk`: 17:00–20:00 (was 18:00–21:00)
  - Update `ROOM_THEME_KEYS` array
- **`LoungeCanvas.tsx`**: No changes needed — `RoomThemeKey` type flows through `useState<'auto' | RoomThemeKey>` and picker renders `ROOM_THEME_KEYS` dynamically
- **Persistence**: Existing `themeKey` values — `'day'` won't exist anymore. Add migration: if stored key is `'day'`, resolve to `'morning'` (safe default)

## Files In Scope
- `apps/web/src/components/lounge/pixiRoom.ts`
- `ai/active.contract.md`, `ai/context-packet.md`, `ai/patches/latest.md`, `ai/handoff.md`, `ai/changelog.md`

## Out Of Scope
- Backend/API/Prisma changes
- `packages/core` changes
- New visual assets or Spine changes
- UI redesign

## Acceptance Criteria
- [ ] 5 themes: dawn, morning, afternoon, dusk, night
- [ ] Time boundaries match spec: night(20-5), dawn(5-7:30), morning(7:30-12), afternoon(12-17), dusk(17-20)
- [ ] `'day'` key in localStorage gracefully falls back to `'morning'`
- [ ] Room settings picker shows 5 options + auto
- [ ] All existing tests pass
- [ ] TypeScript clean

## Verification Commands
```bash
pnpm --filter @squad/web test -- --run; echo "EXIT:$?"
pnpm exec tsc -p apps/web/tsconfig.json --noEmit; echo "EXIT:$?"
pnpm lint; echo "EXIT:$?"
```

## Stop Conditions
- Stop if tests regress
- Stop if TypeScript errors
