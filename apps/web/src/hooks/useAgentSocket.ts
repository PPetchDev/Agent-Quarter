'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type {
    AgentStateChangedPayload,
    AgentTaskAssignedPayload,
    AgentTaskCompletedPayload,
    AgentErrorPayload,
    AgentEvent,
} from '@squad/core';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface UseAgentSocketOptions {
    /** If false, the hook returns no-op emitters and never connects. */
    enabled?: boolean;
}

export interface UseAgentSocketReturn {
    /** Latest event received (if any listener is active). */
    lastEvent: AgentEvent | null;
    /** Emit an agent state change event on the /lounge namespace. */
    emitStateChanged: (payload: Omit<AgentStateChangedPayload, 'timestamp'>) => void;
    /** Emit an agent task assignment event. */
    emitTaskAssigned: (payload: Omit<AgentTaskAssignedPayload, 'timestamp'>) => void;
    /** Emit an agent task completion event. */
    emitTaskCompleted: (payload: Omit<AgentTaskCompletedPayload, 'timestamp'>) => void;
    /** Emit an agent error event. */
    emitError: (payload: Omit<AgentErrorPayload, 'timestamp'>) => void;
}

function stamp<T extends Record<string, unknown>>(payload: T): T & { timestamp: string } {
    return { ...payload, timestamp: new Date().toISOString() };
}

export function useAgentSocket(options: UseAgentSocketOptions = {}): UseAgentSocketReturn {
    const { enabled = true } = options;
    const socketRef = useRef<Socket | null>(null);
    const [lastEvent, setLastEvent] = useState<AgentEvent | null>(null);

    // ── Connect / disconnect ──────────────────────────────────────────────
    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;
        let socket: Socket | null = null;

        void (async () => {
            const { io } = await import('socket.io-client');
            if (cancelled) return;

            socket = io(`${API_URL}/lounge`, {
                autoConnect: true,
                reconnectionAttempts: 3,
            });

            socketRef.current = socket;

            // Listen for incoming events (future use — currently log-only)
            const onEvent = (event: AgentEvent) => {
                if (!cancelled) setLastEvent(event);
            };
            socket.on('agent.state.changed', onEvent);
            socket.on('agent.task.assigned', onEvent);
            socket.on('agent.task.completed', onEvent);
            socket.on('agent.error', onEvent);
        })();

        return () => {
            cancelled = true;
            if (socket) {
                socket.disconnect();
                socketRef.current = null;
            }
        };
    }, [enabled]);

    // ── Emit helpers ──────────────────────────────────────────────────────
    const emitStateChanged = useCallback(
        (payload: Omit<AgentStateChangedPayload, 'timestamp'>) => {
            socketRef.current?.emit('agent.state.changed', stamp(payload));
        },
        [],
    );

    const emitTaskAssigned = useCallback(
        (payload: Omit<AgentTaskAssignedPayload, 'timestamp'>) => {
            socketRef.current?.emit('agent.task.assigned', stamp(payload));
        },
        [],
    );

    const emitTaskCompleted = useCallback(
        (payload: Omit<AgentTaskCompletedPayload, 'timestamp'>) => {
            socketRef.current?.emit('agent.task.completed', stamp(payload));
        },
        [],
    );

    const emitError = useCallback(
        (payload: Omit<AgentErrorPayload, 'timestamp'>) => {
            socketRef.current?.emit('agent.error', stamp(payload));
        },
        [],
    );

    return { lastEvent, emitStateChanged, emitTaskAssigned, emitTaskCompleted, emitError };
}
