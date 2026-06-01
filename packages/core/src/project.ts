// ─── Project / Task / Run lifecycle domain types ─────────────────────────────

export type ProjectStatus = 'active' | 'review' | 'paused';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';
export type RunStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

export interface Project {
  id: string;
  characterId: string;
  title: string;
  status: ProjectStatus;
  summary: string;
  nextAction: string;
  updatedLabel: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  assignedCharacterId?: string;
}

export interface Run {
  id: string;
  projectId: string;
  taskId?: string;
  status: RunStatus;
  startedAt?: string;
  completedAt?: string;
}

// ─── Static seed data ─────────────────────────────────────────────────────────

export const PROJECTS: Project[] = [
  {
    id: 'p-001',
    characterId: 'aki',
    title: 'Auth Service Refactor',
    status: 'active',
    summary: 'Migrate JWT to short-lived tokens with refresh rotation.',
    nextAction: 'Implement token blacklist endpoint',
    updatedLabel: '2h ago',
  },
  {
    id: 'p-002',
    characterId: 'mai',
    title: 'Design System v2',
    status: 'active',
    summary: 'Unified component library with dark-mode design tokens.',
    nextAction: 'Publish Storybook preview',
    updatedLabel: '4h ago',
  },
  {
    id: 'p-003',
    characterId: 'mika',
    title: 'CI/CD Pipeline Overhaul',
    status: 'review',
    summary: 'Replace CircleCI with GitHub Actions; add matrix testing.',
    nextAction: 'Review PR #47',
    updatedLabel: '1d ago',
  },
  {
    id: 'p-004',
    characterId: 'ren',
    title: 'Security Audit Q2',
    status: 'active',
    summary: 'OWASP Top-10 scan across all API endpoints.',
    nextAction: 'File findings in backlog',
    updatedLabel: '3h ago',
  },
  {
    id: 'p-005',
    characterId: 'senko',
    title: 'Knowledge Base Migration',
    status: 'paused',
    summary: 'Move Notion docs to repo-tracked markdown.',
    nextAction: 'Await design sign-off',
    updatedLabel: '3d ago',
  },
];

export const TASKS: Task[] = [
  { id: 't-001', projectId: 'p-001', title: 'Design token blacklist schema', status: 'done', assignedCharacterId: 'aki' },
  { id: 't-002', projectId: 'p-001', title: 'Implement token blacklist endpoint', status: 'in_progress', assignedCharacterId: 'aki' },
  { id: 't-003', projectId: 'p-002', title: 'Audit existing components', status: 'done', assignedCharacterId: 'mai' },
  { id: 't-004', projectId: 'p-002', title: 'Publish Storybook preview', status: 'in_progress', assignedCharacterId: 'mai' },
  { id: 't-005', projectId: 'p-003', title: 'Set up GitHub Actions matrix', status: 'done', assignedCharacterId: 'mika' },
  { id: 't-006', projectId: 'p-003', title: 'Review PR #47', status: 'in_progress', assignedCharacterId: 'mika' },
  { id: 't-007', projectId: 'p-004', title: 'Run OWASP scanner', status: 'done', assignedCharacterId: 'ren' },
  { id: 't-008', projectId: 'p-004', title: 'File findings in backlog', status: 'todo', assignedCharacterId: 'ren' },
  { id: 't-009', projectId: 'p-005', title: 'Export Notion pages', status: 'done', assignedCharacterId: 'senko' },
  { id: 't-010', projectId: 'p-005', title: 'Await design sign-off', status: 'blocked', assignedCharacterId: 'senko' },
];

export const RUNS: Run[] = [
  { id: 'r-001', projectId: 'p-001', taskId: 't-001', status: 'success', startedAt: '2026-05-26T08:00:00Z', completedAt: '2026-05-26T08:45:00Z' },
  { id: 'r-002', projectId: 'p-001', taskId: 't-002', status: 'running', startedAt: '2026-05-26T10:00:00Z' },
  { id: 'r-003', projectId: 'p-002', taskId: 't-003', status: 'success', startedAt: '2026-05-25T14:00:00Z', completedAt: '2026-05-25T15:30:00Z' },
  { id: 'r-004', projectId: 'p-002', taskId: 't-004', status: 'running', startedAt: '2026-05-26T09:00:00Z' },
  { id: 'r-005', projectId: 'p-003', taskId: 't-005', status: 'success', startedAt: '2026-05-25T10:00:00Z', completedAt: '2026-05-25T12:00:00Z' },
  { id: 'r-006', projectId: 'p-003', taskId: 't-006', status: 'pending', startedAt: '2026-05-26T11:00:00Z' },
  { id: 'r-007', projectId: 'p-004', taskId: 't-007', status: 'success', startedAt: '2026-05-26T07:00:00Z', completedAt: '2026-05-26T09:00:00Z' },
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export const PROJECT_STATUS_LABEL: Readonly<Record<ProjectStatus, string>> = {
  active: 'Active',
  review: 'In Review',
  paused: 'Paused',
};

export function getProjectByCharacterId(
  projects: Project[],
  characterId: string,
): Project | undefined {
  return projects.find((p) => p.characterId === characterId);
}

export function getProjectById(projects: Project[], projectId: string): Project | undefined {
  return projects.find((p) => p.id === projectId);
}

export function getActiveProjectCount(projects: Project[]): number {
  return projects.filter((p) => p.status === 'active').length;
}

export function getProjectStatusLabel(status: ProjectStatus): string {
  return PROJECT_STATUS_LABEL[status];
}

export interface ProjectTaskSummary {
  total: number;
  done: number;
  inProgress: number;
}

export function getTasksByProjectId(tasks: Task[], projectId: string): Task[] {
  return tasks.filter((t) => t.projectId === projectId);
}

export function getTaskById(tasks: Task[], taskId: string): Task | undefined {
  return tasks.find((t) => t.id === taskId);
}

export function getRunsByTaskId(runs: Run[], taskId: string): Run[] {
  return runs.filter((r) => r.taskId === taskId);
}

export function getRunById(runs: Run[], runId: string): Run | undefined {
  return runs.find((r) => r.id === runId);
}

export function getLatestRunForTask(runs: Run[], taskId: string): Run | undefined {
  const filtered = runs.filter((r) => r.taskId === taskId);
  return filtered.length > 0 ? filtered[filtered.length - 1] : undefined;
}

export function getProjectTaskSummary(
  tasks: Task[],
  projectId: string,
): ProjectTaskSummary {
  const pts = getTasksByProjectId(tasks, projectId);
  return {
    total: pts.length,
    done: pts.filter((t) => t.status === 'done').length,
    inProgress: pts.filter((t) => t.status === 'in_progress').length,
  };
}

// ─── Run lifecycle helpers (pure, side-effect free) ───────────────────────────

/** Returns the next actionable task for a project: in_progress first, then todo. */
export function getNextTaskForProject(
  tasks: Task[],
  projectId: string,
): Task | undefined {
  const pts = getTasksByProjectId(tasks, projectId);
  return (
    pts.find((t) => t.status === 'in_progress') ??
    pts.find((t) => t.status === 'todo')
  );
}

/** A task can be started only when it is in todo status. */
export function canStartTask(task: Task): boolean {
  return task.status === 'todo';
}

/** A run can be started only when the task is in_progress and has no active run. */
export function canStartRun(task: Task, runs: Run[]): boolean {
  if (task.status !== 'in_progress') return false;
  const taskRuns = getRunsByTaskId(runs, task.id);
  return !taskRuns.some((r) => r.status === 'running' || r.status === 'pending');
}

export interface RunStartInput {
  id: string;
  projectId: string;
  taskId: string;
  startedAt?: string;
}

/** Builds a new Run value in running state. Does not mutate any collection. */
export function buildRunStartPatch(input: RunStartInput): Run {
  return {
    id: input.id,
    projectId: input.projectId,
    taskId: input.taskId,
    status: 'running',
    startedAt: input.startedAt ?? new Date().toISOString(),
  };
}

/** Returns a new Run with status success. */
export function completeRun(run: Run, completedAt?: string): Run {
  return { ...run, status: 'success', completedAt: completedAt ?? new Date().toISOString() };
}

/** Returns a new Run with status failed. */
export function failRun(run: Run, completedAt?: string): Run {
  return { ...run, status: 'failed', completedAt: completedAt ?? new Date().toISOString() };
}

/** Returns a new Run with status cancelled. */
export function cancelRun(run: Run, completedAt?: string): Run {
  return { ...run, status: 'cancelled', completedAt: completedAt ?? new Date().toISOString() };
}
