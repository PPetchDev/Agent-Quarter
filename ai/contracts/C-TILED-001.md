# Contract C-TILED-001 — Tiled Editor map import

**Status:** ACTIVE
**Date:** 2026-06-30
**Goal:** Import room layouts from Tiled Editor JSON format

## Context

The lounge currently uses a custom JSON format for room layouts (`maple_hideout.json`). This contract adds support for importing maps from Tiled Editor, a popular 2D level editor, to enable easier room design and broader community contributions.

## Scope

- `apps/web/src/components/lounge/roomLoader.ts` — Room loading logic
- `apps/web/src/components/lounge/tiledParser.ts` (new) — Tiled JSON parser
- `apps/web/public/maps/` — Map file storage
- `ai/maps/feature-map.md` — Update with Tiled import feature

## Implementation Plan

1. **Tiled Parser**
   - Parse Tiled JSON export format (tile layers, object layers)
   - Convert Tiled tile IDs to furniture types
   - Extract furniture positions and rotations

2. **Room Loader Integration**
   - Add `loadTiledMap` function alongside existing `loadRoom`
   - Auto-detect format (custom JSON vs Tiled JSON)
   - Maintain backward compatibility with existing maps

3. **UI Support**
   - Add Tiled export instructions to room settings
   - Support drag-and-drop Tiled JSON files
   - Validate Tiled map structure before import

## Verification

- All existing tests pass (486 total)
- New tests for Tiled parser edge cases
- Browser QA: Successfully import Tiled JSON map
- TypeScript clean, lint clean

## Risks

- Tiled format may not map 1:1 to existing furniture system
- Need to handle Tiled version compatibility
