# Contract C-SPRITE-001 — Sprite asset pipeline

**Status:** ACTIVE
**Date:** 2026-06-30
**Goal:** Create pipeline for PNG/WebP furniture assets

## Context

The lounge currently uses PixiJS procedural drawing for furniture. This contract adds support for sprite-based furniture (PNG/WebP images) to enable richer visual variety and easier asset management.

## Scope

- `apps/web/src/components/lounge/spriteLoader.ts` (new) — Sprite asset loader
- `apps/web/src/components/lounge/pixiRoom.ts` — Integrate sprite rendering
- `apps/web/public/furniture/` — Sprite asset storage
- `apps/web/src/components/lounge/furnitureCatalog.ts` — Add sprite metadata

## Implementation Plan

1. **Sprite Loader**
   - Create `loadFurnitureSprites` function that loads PNG/WebP assets
   - Cache loaded sprites to avoid redundant network requests
   - Handle loading states and errors gracefully

2. **Rendering Integration**
   - Extend `FURNITURE_CATALOG` with optional `spritePath` per furniture type
   - Update `pixiRoom.ts` to use sprites when available, fallback to procedural drawing
   - Ensure sprites respect isometric projection and depth sorting

3. **Asset Management**
   - Define sprite naming convention (e.g., `computer_desk.png`, `bed.webp`)
   - Add sprite optimization step to build process (WebP conversion)
   - Document sprite dimensions and anchor points

## Verification

- All existing tests pass (486 total)
- New tests for sprite loading and fallback logic
- Browser QA: Sprites render correctly alongside procedural furniture
- TypeScript clean, lint clean

## Risks

- Sprite assets may not match procedural drawing dimensions exactly
- Need to ensure sprites don't break existing collision detection
