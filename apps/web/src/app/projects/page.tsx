'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  CHARACTER_TEMPLATES,
  MAX_TITLE_LENGTH,
  type Project,
  type ProjectStatus,
  type Run,
  type RunStatus,
  type Task,
  type TaskStatus,
  getProjectStatusLabel,
} from '@squad/core';
import {
  createTask,
  deleteProject,
  fetchProjects,
  fetchProjectTasks,
  fetchTaskRuns,
  updateTask,
} from '@/lib/api';
import { RunExecutionButton } from './RunExecutionButton';
import { RunExecutionEventsPanel } from './RunExecutionEventsPanel';
import { ProjectLifecycleActions } from './ProjectLifecycleActions';
import { CreateProjectModal } from './CreateProjectModal';

export const dynamic = 'force-dynamic';

// ─── Project data ─────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<ProjectStatus, string> = {
  active: 'text-[#6ee7b7]',
  review: 'text-[#fde68a]',
  paused: 'text-[#fb923c]',
};

const RUN_STATUS_COLOR: Record<RunStatus, string> = {
  pending: 'text-white/30',
  running: 'text-[#fde68a]',
  success: 'text-[#6ee7b7]',
  failed: 'text-[#f87171]',
  cancelled: 'text-white/25',
};

const TASK_STATUS_OPTIONS: TaskStatus[] = ['todo', 'in_progress', 'done', 'blocked'];

const ROLE_COLOR: Record<string, string> = {
  frontend: 'text-[#f9a8d4] border-[#f9a8d4]/30 bg-[#f9a8d4]/10',
  backend: 'text-[#93c5fd] border-[#93c5fd]/30 bg-[#93c5fd]/10',
  review: 'text-[#fde68a] border-[#fde68a]/30 bg-[#fde68a]/10',
  devops: 'text-[#6ee7b7] border-[#6ee7b7]/30 bg-[#6ee7b7]/10',
  design: 'text-[#c4b5fd] border-[#c4b5fd]/30 bg-[#c4b5fd]/10',
  support: 'text-[#fb923c] border-[#fb923c]/30 bg-[#fb923c]/10',
  strategy: 'text-[#f0abfc] border-[#f0abfc]/30 bg-[#f0abfc]/10',
};

export default function ProjectsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasksMap, setTasksMap] = useState(new Map<string, Task[]>());
  const [runsMap, setRunsMap] = useState(new Map<string, Run[]>());
  const [taskDrafts, setTaskDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function refreshProjects() {
    const nextProjects = await fetchProjects();
    setProjects(nextProjects);
  }

  async function refreshProjectTasks(projectId: string) {
    const tasks = await fetchProjectTasks(projectId);
    setTasksMap((current) => {
      const next = new Map(current);
      next.set(projectId, tasks);
      return next;
    });
  }

  // Fetch projects on mount
  useEffect(() => {
    refreshProjects().finally(() => setLoading(false));
  }, []);

  // Fetch tasks when projects change
  useEffect(() => {
    if (projects.length === 0) return;
    Promise.all(
      projects.map((p) => fetchProjectTasks(p.id).then((tasks) => [p.id, tasks] as const)),
    ).then((entries) => setTasksMap(new Map(entries)));
  }, [projects]);

  // Collect active tasks and fetch runs
  const activeTasks = useMemo(
    () =>
      projects.flatMap((p) => {
        const pts = tasksMap.get(p.id) ?? [];
        const active =
          pts.find((t) => t.status === 'in_progress') ?? pts.find((t) => t.status === 'todo');
        return active ? [active] : [];
      }),
    [projects, tasksMap],
  );

  useEffect(() => {
    if (activeTasks.length === 0) return;
    Promise.all(
      activeTasks.map((t) => fetchTaskRuns(t.id).then((runs) => [t.id, runs] as const)),
    ).then((entries) => setRunsMap(new Map(entries)));
  }, [activeTasks]);

  async function handleDeleteProject(id: string) {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await deleteProject(id);
      setProjects((current) => current.filter((p) => p.id !== id));
      setTasksMap((current) => {
        const next = new Map(current);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  }

  async function handleCreateTask(e: React.FormEvent, projectId: string, characterId: string) {
    e.preventDefault();
    const title = taskDrafts[projectId]?.trim();
    if (!title) return;

    try {
      await createTask(projectId, {
        title,
        status: 'todo',
        assignedCharacterId: characterId,
      });
      setTaskDrafts((current) => ({ ...current, [projectId]: '' }));
      await refreshProjectTasks(projectId);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  }

  async function handleUpdateTaskStatus(task: Task, status: TaskStatus) {
    try {
      await updateTask(task.id, { status });
      await refreshProjectTasks(task.projectId);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  }

  if (loading) {
    return (
      <main className="flex-1 flex flex-col bg-[rgba(7,4,26,0.95)] px-6 py-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full">
          <p className="text-white/40">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col bg-[rgba(7,4,26,0.95)] px-6 py-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black tracking-[3px] text-white/30 uppercase mb-1">
              ✦ SQUAD ✧
            </p>
            <h1 className="text-2xl font-black text-[#e2d9f3]">Projects</h1>
            <p className="text-[11px] text-white/40 mt-1">Active team — 7 agents ready</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#6ee7b7] text-[#1a1a2e] rounded-lg text-[13px] font-bold hover:bg-[#5ad4a0] transition-colors"
          >
            + New Project
          </button>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CHARACTER_TEMPLATES.map((t) => {
            const roleClass = ROLE_COLOR[t.role] ?? 'text-white/50 border-white/20 bg-white/5';
            const project = projects.find((p) => p.characterId === t.characterId);
            const projectTasks = project ? (tasksMap.get(project.id) ?? []) : [];
            const taskSummary = project
              ? {
                  total: projectTasks.length,
                  done: projectTasks.filter((t) => t.status === 'done').length,
                  inProgress: projectTasks.filter((t) => t.status === 'in_progress').length,
                }
              : null;
            const activeTask =
              projectTasks.find((t) => t.status === 'in_progress') ??
              projectTasks.find((t) => t.status === 'todo');
            const taskRuns = activeTask ? (runsMap.get(activeTask.id) ?? []) : [];
            const latestRun = taskRuns.length > 0 ? taskRuns[taskRuns.length - 1] : undefined;
            return (
              <div
                key={t.characterId}
                className="group rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors p-4 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 flex-shrink-0 rounded-full overflow-hidden border-2 border-white/15">
                    <Image
                      src={t.avatarPath}
                      alt={t.name}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[#e2d9f3] truncate">{t.name}</p>
                    <p className="text-[10px] text-white/40 truncate">{t.title}</p>
                  </div>
                </div>

                <span
                  className={`self-start text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${roleClass}`}
                >
                  {t.role}
                </span>

                <ul className="flex flex-wrap gap-1.5">
                  {t.shortTraits.map((trait) => (
                    <li
                      key={trait}
                      className="text-[9px] text-white/40 bg-white/5 border border-white/8 rounded-full px-2 py-0.5"
                    >
                      {trait}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-2 border-t border-white/6 flex flex-col gap-1.5">
                  {project ? (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold text-[#e2d9f3] truncate">
                          {project.title}
                        </span>
                        <span
                          className={`text-[9px] font-bold shrink-0 ${STATUS_COLOR[project.status]}`}
                        >
                          {getProjectStatusLabel(project.status)}
                        </span>
                      </div>
                      <p className="text-[9px] text-white/35 leading-relaxed line-clamp-2">
                        {project.summary}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] text-white/25 italic truncate">
                          → {project.nextAction}
                        </span>
                        <span className="text-[8px] text-white/20 shrink-0">
                          {project.updatedLabel}
                        </span>
                      </div>
                      {taskSummary && taskSummary.total > 0 && (
                        <p className="text-[9px] text-white/30">
                          {taskSummary.done}/{taskSummary.total} tasks done
                        </p>
                      )}
                      {projectTasks.length > 0 && (
                        <ul className="flex flex-col gap-1">
                          {projectTasks.map((task) => (
                            <li
                              key={task.id}
                              className="flex items-center gap-2 text-[9px] text-white/35"
                            >
                              <span className="min-w-0 flex-1 truncate">{task.title}</span>
                              <select
                                value={task.status}
                                onChange={(e) =>
                                  handleUpdateTaskStatus(task, e.target.value as TaskStatus)
                                }
                                className="w-24 rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[8px] text-[#e2d9f3] focus:outline-none focus:border-white/30"
                              >
                                {TASK_STATUS_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </li>
                          ))}
                        </ul>
                      )}
                      <form
                        onSubmit={(e) => handleCreateTask(e, project.id, project.characterId)}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          value={taskDrafts[project.id] ?? ''}
                          maxLength={MAX_TITLE_LENGTH}
                          onChange={(e) =>
                            setTaskDrafts((current) => ({
                              ...current,
                              [project.id]: e.target.value,
                            }))
                          }
                          className="min-w-0 flex-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[9px] text-[#e2d9f3] placeholder:text-white/20 focus:outline-none focus:border-white/30"
                          placeholder="New task"
                        />
                        <button
                          type="submit"
                          className="shrink-0 rounded border border-[#6ee7b7]/30 bg-[#6ee7b7]/10 px-2 py-1 text-[9px] font-semibold text-[#6ee7b7] hover:bg-[#6ee7b7]/15"
                        >
                          Add
                        </button>
                      </form>
                      <ProjectLifecycleActions task={activeTask} latestRun={latestRun} />
                      {activeTask && (
                        <div className="flex items-start gap-1.5 min-w-0">
                          <div className="min-w-0 flex-1">
                            <span className="block text-[9px] text-white/30 truncate">
                              ↳ {activeTask.title}
                            </span>
                            {latestRun && (
                              <span
                                className={`text-[8px] font-semibold ${RUN_STATUS_COLOR[latestRun.status as RunStatus]}`}
                              >
                                {latestRun.status}
                              </span>
                            )}
                            {/* Member agents visualization */}
                            {activeTask.memberAgentIds && activeTask.memberAgentIds.length > 0 && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[7px] text-white/40">
                                  {activeTask.memberAgentIds.length} member
                                  {activeTask.memberAgentIds.length > 1 ? 's' : ''}
                                </span>
                                <div className="flex -space-x-1">
                                  {activeTask.memberAgentIds.slice(0, 3).map((id: string) => (
                                    <div
                                      key={id}
                                      className="w-4 h-4 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[6px] text-white/60"
                                      title={id}
                                    >
                                      {id.slice(-2)}
                                    </div>
                                  ))}
                                  {activeTask.memberAgentIds.length > 3 && (
                                    <div className="w-4 h-4 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[6px] text-white/60">
                                      +{activeTask.memberAgentIds.length - 3}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          {latestRun && <RunExecutionButton runId={latestRun.id} />}
                          {latestRun && <RunExecutionEventsPanel runId={latestRun.id} />}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-[9px] text-white/25 italic">no active project</span>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <Link
                      href={`/stages?character=${t.characterId}`}
                      className="text-[9px] font-semibold text-[#f0abfc] hover:text-[#e879f9] transition-colors"
                    >
                      Chat →
                    </Link>
                    {project && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingProject(project)}
                          className="text-[9px] text-white/40 hover:text-[#6ee7b7] transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="text-[9px] text-white/40 hover:text-red-400 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </div>
      {showCreateModal && (
        <CreateProjectModal onClose={() => setShowCreateModal(false)} onSuccess={refreshProjects} />
      )}
      {editingProject && (
        <CreateProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSuccess={refreshProjects}
        />
      )}
    </main>
  );
}
