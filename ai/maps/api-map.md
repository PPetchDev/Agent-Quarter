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
| POST | `/api/tasks/:id/start` | `tasks` |
| PATCH | `/api/runs/:id/complete` | `runs` |
| PATCH | `/api/runs/:id/fail` | `runs` |
| PATCH | `/api/runs/:id/cancel` | `runs` |

## Socket Events

| Event | Direction | Area |
|---|---|---|
| `join_stage` | client -> server | `claude gateway` |
| `send_message` | client -> server | `claude gateway` |

## Frontend Route Clarification

- `/lounge` is the canonical simulation route.
- `/office` remains as a redirect compatibility route and is not a separate simulator.
