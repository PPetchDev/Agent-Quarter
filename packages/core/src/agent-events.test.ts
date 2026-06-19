import { describe, expect, it } from 'vitest';
import type {
    AgentEvent,
    AgentStateChangedPayload,
    AgentTaskAssignedPayload,
    AgentTaskCompletedPayload,
    AgentErrorPayload,
} from './agent-events';

describe('AgentEvent types (structural)', () => {
    const base = {
        agentId: 'agent-1',
        characterId: 'mai',
        timestamp: '2026-06-19T12:00:00.000Z',
    };

    it('AgentStateChangedPayload satisfies AgentEvent', () => {
        const event: AgentStateChangedPayload = {
            ...base,
            event: 'agent.state.changed',
            state: 'coding',
            previousState: 'idle',
        };
        const cast: AgentEvent = event;
        expect(cast.event).toBe('agent.state.changed');
    });

    it('AgentTaskAssignedPayload satisfies AgentEvent', () => {
        const event: AgentTaskAssignedPayload = {
            ...base,
            event: 'agent.task.assigned',
            taskType: 'code',
            targetStationId: 'computer_desk',
        };
        const cast: AgentEvent = event;
        expect(cast.event).toBe('agent.task.assigned');
    });

    it('AgentTaskCompletedPayload satisfies AgentEvent', () => {
        const event: AgentTaskCompletedPayload = {
            ...base,
            event: 'agent.task.completed',
            taskType: 'review',
            durationMs: 5000,
        };
        const cast: AgentEvent = event;
        expect(cast.event).toBe('agent.task.completed');
    });

    it('AgentErrorPayload satisfies AgentEvent', () => {
        const event: AgentErrorPayload = {
            ...base,
            event: 'agent.error',
            error: 'Station not reachable',
            taskType: 'meeting',
        };
        const cast: AgentEvent = event;
        expect(cast.event).toBe('agent.error');
    });

    it('AgentEvent discriminates union', () => {
        const events: AgentEvent[] = [
            { ...base, event: 'agent.state.changed', state: 'idle' },
            { ...base, event: 'agent.task.assigned', taskType: 'rest' },
            { ...base, event: 'agent.task.completed', taskType: 'code' },
            { ...base, event: 'agent.error', error: 'timeout' },
        ];
        expect(events).toHaveLength(4);
        for (const ev of events) {
            expect(ev.agentId).toBe('agent-1');
            expect(ev.characterId).toBe('mai');
        }
    });
});
