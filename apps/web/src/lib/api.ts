import type { Project, Task, Run } from '@squad/core';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function getHistory(characterId: string) {
  const res = await fetch(`${BASE}/api/conversations/${characterId}/history`);
  if (!res.ok) return [];
  return res.json() as Promise<Array<{ id: string; role: string; content: string; mood?: string; createdAt: string }>>;
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
