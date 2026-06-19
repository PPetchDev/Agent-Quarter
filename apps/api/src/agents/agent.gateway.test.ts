import { describe, expect, it } from 'vitest';
import { AgentGateway } from './agent.gateway';
import type {
    AgentStateChangedPayload,
    AgentTaskAssignedPayload,
    AgentTaskCompletedPayload,
    AgentErrorPayload,
} from '@squad/core';

const BASE = {
    agentId: 'agent-1',
    characterId: 'mai',
    timestamp: new Date().toISOString(),
};

describe('AgentGateway', () => {
    const gateway = new AgentGateway();

    // ── No-server safety ──────────────────────────────────────────────────

    it('emitAgentStateChanged does not throw without server', () => {
        const payload: AgentStateChangedPayload = {
            ...BASE,
            event: 'agent.state.changed',
            state: 'coding',
            previousState: 'idle',
        };
        expect(() => gateway.emitAgentStateChanged(payload)).not.toThrow();
    });

    it('emitAgentTaskAssigned does not throw without server', () => {
        const payload: AgentTaskAssignedPayload = {
            ...BASE,
            event: 'agent.task.assigned',
            taskType: 'code',
            targetStationId: 'computer_desk',
        };
        expect(() => gateway.emitAgentTaskAssigned(payload)).not.toThrow();
    });

    it('emitAgentTaskCompleted does not throw without server', () => {
        const payload: AgentTaskCompletedPayload = {
            ...BASE,
            event: 'agent.task.completed',
            taskType: 'review',
            durationMs: 5000,
        };
        expect(() => gateway.emitAgentTaskCompleted(payload)).not.toThrow();
    });

    it('emitAgentError does not throw without server', () => {
        const payload: AgentErrorPayload = {
            ...BASE,
            event: 'agent.error',
            error: 'Station not reachable',
            taskType: 'meeting',
        };
        expect(() => gateway.emitAgentError(payload)).not.toThrow();
    });

    // ── Payload shape ─────────────────────────────────────────────────────

    it('payloads carry agentId and characterId', () => {
        const payloads = [
            { ...BASE, event: 'agent.state.changed' as const, state: 'idle' as const },
            { ...BASE, event: 'agent.task.assigned' as const, taskType: 'rest' as const },
            { ...BASE, event: 'agent.task.completed' as const, taskType: 'code' as const },
            { ...BASE, event: 'agent.error' as const, error: 'timeout' },
        ];
        for (const p of payloads) {
            expect(p.agentId).toBe('agent-1');
            expect(p.characterId).toBe('mai');
            expect(p.timestamp).toBeTruthy();
        }
    });
});
