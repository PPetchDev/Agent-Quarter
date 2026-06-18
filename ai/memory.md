# Memory — Anime Agent Squad

_Compact durable memory. Target 800–1,200 words. Do not paste session logs here._
_Last updated: 2026-05-25 | C-SCAFFOLD-001 + C-DOMAIN-001_

---

## Stable Memory

### Product Direction

- 7 anime characters are live coding agents with distinct personalities and roles
- Characters: Mai (Frontend), Ren (Backend), Yui (Lead), Mika (UI), Aki (DevOps), Senko (Support), Shinobu (Strategist)
- Three pages: Lounge (isometric room), Stages (chat), Projects (orchestration)
- Lounge is isometric cavalier axonometric projection rendered with PixiJS v8
- Stages uses Claude API streaming with real-time emotion parsing from `[emotion:X]` tags
- Projects page is stubbed — not yet active

### Build Philosophy

- Small, reversible changes — no big-bang rewrites
- TypeScript strict throughout — `tsc --noEmit` must pass after every change
- pnpm workspaces monorepo — `packages/core` for shared types, `apps/api` Nest.js, `apps/web` Next.js
- Package manager: pnpm. Install: `pnpm install`. Dev: `pnpm dev` (parallel). Typecheck: `pnpm exec tsc -p <workspace>/tsconfig.json --noEmit`
- `pnpm build` requires `DATABASE_URL` env var (Prisma generates). SQLite dev DB at `apps/api/prisma/dev.db`
- All 3 workspaces pass `tsc --noEmit` as of 2026-05-25: `apps/web`, `apps/api`, `packages/core`
- Furniture and room data driven by JSON (maple_hideout.json) not hardcode
- Projection is dynamic: `setRoomProjection(cols, rows)` recalculates S/OX/OY to fit canvas

### Accepted Decisions

- **ADR-0001**: Kernel → Contract → Packet → Patch workflow adopted (2026-05-23)
- **C-WORKFLOW-002**: Command / Skill Layer added to workflow (2026-05-26). Commands in `ai/commands/`, skills in `ai/skills/`. Route by contract type — do not run all by default. graphify = targeted retrieval; caveman = compact output; impeccable = UI polish only; browser-harness = runtime UI debug only. Tool output must not be copied raw into memory. Contract scope > command behavior > curiosity.
- **C-WORKFLOW-003**: Skill wrapper consistency fix (2026-05-26). `ai/skills/graphify.md` created. All 4 skill wrappers now have When to Use, When Not to Use, Token Rules, Workflow Connection sections. All 6 commands confirmed present.
- **C-LOUNGE-003**: Lounge browser runtime QA PASS (2026-05-26). Dev server was running on port 3000. All 10 browser QA checks passed (Playwright). `theme` added to `useEffect([roomW, roomH, theme])` deps — 1 line fix. `tsc --noEmit` EXIT 0. Non-blocking: `yui/01-idle.jpg` missing Next.js `priority` prop (LCP warning only).
- **C-LOUNGE-002**: Lounge visual QA PASS (2026-05-26). Time-based theme, viewport 0.65, hit areas, overlay, depth — all verified via static analysis. `tsc --noEmit apps/web` EXIT 0. Browser QA NOT RUN (manual steps in patches). No product source changed.
- **Isometric factor**: `wy * S * 0.65` chosen over 0.5 for better depth perception (2026-05-22)
- **Hit areas**: `PIXI.Polygon` floor footprint used instead of AABB Rectangle (2026-05-22)
- **Depth sorting**: zIndex = `-backEdgeY` (back edge of tile footprint) not center Y (2026-05-22)
- **Canvas projection**: `computeRoomProjection(cols, rows)` — OX centers room, OY = CANVAS_H - 30 (2026-05-22)
- **Status labels**: `statusLabel` is `undefined` when character is idle/ready (not shown) (2026-05-22)
- **C-DOMAIN-001**: `packages/core` audited 2026-05-25 — stable and provider-agnostic. No Run/Task/Agent/AgentEvent types exist yet; those need future contracts. StageRuntimeState duplicated between `character.ts` and `stage-tracker.ts` — cosmetic only, not a blocker. No tests for `character.ts`.
- **C-STAGE-001**: Stage streaming audited 2026-05-25 — STABLE. `ClaudeService` uses Anthropic SDK async generator with per-chunk `parseEmotionOverride` + `stripEmotionTags`. `ClaudeGateway` manages per-character `StageTracker` with idle tier (ready→resting 30s→offline 90s). `mood_override` and `stage_state` use `server.emit()` not `server.to(room)` — cosmetic issue, filtered client-side by `characterId`. Module-level socket singleton in `useSocket.ts` is a dev HMR quirk only.

---

## Working Memory

### Current State (as of 2026-05-23)

**Lounge (apps/web/src/components/lounge/):**

- PixiJS v8 isometric room with dynamic projection
- Room size slider (roomW × roomH) — resizes floor, walls, tile grid
- Furniture drag/drop with polygon hit areas and correct depth sorting
- Shop modal, FurnitureInspector, character spots
- 3 active characters: mai, yui, senko (others commented out)
- Pool table removed from default layout
- `camTag` label is hover-only (`opacity-0 group-hover:opacity-100`)
- `statusLabel` only shows for sleeping/typing/thinking states

**Core files:**

- `pixiRoom.ts` — projection, drawing functions, `setRoomProjection()`, `computeRoomProjection()`
- `roomDefs.ts` — `FURNITURE_DIMS`, `FURNITURE_TILES`, `RoomObject`, collision detection
- `LoungeCanvas.tsx` — React component, state, drag logic, UI
- `roomLoader.ts` — PixiJS scene builder, hit areas, depth sorting
- `CharacterSpot.tsx` — character overlay with cutout sticker rendering

**Key projection constants (dynamic):**

- Default room: 9×7 tiles
- S ≈ 56 (default, recalculated by `setRoomProjection`)
- `proj(wx, wy, wz) = [OX + wx*S + wy*S*0.65, OY - wy*S*0.65 - wz*S]`

### Active Issues

- Room bottom slightly cut on small viewports (bed/nightstand visible at viewport edge)
- CSS scale min changed from 0.8 to 0.65 (desktop) / 0.55 (mobile) — C-LOUNGE-001
- Characters' world positions (wx, wy, wz) are floating-point — correct for visual but not grid-snapped
- `theme` was used inside `useEffect([roomW, roomH])` without deps array entry — FIXED in C-LOUNGE-003 (now `[roomW, roomH, theme]`)

### Current Next Direction

- Continue Lounge polish: furniture arrangement, character positioning
- Stage page: verify Claude API streaming works with updated character system
- Projects page: not yet started

### Do Not Revisit

- Do not re-litigate isometric projection formula — 0.65 factor is accepted
- Do not change pnpm to npm/yarn
- Do not rewrite `packages/core` character types without a contract
- Do not add back pool table to default layout
- Do not use AABB rectangles for furniture hit areas

---

## Evidence Pointers

_(Read these only if contract explicitly requires it)_

| Pointer                | File                                                             |
| ---------------------- | ---------------------------------------------------------------- |
| Full design spec       | `docs/superpowers/specs/2026-05-21-anime-agent-squad-design.md`  |
| Backend scaffold plan  | `docs/superpowers/plans/2026-05-21-plan-a-foundation-backend.md` |
| Frontend scaffold plan | `docs/superpowers/plans/2026-05-21-plan-b-frontend.md`           |
| Session archive        | `ai/sessions/archive/` (cold storage)                            |
