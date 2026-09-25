# API Map

_Updated: backlog hardening (2026-09-25)_

## Cross-cutting

- Input validation: global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) from `apps/api/src/common/validation.ts`; DTOs in `projects/dto.ts`, `dialogue/dto.ts`, `claude/dto.ts`. Socket payloads use a per-`@MessageBody` pipe (gateway pipes would also hit `@ConnectedSocket`).
- Bind address: `HOST` env, default `127.0.0.1` (`apps/api/src/main.ts`). No auth — single-user local app.
- `POST /api/runs/:id/execute` also requires a loopback caller (`common/loopback.guard.ts`).
- Request source check (`common/request-origin.ts`): Origin, when present, must equal `WEB_ORIGIN`; Origin-less browser requests are allowed only with `Sec-Fetch-Site` same-origin/none (or none sent: curl, Node, Next SSR); while the resolved bind address is loopback the Host must be localhost/127.0.0.1/[::1] (DNS rebinding). Wired in `common/configure-app.ts` (used by `main.ts` and its integration test): `app.use` middleware before CORS, socket.io via `OriginCheckedIoAdapter` (`allowRequest` + normalized CORS origin) — engine.io traffic never reaches HTTP middleware.

## REST — NestJS

| Method | Path | Area |
|---|---|---|
| GET | `/api/characters` | `characters` |
| GET | `/api/characters/:id` | `characters` |
| GET | `/api/conversations/:characterId` | `conversations` |
| GET | `/api/conversations/:characterId/history` | `conversations` |
| GET | `/api/projects` | `projects` |
| GET | `/api/projects/:id` | `projects` |
| GET | `/api/projects/:id/tasks` | `projects` |
| POST/PATCH/DELETE | `/api/projects`, `/api/projects/:id` | `projects` |
| POST | `/api/projects/:id/tasks` | `projects` |
| PATCH/DELETE | `/api/projects/tasks/:taskId` | `projects` |
| GET | `/api/tasks/:id/runs` | `tasks` |
| POST | `/api/tasks/:id/start` | `tasks` (DB lookup; atomically todo → in_progress; returns `Run`) |
| POST | `/api/tasks/:id/release` | `tasks` (atomically in_progress → todo only; office demo releases `t-008` after each step) |
| PATCH | `/api/runs/:id/complete` | `runs` |
| PATCH | `/api/runs/:id/fail` | `runs` |
| PATCH | `/api/runs/:id/cancel` | `runs` |
| POST | `/api/dialogue/office` | `dialogue` (Claude-capable with deterministic fallback, no persistence) |
| POST | `/api/dialogue/plan-workflow` | `dialogue` (LLM planner, `commandText` ≤ 2000 chars) |
| POST | `/api/runs/:id/execute` | `runs` (dev-only, env-gated) |

## Socket Events

### Claude Gateway (root namespace)
| Event | Direction | Area |
|---|---|---|
| `join_stage` | client → server | `claude gateway` |
| `send_message` | client → server | `claude gateway` |

### Runs Gateway (namespace `/runs`)
| Event | Direction | Payload | Area |
|---|---|---|---|
| `run.started` | server → client | `{ run }` | `runs gateway` |
| `run.completed` | server → client | `{ run }` | `runs gateway` |
| `run.failed` | server → client | `{ run }` | `runs gateway` |
| `run.cancelled` | server → client | `{ run }` | `runs gateway` |
| `run.execution.started` | server → client | `RunExecutionStartedPayload` | `runs gateway` (no consumer yet) |
| `run.execution.log` | server → client | `RunExecutionLogPayload` | `runs gateway` (no consumer yet) |
| `run.execution.tool` | server → client | `RunExecutionToolPayload` | `runs gateway` (no consumer yet) |
| `run.execution.completed` | server → client | `RunExecutionCompletedPayload` | `runs gateway` (no consumer yet) |
| `run.execution.failed` | server → client | `RunExecutionFailedPayload` | `runs gateway` (no consumer yet) |

_Note: /runs events broadcast to all clients. Execution events are contract-only — no runner or frontend consumer exists yet._

## Frontend Route Clarification

- `/lounge` is the canonical simulation route.
- `/office` remains as a redirect compatibility route and is not a separate simulator.
