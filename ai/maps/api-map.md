# API Map

_Updated: C-WORKFLOW-009_

## REST — NestJS (port 3001)

| Method | Path | Controller | Notes |
|--------|------|-----------|-------|
| GET | `/projects` | `projects.controller.ts` | List all projects |
| GET | `/projects/:id` | `projects.controller.ts` | Single project |
| GET | `/projects/:id/tasks` | `projects.controller.ts` | Tasks for project |
| GET | `/tasks/:id/runs` | `runs.controller.ts` | Runs for task |

## Socket.io — ClaudeGateway

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-stage` | client → server | Join a stage room |
| `leave-stage` | client → server | Leave a stage room |
| `send-message` | client → server | Send chat message |
| `agent-response` | server → client | Streaming agent response |
| `agent-emotion` | server → client | Character mood update |

## Env Vars

```bash
DATABASE_URL=file:./prisma/dev.db
ANTHROPIC_API_KEY=...
NEXT_PUBLIC_API_URL=http://localhost:3001
```
