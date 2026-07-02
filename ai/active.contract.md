# Active Contract

C-SPRITE-001 — Sprite asset pipeline. **Status: ACTIVE** (2026-07-01).

## Context

C-RUN-001 + C-LOUNGE-002 closed as PASS. Cleaned up RunsService `(task as any)` → proper `Task` typing, extracted `clearMemberAgents()` helper, switched from UUID-based member IDs to character-name pool (ren, mika, aki, senko, shinobu).

## Next Contract: C-SPRITE-001

**Goal:** Create pipeline for PNG/WebP furniture assets — replace procedural drawing with sprite-based rendering.

**Scope:**
- `apps/web/src/components/lounge/spriteLoader.ts` (new)
- `apps/web/src/components/lounge/pixiRoom.ts`
- `apps/web/public/furniture/`
- `apps/web/src/components/lounge/furnitureCatalog.ts`

**Implementation Plan:**
1. Sprite Loader — `loadFurnitureSprites()`, cache, loading states, error handling
2. Rendering — extend `FURNITURE_CATALOG` with optional `spritePath`, update `pixiRoom.ts` for sprite fallback
3. Asset Management — naming convention, optimization, documentation

**Delegated to:** Claude Code (one-shot via `claude -p`)

## Completed

- C-TILED-001 — Tiled Editor map import (PASS 2026-07-01)
- C-RUN-001 — Run/task lifecycle + member agents (PASS 2026-07-01, code cleanup)
- C-LOUNGE-002 — Time-based theme (PASS 2026-07-01, already implemented)
