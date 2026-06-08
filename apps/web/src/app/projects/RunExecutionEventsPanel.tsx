'use client';

import { useEffect, useState } from 'react';
import {
    useRunExecutionSocket,
    type ExecutionEvent,
    type ExecutionTerminalStatus,
} from '../../hooks/useRunExecutionSocket';

// ─── Display helpers (pure, testable) ─────────────────────────

export const EVENT_COLOR: Record<string, string> = {
    started: 'text-[#93c5fd]',
    log: 'text-white/60',
    tool: 'text-[#c4b5fd]',
    completed: 'text-[#6ee7b7]',
    failed: 'text-[#f87171]',
};

export const TERMINAL_STATUS_COLOR: Record<ExecutionTerminalStatus, string> = {
    idle: '',
    completed: 'text-[#6ee7b7] border-[#6ee7b7]/30 bg-[#6ee7b7]/10',
    failed: 'text-[#f87171] border-[#f87171]/30 bg-[#f87171]/10',
};

export const TERMINAL_STATUS_LABEL: Record<ExecutionTerminalStatus, string> = {
    idle: '',
    completed: 'Execution completed',
    failed: 'Execution failed',
};

export function formatEventLabel(ev: ExecutionEvent): string {
    switch (ev.type) {
        case 'started': {
            const parts = ['Execution started'];
            if (ev.provider) parts.push(`provider: ${ev.provider}`);
            if (ev.mode) parts.push(`mode: ${ev.mode}`);
            return parts.join(' · ');
        }
        case 'log': {
            const parts: string[] = [];
            if (ev.level) parts.push(`[${ev.level}]`);
            if (ev.message) parts.push(ev.message);
            return parts.join(' ') || 'Log event';
        }
        case 'tool': {
            const parts: string[] = [];
            if (ev.toolName) parts.push(ev.toolName);
            if (ev.status) parts.push(`(${ev.status})`);
            if (ev.summary) parts.push(ev.summary);
            return parts.join(' ') || 'Tool event';
        }
        case 'completed': {
            return ev.summary ? `Execution completed — ${ev.summary}` : 'Execution completed';
        }
        case 'failed': {
            return ev.errorSummary ? `Execution failed — ${ev.errorSummary}` : 'Execution failed';
        }
        default:
            return 'Unknown event';
    }
}

// ─── Component ────────────────────────────────────────────────

type RunExecutionEventsPanelProps = {
    runId: string;
};

export function RunExecutionEventsPanel({ runId }: RunExecutionEventsPanelProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const executionUiEnabled =
        mounted &&
        process.env.NODE_ENV !== 'production' &&
        process.env.NEXT_PUBLIC_ENABLE_LOCAL_CODEX_UI === 'true' &&
        Boolean(runId);

    const { events, terminalStatus } = useRunExecutionSocket(runId, {
        enabled: executionUiEnabled,
    });

    if (!executionUiEnabled) return null;

    return (
        <div className="mt-2 rounded-lg border border-white/8 bg-[rgba(255,255,255,0.02)] px-2.5 py-2 max-h-32 overflow-y-auto text-[8px] leading-relaxed">
            {terminalStatus !== 'idle' && (
                <div
                    className={`mb-1.5 rounded-full border px-2 py-0.5 text-[7px] font-bold uppercase tracking-wide inline-block ${TERMINAL_STATUS_COLOR[terminalStatus]}`}
                >
                    {TERMINAL_STATUS_LABEL[terminalStatus]}
                </div>
            )}
            <ul className="flex flex-col gap-0.5">
                {events.map((ev, i) => (
                    <li
                        key={`${ev.type}-${i}-${ev.timestamp ?? ''}`}
                        className={`truncate ${EVENT_COLOR[ev.type] ?? 'text-white/40'}`}
                    >
                        {formatEventLabel(ev)}
                    </li>
                ))}
            </ul>
        </div>
    );
}
