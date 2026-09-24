# Contract C-MOBILE-001 — Mobile responsive Lounge

**Status:** ACTIVE
**Date:** 2026-06-30
**Goal:** Make Lounge fully responsive for mobile devices

## Context

The lounge currently has basic mobile HUD responsiveness but the canvas and interaction model are still desktop-first. This contract makes the entire lounge experience mobile-friendly with touch-optimized controls and responsive canvas sizing.

## Scope

- `apps/web/src/components/lounge/LoungeCanvas.tsx` — Canvas and interaction logic
- `apps/web/src/components/lounge/pixiRoom.ts` — Room projection and rendering
- `apps/web/src/components/lounge/roomDefs.ts` — Mobile-friendly furniture dimensions
- Tailwind CSS responsive classes in lounge components

## Implementation Plan

1. **Responsive Canvas**
   - Auto-resize canvas based on viewport width/height
   - Adjust isometric projection scale for smaller screens
   - Ensure touch events work reliably (tap, drag, pinch-zoom)

2. **Mobile Controls**
   - Add mobile-specific control overlay (zoom buttons, floor toggle)
   - Optimize touch hit areas for furniture and agents
   - Add mobile-friendly furniture shop modal

3. **Layout Adjustments**
   - Reduce furniture footprint on mobile (smaller grid)
   - Adjust agent positions for mobile view
   - Ensure HUD elements don't overlap canvas on small screens

## Verification

- All existing tests pass (486 total)
- New tests for responsive canvas sizing
- Browser QA: Test on mobile viewport sizes (375px, 414px, etc.)
- TypeScript clean, lint clean

## Risks

- Mobile performance may be slower with PixiJS rendering
- Touch interactions may conflict with existing mouse events
- Need to balance detail vs performance on mobile
