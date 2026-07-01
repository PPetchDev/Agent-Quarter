# Contract C-LOUNGE-002 — Time-based theme system

**Status:** ACTIVE
**Date:** 2026-06-30
**Goal:** Sky/wall/floor/lighting changes based on client time

## Context

The lounge currently has a manual wallpaper theme picker but lacks automatic time-based theme transitions. This contract implements design spec §2.1 vision of dynamic time-based theming (dawn, morning, afternoon, dusk, night).

## Scope

- `apps/web/src/components/lounge/pixiRoom.ts` — Room rendering and theme resolution
- `apps/web/src/components/lounge/LoungeCanvas.tsx` — Theme picker UI and auto-theme logic
- `apps/web/public/maps/` — Theme asset references

## Implementation Plan

1. **Time Period Definition**
   - Define 5 time periods: dawn (05:00–07:30), morning (07:30–12:00), afternoon (12:00–17:00), dusk (17:00–20:00), night (20:00–05:00)
   - Map each period to theme colors (sky, wall, floor, lighting)

2. **Auto-Theme Logic**
   - Add `useAutoTheme` hook that checks current time
   - Update `resolveRoomTheme` to support 'auto' that resolves to time-based theme
   - Set default themeKey to 'auto' on fresh load

3. **Visual Assets**
   - Create or reference theme-specific visual assets per period
   - Ensure smooth transitions between themes

## Verification

- All existing tests pass (486 total)
- New tests for time period resolution
- Browser QA: Theme changes automatically as time passes
- TypeScript clean, lint clean

## Risks

- Time-based theme may conflict with user manual overrides
- Need to ensure theme assets exist for all 5 periods
