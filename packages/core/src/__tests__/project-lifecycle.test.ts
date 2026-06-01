import { describe, it, expect } from 'vitest';
import {
  getProjectById,
  getTaskById,
  getRunById,
  getNextTaskForProject,
  canStartTask,
  canStartRun,
  buildRunStartPatch,
  completeRun,
  failRun,
  cancelRun,
} from '../project';
import type { Task, Run } from '../project';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeTasks = (...overrides: Partial<Task>[]): Task[] =>
  overrides.map((o, i) => ({
    id: `t-${i + 1}`,
    projectId: 'p-1',
    title: `Task ${i + 1}`,
    status: 'todo',
    ...o,
  }));

const makeRun = (overrides: Partial<Run> = {}): Run => ({
  id: 'r-1',
  projectId: 'p-1',
  taskId: 't-1',
  status: 'running',
  startedAt: '2026-05-26T08:00:00Z',
  ...overrides,
});

// ─── Lookup helpers ──────────────────────────────────────────────────────────

describe('lookup helpers', () => {
  it('returns a project by id', () => {
    const projects = [
      { id: 'p-1', characterId: 'mai', title: 'One', status: 'active', summary: '', nextAction: '', updatedLabel: '' },
      { id: 'p-2', characterId: 'ren', title: 'Two', status: 'paused', summary: '', nextAction: '', updatedLabel: '' },
    ] as const;
    expect(getProjectById([...projects], 'p-2')?.title).toBe('Two');
  });

  it('returns undefined for a missing project id', () => {
    expect(getProjectById([], 'missing')).toBeUndefined();
  });

  it('returns a task by id', () => {
    const tasks = makeTasks({ id: 't-1' }, { id: 't-2', title: 'Target' });
    expect(getTaskById(tasks, 't-2')?.title).toBe('Target');
  });

  it('returns undefined for a missing task id', () => {
    expect(getTaskById(makeTasks({ id: 't-1' }), 'missing')).toBeUndefined();
  });

  it('returns a run by id', () => {
    const runs = [makeRun({ id: 'r-1' }), makeRun({ id: 'r-2', status: 'pending' })];
    expect(getRunById(runs, 'r-2')?.status).toBe('pending');
  });

  it('returns undefined for a missing run id', () => {
    expect(getRunById([makeRun({ id: 'r-1' })], 'missing')).toBeUndefined();
  });
});

// ─── getNextTaskForProject ────────────────────────────────────────────────────

describe('getNextTaskForProject', () => {
  it('returns in_progress task before todo task', () => {
    const tasks = makeTasks(
      { id: 't-1', status: 'todo' },
      { id: 't-2', status: 'in_progress' },
    );
    const result = getNextTaskForProject(tasks, 'p-1');
    expect(result?.id).toBe('t-2');
  });

  it('returns todo when no in_progress exists', () => {
    const tasks = makeTasks(
      { id: 't-1', status: 'done' },
      { id: 't-2', status: 'todo' },
    );
    const result = getNextTaskForProject(tasks, 'p-1');
    expect(result?.id).toBe('t-2');
  });

  it('returns undefined when all tasks are done/blocked', () => {
    const tasks = makeTasks(
      { id: 't-1', status: 'done' },
      { id: 't-2', status: 'blocked' },
    );
    expect(getNextTaskForProject(tasks, 'p-1')).toBeUndefined();
  });

  it('returns undefined when project has no tasks', () => {
    expect(getNextTaskForProject([], 'p-1')).toBeUndefined();
  });

  it('ignores tasks from other projects', () => {
    const tasks = makeTasks({ id: 't-1', projectId: 'p-2', status: 'in_progress' });
    expect(getNextTaskForProject(tasks, 'p-1')).toBeUndefined();
  });
});

// ─── canStartTask ─────────────────────────────────────────────────────────────

describe('canStartTask', () => {
  it('returns true for todo status', () => {
    const [task] = makeTasks({ status: 'todo' });
    expect(canStartTask(task)).toBe(true);
  });

  it('returns false for in_progress status', () => {
    const [task] = makeTasks({ status: 'in_progress' });
    expect(canStartTask(task)).toBe(false);
  });

  it('returns false for done status', () => {
    const [task] = makeTasks({ status: 'done' });
    expect(canStartTask(task)).toBe(false);
  });

  it('returns false for blocked status', () => {
    const [task] = makeTasks({ status: 'blocked' });
    expect(canStartTask(task)).toBe(false);
  });
});

// ─── canStartRun ─────────────────────────────────────────────────────────────

describe('canStartRun', () => {
  const inProgressTask: Task = { id: 't-1', projectId: 'p-1', title: 'T', status: 'in_progress' };

  it('returns true when task is in_progress and no active runs', () => {
    const runs = [makeRun({ taskId: 't-1', status: 'success' })];
    expect(canStartRun(inProgressTask, runs)).toBe(true);
  });

  it('returns false when a running run exists for the task', () => {
    const runs = [makeRun({ taskId: 't-1', status: 'running' })];
    expect(canStartRun(inProgressTask, runs)).toBe(false);
  });

  it('returns false when a pending run exists for the task', () => {
    const runs = [makeRun({ taskId: 't-1', status: 'pending' })];
    expect(canStartRun(inProgressTask, runs)).toBe(false);
  });

  it('returns false when task is not in_progress', () => {
    const todoTask: Task = { ...inProgressTask, status: 'todo' };
    expect(canStartRun(todoTask, [])).toBe(false);
  });

  it('ignores runs from other tasks', () => {
    const runs = [makeRun({ taskId: 't-other', status: 'running' })];
    expect(canStartRun(inProgressTask, runs)).toBe(true);
  });
});

// ─── buildRunStartPatch ───────────────────────────────────────────────────────

describe('buildRunStartPatch', () => {
  it('returns a Run with running status', () => {
    const patch = buildRunStartPatch({
      id: 'r-new',
      projectId: 'p-1',
      taskId: 't-1',
      startedAt: '2026-05-26T10:00:00Z',
    });
    expect(patch.status).toBe('running');
    expect(patch.id).toBe('r-new');
    expect(patch.projectId).toBe('p-1');
    expect(patch.taskId).toBe('t-1');
    expect(patch.startedAt).toBe('2026-05-26T10:00:00Z');
  });

  it('sets startedAt to a non-empty string when not provided', () => {
    const patch = buildRunStartPatch({ id: 'r-x', projectId: 'p-1', taskId: 't-1' });
    expect(typeof patch.startedAt).toBe('string');
    expect(patch.startedAt!.length).toBeGreaterThan(0);
  });

  it('does not set completedAt', () => {
    const patch = buildRunStartPatch({ id: 'r-x', projectId: 'p-1', taskId: 't-1', startedAt: '2026-05-26T10:00:00Z' });
    expect(patch.completedAt).toBeUndefined();
  });
});

// ─── completeRun ─────────────────────────────────────────────────────────────

describe('completeRun', () => {
  it('returns a new Run with status success', () => {
    const run = makeRun({ status: 'running' });
    const result = completeRun(run, '2026-05-26T09:00:00Z');
    expect(result.status).toBe('success');
    expect(result.completedAt).toBe('2026-05-26T09:00:00Z');
  });

  it('does not mutate the original run', () => {
    const run = makeRun({ status: 'running' });
    completeRun(run, '2026-05-26T09:00:00Z');
    expect(run.status).toBe('running');
    expect(run.completedAt).toBeUndefined();
  });

  it('preserves all other fields', () => {
    const run = makeRun({ id: 'r-42', projectId: 'p-5', taskId: 't-9', startedAt: '2026-05-26T08:00:00Z' });
    const result = completeRun(run, '2026-05-26T09:00:00Z');
    expect(result.id).toBe('r-42');
    expect(result.projectId).toBe('p-5');
    expect(result.taskId).toBe('t-9');
    expect(result.startedAt).toBe('2026-05-26T08:00:00Z');
  });
});

// ─── failRun ─────────────────────────────────────────────────────────────────

describe('failRun', () => {
  it('returns a new Run with status failed', () => {
    const run = makeRun({ status: 'running' });
    const result = failRun(run, '2026-05-26T09:30:00Z');
    expect(result.status).toBe('failed');
    expect(result.completedAt).toBe('2026-05-26T09:30:00Z');
  });

  it('does not mutate the original run', () => {
    const run = makeRun({ status: 'running' });
    failRun(run, '2026-05-26T09:30:00Z');
    expect(run.status).toBe('running');
  });
});

// ─── cancelRun ───────────────────────────────────────────────────────────────

describe('cancelRun', () => {
  it('returns a new Run with status cancelled', () => {
    const run = makeRun({ status: 'running' });
    const result = cancelRun(run, '2026-05-26T09:15:00Z');
    expect(result.status).toBe('cancelled');
    expect(result.completedAt).toBe('2026-05-26T09:15:00Z');
  });

  it('does not mutate the original run', () => {
    const run = makeRun({ status: 'running' });
    cancelRun(run, '2026-05-26T09:15:00Z');
    expect(run.status).toBe('running');
  });
});
