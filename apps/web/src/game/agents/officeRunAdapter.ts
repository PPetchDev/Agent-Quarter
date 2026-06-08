import type { Run } from '@squad/core';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Call POST /api/tasks/:taskId/start to transition a task to in_progress.
 * Returns the updated Run record or null on failure.
 */
export async function startOfficeRun(taskId: string): Promise<Run | null> {
    try {
        const res = await fetch(`${BASE}/api/tasks/${taskId}/start`, { method: 'POST' });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

/**
 * Call PATCH /api/runs/:runId/complete to mark a Run as success.
 * Returns the updated Run record or null on failure.
 */
export async function completeOfficeRun(runId: string): Promise<Run | null> {
    try {
        const res = await fetch(`${BASE}/api/runs/${runId}/complete`, { method: 'PATCH' });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

/**
 * Start a task and return the started Run for later completion.
 * Combines startOfficeRun with the backend's response which contains the Run id.
 */
export async function createAndStartRun(taskId: string): Promise<Run | null> {
    return startOfficeRun(taskId);
}
