# C-EVENT-001 — Agent Event Model (Socket.io)

## Type
IMPLEMENT

## Mode
Full Contract

## Status
PASS (2026-06-19)

## Goal
Define Socket.io event schema for lounge agent state → character emotion mapping. Create `AgentGateway` backend + `useAgentSocket` frontend hook.

## Implementation Summary

### Slice A — Shared Event Types (packages/core)
- `agent-events.ts`: `AgentEventType`, `AgentLoungeState`, `AgentLoungeTaskType`, 4 payload types (`AgentStateChangedPayload`, `AgentTaskAssignedPayload`, `AgentTaskCompletedPayload`, `AgentErrorPayload`), `AgentEvent` union
- Barrel export via `packages/core/src/index.ts`

### Slice B — AgentGateway (apps/api)
- `AgentGateway` on `/lounge` namespace with 4 emit methods
- `AgentModule` exports gateway for injection
- Registered in `AppModule`

### Slice C — Frontend Hook (apps/web)
- `useAgentSocket()` with dynamic socket.io-client import (SSR-safe)
- `enabled` flag, auto-connect/disconnect, `lastEvent` state
- 4 emit helpers with auto-timestamp

### Slice D — Tests
- `agent-events.test.ts`: 5 type structural tests
- `agent.gateway.test.ts`: 5 no-server safety + payload shape tests
- `useAgentSocket.test.ts`: 8 jsdom tests (emit, connect, disconnect, listeners)

## Gate Results

| Gate | Result |
|------|--------|
| packages/core tests (57) | PASS |
| apps/api tests (116) | PASS |
| apps/web tests (313) | PASS |
| pnpm typecheck | EXIT:0 |
| pnpm lint | EXIT:0 |

## Files Changed
- `packages/core/src/agent-events.ts` (NEW)
- `packages/core/src/agent-events.test.ts` (NEW)
- `packages/core/src/index.ts` (+barrel)
- `apps/api/src/agents/agent.gateway.ts` (NEW)
- `apps/api/src/agents/agent.gateway.test.ts` (NEW)
- `apps/api/src/agents/agent.module.ts` (NEW)
- `apps/api/src/app.module.ts` (+AgentModule)
- `apps/web/src/hooks/useAgentSocket.ts` (NEW)
- `apps/web/src/hooks/useAgentSocket.test.ts` (NEW)

## Active Risks
None.
