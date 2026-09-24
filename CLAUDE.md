@AGENTS.md

---

# Claude Code — Boot Rules

## Mode

- Default: **Micro Mode** (see AGENTS.md — Map-First Universal Agent Workflow)
- Use **Map Mode** when target files are unknown → read `ai/maps/` first
- Use **Lean Mode** for multi-file tasks with unknowns
- Workflow files (`ai/context-packet.md`, `ai/active.contract.md`, `ai/kernel.md`, `ai/handoff.md`) — read only in Lean/Full Contract mode

## Language

- Thai for user-facing communication
- English for workflow files, code, and technical docs

## Memory

- Do not rewrite `ai/memory.md` directly — propose via `ai/patches/latest.md`

## Stack

- Frontend: Next.js 15 (App Router), React 19, PixiJS v7, Tailwind — `apps/web/`
- Backend: NestJS 11, Socket.io 4, Prisma 5, Anthropic SDK — `apps/api/`
- Shared: TypeScript lib, character/mood types — `packages/core/`
- See `ai/maps/repo-map.md` for exact file locations before reading source

## Build & Environment

- `DATABASE_URL` required before `pnpm build` — Prisma runs during NestJS compilation
- Dev SQLite DB lives at `apps/api/prisma/dev.db`
- ESLint and Prettier are configured at the repo root; TypeScript strict mode remains the primary correctness gate
- Root `tsconfig.json` uses project references — workspace builds are isolated
- `pnpm typecheck` builds `@squad/core`, then runs `tsc --noEmit` in every workspace (`pnpm -r run typecheck`)

## Audit

- State PASS / PARTIAL / BLOCKED for every task
- Copy exact verification command strings in final output (see AGENTS.md Audit Rules)
- Check `ai/context-packet.md` Packet ID matches active contract before Lean/Full tasks
