# Active Contract

C-TILED-001 — Tiled Editor map import. **Status: PASS** (2026-07-01).

## Context

Consolidated duplicate Tiled parsers into canonical `tiledParser.ts` with auto-detect (property-based wx/wy/wz vs pixel-based x/y ÷ tilewidth). `roomDefs.ts` now re-exports from `tiledParser.ts`. Added `loadTiledMap()` + `isValidTiledJson()` to `roomLoader.ts`. Created `TiledMapImporter` component with drag-overlay + file picker, wired into LoungeCanvas action dock + viewport `onDrop`. Tests expanded from 6 → 12.

## Scope

- `apps/web/src/components/lounge/tiledParser.ts` — Canonical parser with auto-detect
- `apps/web/src/components/lounge/tiledParser.test.ts` — 12 tests (property + pixel formats, detection, defaults)
- `apps/web/src/components/lounge/roomDefs.ts` — Re-exports from tiledParser, removed duplicate types/parser
- `apps/web/src/components/lounge/roomLoader.ts` — Added `loadTiledMap()`, `isValidTiledJson()`
- `apps/web/src/components/lounge/TiledMapImporter.tsx` — Drag-drop + file picker UI
- `apps/web/src/components/lounge/LoungeCanvas.tsx` — Wired import button + viewport drop handler

## Next

Ready for C-RUN-001 — Lead spawns Member agents per todo item.
