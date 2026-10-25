# Agent Quarter

> A local-first workspace for planning projects and watching an AI agent squad collaborate in real time.

Agent Quarter gives small teams a playful shared surface for agent-assisted work: create a project, split it into tasks, assign character agents, watch work move through lounge, and continue conversations in stages.

**Status:** active prototype. Best for local development and trusted internal demos.

![License](https://img.shields.io/github/license/PPetchDev/Agent-Quarter)
![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6)
![pnpm](https://img.shields.io/badge/package%20manager-pnpm-F69220)

## What it includes

- **Lounge** — interactive isometric workspace with agent movement, task stations, furniture, and status overlays.
- **Stages** — character-oriented conversations and AI-powered dialogue.
- **Projects** — project, task, run, and handoff tracking.
- **Live updates** — Socket.IO gateways for agent and run events.
- **Local-first data** — Prisma with SQLite by default; no hosted service required for development.

## Stack

| Area        | Technology                                     |
| ----------- | ---------------------------------------------- |
| Web         | Next.js 15, React 19, PixiJS, Socket.IO client |
| API         | NestJS 11, Socket.IO, Prisma                   |
| Database    | SQLite                                         |
| AI dialogue | Anthropic SDK                                  |
| Tooling     | TypeScript, pnpm, Vitest                       |

## Quick start

### Requirements

- Node.js 20 or newer
- pnpm 9 or newer
- An Anthropic API key only if you want AI character dialogue

### Run locally

```bash
git clone https://github.com/PPetchDev/Agent-Quarter.git
cd Agent-Quarter
pnpm install
cp .env.example apps/api/.env
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). API starts at `http://127.0.0.1:3001`.

`apps/api/.env` defaults to a local SQLite database. Set `ANTHROPIC_API_KEY` there to enable AI dialogue. App remains usable without it, but dialogue requests will not succeed.

## Local configuration

```dotenv
# apps/api/.env
DATABASE_URL="file:./prisma/dev.db"
ANTHROPIC_API_KEY=
HOST=127.0.0.1
PORT=3001
WEB_ORIGIN=http://localhost:3000
```

Frontend uses `http://localhost:3001` by default. If API runs elsewhere, create `apps/web/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Security boundary

Current API has **no authentication or multi-user authorization**. Keep it bound to `127.0.0.1` and use only with trusted local data. Do not expose it to a LAN, public host, reverse proxy, or shared workstation until authentication, authorization, and production security review exist.

Local Codex execution is disabled by default. Never enable execution or write permissions for an untrusted workspace.

Read [SECURITY.md](SECURITY.md) before testing or deploying beyond one trusted developer machine.

## Commands

```bash
# Start web and API together
pnpm dev

# Run all tests
pnpm test

# Type-check all workspaces
pnpm typecheck

# Build all workspaces
pnpm build
```

## Project structure

```text
apps/
  api/        NestJS API, Prisma schema, Socket.IO gateways
  web/        Next.js UI and isometric lounge
packages/
  core/       Shared domain types and lifecycle helpers
ai/           Maintainer maps, contracts, and focused verification notes
```

## Contributing

Contributions, bug reports, UX feedback, and agent-workflow ideas welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md). For security-sensitive issues, do not open a public issue; follow [SECURITY.md](SECURITY.md).

## Roadmap

- Harden authentication and authorization for trusted team deployments.
- Add setup, architecture, and demo documentation for external contributors.
- Expand agent orchestration, task execution safety, and observable run history.
- Make shared workspaces practical without sacrificing local-first control.

## License

Released under [MIT](LICENSE).
