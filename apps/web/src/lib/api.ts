import type { Project, Task, Run } from '@squad/core';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function getHistory(characterId: string) {
  const res = await fetch(`${BASE}/api/conversations/${characterId}/history`);
  if (!res.ok) return [];
  return res.json() as Promise<
    Array<{ id: string; role: string; content: string; mood?: string; createdAt: string }>
  >;
}

export async function getCharacters() {
  const res = await fetch(`${BASE}/api/characters`);
  if (!res.ok) throw new Error('Failed to fetch characters');
  return res.json();
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${BASE}/api/projects`);
  if (!res.ok) return [];
  return res.json() as Promise<Project[]>;
}

export async function fetchProjectTasks(projectId: string): Promise<Task[]> {
  const res = await fetch(`${BASE}/api/projects/${projectId}/tasks`);
  if (!res.ok) return [];
  return res.json() as Promise<Task[]>;
}

export async function fetchTaskRuns(taskId: string): Promise<Run[]> {
  const res = await fetch(`${BASE}/api/tasks/${taskId}/runs`);
  if (!res.ok) return [];
  return res.json() as Promise<Run[]>;
}

export type ExecuteRunDevResponse = {
  runId: string;
  executionStarted: true;
};

export type ExecuteRunDevResult =
  | { ok: true; data: ExecuteRunDevResponse }
  | { ok: false; status?: number; message: string };

async function readApiErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { message?: unknown; error?: unknown };
    if (typeof data.message === 'string') return data.message;
    if (Array.isArray(data.message)) return data.message.join(', ');
    if (typeof data.error === 'string') return data.error;
  } catch {
    // Fall back to the status line when the response body is empty or invalid.
  }

  return res.statusText || `Request failed with status ${res.status}`;
}

export async function executeRunDev(runId: string, prompt: string): Promise<ExecuteRunDevResult> {
  if (!prompt.trim()) {
    return { ok: false, message: 'prompt is required' };
  }

  try {
    const res = await fetch(`${BASE}/api/runs/${encodeURIComponent(runId)}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        mode: 'read-only',
      }),
    });

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message: await readApiErrorMessage(res),
      };
    }

    return { ok: true, data: (await res.json()) as ExecuteRunDevResponse };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error && err.message ? err.message : 'network error',
    };
  }
}

// ─── Task / Run lifecycle mutations ───────────────────────────────────────

export async function startTask(taskId: string): Promise<Run> {
  const res = await fetch(`${BASE}/api/tasks/${encodeURIComponent(taskId)}/start`, {
    method: 'POST',
  });
  if (!res.ok) {
    const msg = await readApiErrorMessage(res);
    throw new Error(msg || `Failed to start task (${res.status})`);
  }
  return res.json() as Promise<Run>;
}

export async function completeRun(runId: string): Promise<Run> {
  const res = await fetch(`${BASE}/api/runs/${encodeURIComponent(runId)}/complete`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    const msg = await readApiErrorMessage(res);
    throw new Error(msg || `Failed to complete run (${res.status})`);
  }
  return res.json() as Promise<Run>;
}

export async function failRun(runId: string): Promise<Run> {
  const res = await fetch(`${BASE}/api/runs/${encodeURIComponent(runId)}/fail`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    const msg = await readApiErrorMessage(res);
    throw new Error(msg || `Failed to fail run (${res.status})`);
  }
  return res.json() as Promise<Run>;
}

export async function cancelRun(runId: string): Promise<Run> {
  const res = await fetch(`${BASE}/api/runs/${encodeURIComponent(runId)}/cancel`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    const msg = await readApiErrorMessage(res);
    throw new Error(msg || `Failed to cancel run (${res.status})`);
  }
  return res.json() as Promise<Run>;
}

// ─── Project CRUD mutations ───────────────────────────────────────────

export async function createProject(input: Omit<Project, 'id'>): Promise<Project> {
  const res = await fetch(`${BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const msg = await readApiErrorMessage(res);
    throw new Error(msg || `Failed to create project (${res.status})`);
  }
  return res.json() as Promise<Project>;
}

export async function updateProject(id: string, updates: Partial<Omit<Project, 'id'>>): Promise<Project> {
  const res = await fetch(`${BASE}/api/projects/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const msg = await readApiErrorMessage(res);
    throw new Error(msg || `Failed to update project (${res.status})`);
  }
  return res.json() as Promise<Project>;
}

export async function deleteProject(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/api/projects/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const msg = await readApiErrorMessage(res);
    throw new Error(msg || `Failed to delete project (${res.status})`);
  }
  return res.json() as Promise<{ success: boolean }>;
}

export async function createTask(projectId: string, input: Omit<Task, 'id' | 'projectId'>): Promise<Task> {
  const res = await fetch(`${BASE}/api/projects/${encodeURIComponent(projectId)}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const msg = await readApiErrorMessage(res);
    throw new Error(msg || `Failed to create task (${res.status})`);
  }
  return res.json() as Promise<Task>;
}

export async function updateTask(id: string, updates: Partial<Omit<Task, 'id'>>): Promise<Task> {
  const res = await fetch(`${BASE}/api/projects/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const msg = await readApiErrorMessage(res);
    throw new Error(msg || `Failed to update task (${res.status})`);
  }
  return res.json() as Promise<Task>;
}

export async function deleteTask(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/api/projects/tasks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const msg = await readApiErrorMessage(res);
    throw new Error(msg || `Failed to delete task (${res.status})`);
  }
  return res.json() as Promise<{ success: boolean }>;
}
