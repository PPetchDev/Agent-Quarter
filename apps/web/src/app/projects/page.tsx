import Image from 'next/image';
import Link from 'next/link';
import {
  CHARACTER_TEMPLATES,
  Project,
  ProjectStatus,
  RunStatus,
  getProjectStatusLabel,
} from '@squad/core';
import { fetchProjects, fetchProjectTasks, fetchTaskRuns } from '@/lib/api';
import { RunExecutionButton } from './RunExecutionButton';
import { RunExecutionEventsPanel } from './RunExecutionEventsPanel';

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

const ROLE_COLOR: Record<string, string> = {
  frontend: 'text-[#f9a8d4] border-[#f9a8d4]/30 bg-[#f9a8d4]/10',
  backend: 'text-[#93c5fd] border-[#93c5fd]/30 bg-[#93c5fd]/10',
  review: 'text-[#fde68a] border-[#fde68a]/30 bg-[#fde68a]/10',
  devops: 'text-[#6ee7b7] border-[#6ee7b7]/30 bg-[#6ee7b7]/10',
  design: 'text-[#c4b5fd] border-[#c4b5fd]/30 bg-[#c4b5fd]/10',
  support: 'text-[#fb923c] border-[#fb923c]/30 bg-[#fb923c]/10',
  strategy: 'text-[#f0abfc] border-[#f0abfc]/30 bg-[#f0abfc]/10',
};

export default async function ProjectsPage() {
  // Fetch all projects from API
  const projects = await fetchProjects();

  // Fetch tasks for every project in parallel
  const taskEntries = await Promise.all(
    projects.map((p) => fetchProjectTasks(p.id).then((tasks) => [p.id, tasks] as const)),
  );
  const tasksMap = new Map(taskEntries);

  // Collect active tasks across all projects, then fetch their runs in parallel
  const activeTasks = projects.flatMap((p) => {
    const pts = tasksMap.get(p.id) ?? [];
    const active =
      pts.find((t) => t.status === 'in_progress') ?? pts.find((t) => t.status === 'todo');
    return active ? [active] : [];
  });
  const runEntries = await Promise.all(
    activeTasks.map((t) => fetchTaskRuns(t.id).then((runs) => [t.id, runs] as const)),
  );
  const runsMap = new Map(runEntries);

  return (
    <main className="flex-1 flex flex-col bg-[rgba(7,4,26,0.95)] px-6 py-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        <header className="mb-8">
          <p className="text-[9px] font-black tracking-[3px] text-white/30 uppercase mb-1">
            ✦ SQUAD ✧
          </p>
          <h1 className="text-2xl font-black text-[#e2d9f3]">Projects</h1>
          <p className="text-[11px] text-white/40 mt-1">Active team — 7 agents ready</p>
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
                      {activeTask && (
                        <div className="flex items-start gap-1.5 min-w-0">
                          <div className="min-w-0 flex-1">
                            <span className="block text-[9px] text-white/30 truncate">
                              ↳ {activeTask.title}
                            </span>
                            {latestRun && (
                              <span
                                className={`text-[8px] font-semibold ${RUN_STATUS_COLOR[latestRun.status]}`}
                              >
                                {latestRun.status}
                              </span>
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
                  <Link
                    href={`/stages?character=${t.characterId}`}
                    className="self-end text-[9px] font-semibold text-[#f0abfc] hover:text-[#e879f9] transition-colors"
                  >
                    Chat →
                  </Link>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
