# API Map

_Updated: C-FURNITURE-GRID-001_

## API Change Scope

- No backend API changes were made by C-FURNITURE-GRID-001.
- This contract is frontend lounge furniture rendering/layout only.

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
| GET | `/api/tasks/:id/runs` | `tasks` |
| POST | `/api/tasks/:id/start` | `tasks` (returns `Run`) |
| PATCH | `/api/runs/:id/complete` | `runs` |
| PATCH | `/api/runs/:id/fail` | `runs` |
| PATCH | `/api/runs/:id/cancel` | `runs` |
| POST | `/api/dialogue/office` | `dialogue` (Claude-capable with deterministic fallback, no persistence) |
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
