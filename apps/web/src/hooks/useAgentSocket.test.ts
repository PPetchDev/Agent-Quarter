// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAgentSocket } from './useAgentSocket';

// Mock socket.io-client
const mockSocket = {
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
};
const mockIo = vi.fn(() => mockSocket);

vi.mock('socket.io-client', () => ({
    io: mockIo,
}));

describe('useAgentSocket', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns no-op emitters when disabled', () => {
        const { result } = renderHook(() => useAgentSocket({ enabled: false }));

        expect(() =>
            result.current.emitStateChanged({
                agentId: 'agent-1',
                characterId: 'mai',
                event: 'agent.state.changed',
                state: 'idle',
            }),
        ).not.toThrow();
        expect(mockIo).not.toHaveBeenCalled();
    });

    it('connects to /lounge namespace when enabled', async () => {
        renderHook(() => useAgentSocket({ enabled: true }));

        // Dynamic import is async — wait for microtask
        await act(async () => {
            await new Promise((r) => setTimeout(r, 50));
        });

        expect(mockIo).toHaveBeenCalledWith(
            expect.stringContaining('/lounge'),
            expect.objectContaining({ autoConnect: true }),
        );
    });

    it('emitStateChanged sends stamped payload', async () => {
        const { result } = renderHook(() => useAgentSocket({ enabled: true }));

        await act(async () => {
            await new Promise((r) => setTimeout(r, 50));
        });

        act(() => {
            result.current.emitStateChanged({
                agentId: 'agent-2',
                characterId: 'ren',
                event: 'agent.state.changed',
                state: 'walking',
                previousState: 'idle',
            });
        });

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'agent.state.changed',
            expect.objectContaining({
                agentId: 'agent-2',
                characterId: 'ren',
                state: 'walking',
                previousState: 'idle',
                timestamp: expect.any(String),
            }),
        );
    });

    it('emitTaskAssigned sends stamped payload', async () => {
        const { result } = renderHook(() => useAgentSocket({ enabled: true }));

        await act(async () => {
            await new Promise((r) => setTimeout(r, 50));
        });

        act(() => {
            result.current.emitTaskAssigned({
                agentId: 'agent-3',
                characterId: 'aki',
                event: 'agent.task.assigned',
                taskType: 'review',
            });
        });

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'agent.task.assigned',
            expect.objectContaining({
                agentId: 'agent-3',
                taskType: 'review',
                timestamp: expect.any(String),
            }),
        );
    });

    it('emitTaskCompleted sends stamped payload', async () => {
        const { result } = renderHook(() => useAgentSocket({ enabled: true }));

        await act(async () => {
            await new Promise((r) => setTimeout(r, 50));
        });

        act(() => {
            result.current.emitTaskCompleted({
                agentId: 'agent-4',
                characterId: 'yui',
                event: 'agent.task.completed',
                taskType: 'code',
                durationMs: 3000,
            });
        });

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'agent.task.completed',
            expect.objectContaining({
                taskType: 'code',
                durationMs: 3000,
                timestamp: expect.any(String),
            }),
        );
    });

    it('emitError sends stamped payload', async () => {
        const { result } = renderHook(() => useAgentSocket({ enabled: true }));

        await act(async () => {
            await new Promise((r) => setTimeout(r, 50));
        });

        act(() => {
            result.current.emitError({
                agentId: 'agent-5',
                characterId: 'mika',
                event: 'agent.error',
                error: 'Path blocked',
            });
        });

        expect(mockSocket.emit).toHaveBeenCalledWith(
            'agent.error',
            expect.objectContaining({
                error: 'Path blocked',
                timestamp: expect.any(String),
            }),
        );
    });

    it('disconnects on unmount', async () => {
        const { unmount } = renderHook(() => useAgentSocket({ enabled: true }));

        await act(async () => {
            await new Promise((r) => setTimeout(r, 50));
        });

        unmount();
        expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('listens for incoming agent events', async () => {
        renderHook(() => useAgentSocket({ enabled: true }));

        await act(async () => {
            await new Promise((r) => setTimeout(r, 50));
        });

        expect(mockSocket.on).toHaveBeenCalledWith('agent.state.changed', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('agent.task.assigned', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('agent.task.completed', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('agent.error', expect.any(Function));
    });
});
