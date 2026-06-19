import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import type {
    AgentStateChangedPayload,
    AgentTaskAssignedPayload,
    AgentTaskCompletedPayload,
    AgentErrorPayload,
} from '@squad/core';

/**
 * Lounge agent event gateway.
 *
 * Emits typed agent lifecycle events on the `/lounge` Socket.io namespace
 * so frontend clients can react to agent state changes in real time.
 *
 * Pattern: fire-and-forget emit (no DB, no persistence).
 * Matches the existing `RunsGateway` / `ClaudeGateway` conventions.
 */
@WebSocketGateway({
    namespace: '/lounge',
    cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' },
})
export class AgentGateway {
    @WebSocketServer()
    private readonly server!: Server;

    /** Emit when an agent changes state (idle → walking → coding → idle). */
    emitAgentStateChanged(payload: AgentStateChangedPayload): void {
        this.server?.emit('agent.state.changed', payload);
    }

    /** Emit when a task is assigned to an agent. */
    emitAgentTaskAssigned(payload: AgentTaskAssignedPayload): void {
        this.server?.emit('agent.task.assigned', payload);
    }

    /** Emit when an agent completes a task. */
    emitAgentTaskCompleted(payload: AgentTaskCompletedPayload): void {
        this.server?.emit('agent.task.completed', payload);
    }

    /** Emit when an agent encounters an error during task execution. */
    emitAgentError(payload: AgentErrorPayload): void {
        this.server?.emit('agent.error', payload);
    }
}
