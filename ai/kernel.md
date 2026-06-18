# Kernel — Anime Agent Squad
_Compact project truth. Keep under 400 words. Do not expand without review._

## Project
**Name:** Anime Agent Squad
**Phase:** 2 — Lounge polish + core interaction
**North Star:** A multi-agent AI workspace where 7 anime characters act as live coding agents, each with personality, role, and real-time emotion animation driven by Claude API.

## Tech Stack
- **Frontend:** Next.js 15 · Tailwind CSS · PixiJS v7 + pixi-spine 4 (isometric lounge, Spine 3.8)
- **Backend:** Nest.js · Socket.io · Prisma · PostgreSQL
- **AI:** Anthropic SDK · claude-sonnet-4-6 · streaming
- **Monorepo:** pnpm workspaces — `packages/core`, `apps/api`, `apps/web`

## Source of Truth Files
| File | Purpose |
|------|---------|
| `docs/superpowers/specs/2026-05-21-anime-agent-squad-design.md` | Product design spec (primary) |
| `docs/superpowers/plans/2026-05-21-plan-a-foundation-backend.md` | Backend scaffold plan |
| `docs/superpowers/plans/2026-05-21-plan-b-frontend.md` | Frontend scaffold plan |
| `ai/memory.md` | Compact durable memory |
| `ai/active.contract.md` | Current definition of done |
| `ai/context-packet.md` | Current execution context |

## Current Build Boundary
- Lounge isometric room (PixiJS) — interaction, furniture drag, room resize
- Stage chat panel — Claude API streaming, character mood
- Projects page — stub only, not yet active

## Global Constraints
- Do not break existing Next.js or Nest.js build
- Do not change application architecture without a new ADR
- TypeScript strict — all changes must pass `tsc --noEmit`
- Characters and their mood system (`packages/core`) are stable — do not refactor without contract
- pnpm only — no npm or yarn commands

## Memory Rules
- `ai/sessions/archive/` is cold storage — do not read by default
- `docs/superpowers/plans/` are evidence pointers — do not paste full content into packets
- Contract scope beats agent creativity — if it is not in the contract, do not build it
- Only approved deltas survive into `ai/memory.md`

## Workflow
**Kernel → Contract → Packet → Patch**
1. Read `ai/kernel.md` (this file) for project truth
2. Read `ai/active.contract.md` for definition of done
3. Read `ai/context-packet.md` for execution context
4. Produce output as patch in `ai/patches/latest.md`
5. Do not rewrite memory directly
