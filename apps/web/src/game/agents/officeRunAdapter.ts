import type { Run } from '@squad/core';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// A step's finish must land before the next step's start: otherwise its late release could
// undo the claim the new start just made, leaving the task todo while a run is live.
let pendingFinish: Promise<unknown> = Promise.resolve();

/**
 * Call POST /api/tasks/:taskId/start to transition a task to in_progress.
 * Returns the updated Run record or null on failure.
 *
 * The office demo reuses one canonical task, so a 400 (task not todo) usually means a
 * previous cycle never finished — e.g. the page reloaded mid-run. Release it once and
 * retry; the backend refuses to release a task someone finished or blocked.
 */
export async function startOfficeRun(taskId: string): Promise<Run | null> {
  await pendingFinish;
  try {
    let res = await postStart(taskId);
    if (res.status === 400 && (await releaseOfficeTask(taskId))) res = await postStart(taskId);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function postStart(taskId: string): Promise<Response> {
  return fetch(`${BASE}/api/tasks/${taskId}/start`, { method: 'POST' });
}

/**
 * Call POST /api/tasks/:taskId/release (in_progress -> todo only).
 * Returns true when the backend released the task.
 */
export async function releaseOfficeTask(taskId: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/tasks/${taskId}/release`, { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Complete the office run, then release its task so the next cycle can start it again.
 * The release runs even when completing fails (e.g. the API restarted and lost the run).
 */
export function finishOfficeRun(runId: string, taskId: string): Promise<Run | null> {
  const finished = completeOfficeRun(runId).then(async (run) => {
    await releaseOfficeTask(taskId);
    return run;
  });
  pendingFinish = finished;
  return finished;
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
