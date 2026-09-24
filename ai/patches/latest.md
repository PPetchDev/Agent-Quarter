# Patch Report — Maple Hideout Pathing Fix

**Date:** 2026-07-01

## Issue

Furniture placements in `public/maps/maple_hideout.json` blocked/narrowed the navigable floor grid too much:
- `zabuton` at `(0,6)` plus adjacent items ate into the bottom-left corridor and created dead-end pressure on paths from `defaultStart (3,0.65)`.
- Route tests were still passing, but runtime traversal for some task targets looked constrained.

## Fix

Single-data-only change in `maple_hideout.json`:
- Moved furnishing type `zabuton` Reading Cushion id#12 from `(0,6)` → `(0,2)` to open the lower-left approach and preserve aisle flow near the bed/nightstand area.

No schema, parser, service, or component changes.

## Verified

- `pnpm -r run test` — 501 PASS (57 core + 119 api + 325 web)
- `pnpm exec tsc -p apps/web/tsconfig.json --noEmit` — clean
- `pnpm exec tsc -p apps/api/tsconfig.json --noEmit` — clean
- `pnpm exec tsc -p packages/core/tsconfig.json --noEmit` — clean
- `pnpm -r run lint` — clean

## Risk

Low. Data-only placement tweak; noise tests/assets untouched.

## Next

Likely C-SPRITE-001 sprite pipeline, if desired.
