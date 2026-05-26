# Repo Map

_Updated: C-WORKFLOW-009 | Source: workflow context_

## Monorepo Layout

```
AnimeAgentSquad/
├── apps/
│   ├── api/                      # NestJS backend (port 3001)
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── claude/
│   │   │   │   └── claude.gateway.ts   # Socket.io + Claude streaming
│   │   │   └── projects/
│   │   │       ├── projects.controller.ts
│   │   │       ├── tasks.controller.ts
│   │   │       ├── runs.controller.ts
│   │   │       └── projects.module.ts
│   │   ├── prisma/dev.db               # SQLite dev DB
│   │   └── tsconfig.json
│   └── web/                      # Next.js 15 frontend
│       ├── src/
│       │   ├── components/
│       │   │   ├── lounge/             # PixiJS isometric room
│       │   │   └── stages/
│       │   │       └── ChatPanel.tsx
│       │   └── hooks/
│       │       └── useStageSocket.ts
│       └── tsconfig.json
└── packages/
    └── core/                     # Shared domain logic
        ├── src/
        │   ├── character.ts
        │   ├── project.ts              # Run lifecycle helpers
        │   └── index.ts
        └── tsconfig.json
```

## Workflow Files

```
ai/
├── active.contract.md
├── active.task.md
├── context-packet.md
├── handoff.md
├── kernel.md
├── memory.md
├── maps/                    ← this directory
├── commands/
├── patches/latest.md
└── sessions/archive/        (cold storage — do not read)
```

## Root Config

```
AGENTS.md
CLAUDE.md
pnpm-workspace.yaml
tsconfig.json              (root — references only)
```
