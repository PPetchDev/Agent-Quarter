# Symbol Index

_Updated: C-WORKFLOW-009 | Source: workflow context_

## packages/core/src/project.ts

| Symbol | Kind | Description |
|--------|------|-------------|
| `RunStartInput` | type | Input shape for starting a run |
| `getNextTaskForProject` | function | Returns next pending task for a project |
| `canStartTask` | function | Guard: task is in startable state |
| `canStartRun` | function | Guard: run can be started for project+task |
| `buildRunStartPatch` | function | Builds run-start payload |
| `completeRun` | function | Marks run complete |
| `failRun` | function | Marks run failed with error |
| `cancelRun` | function | Marks run cancelled |

## apps/api/src/claude/claude.gateway.ts

| Symbol | Kind | Description |
|--------|------|-------------|
| `ClaudeGateway` | class | Socket.io gateway, room-scoped emit |

## apps/api/src/projects/projects.controller.ts

| Symbol | Kind | Description |
|--------|------|-------------|
| `ProjectsController` | class | GET /projects, /projects/:id, /projects/:id/tasks |

## apps/api/src/projects/tasks.controller.ts

| Symbol | Kind | Description |
|--------|------|-------------|
| `TasksController` | class | GET /tasks/:id/runs |

## apps/web/src/hooks/useStageSocket.ts

| Symbol | Kind | Description |
|--------|------|-------------|
| `useStageSocket` | hook | Socket hook for stage chat panel |
