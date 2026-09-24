import { Injectable } from '@nestjs/common';
import {
  RUNS,
  TASKS,
  buildRunStartPatch,
  cancelRun,
  completeRun,
  failRun,
  getRunsByTaskId,
  type Run,
  type RunStartInput,
  type Task,
} from '@squad/core';
import { randomUUID } from 'crypto';

const MEMBER_AGENT_POOL = ['ren', 'mika', 'aki', 'senko', 'shinobu'] as const;

@Injectable()
export class RunsService {
  private readonly runs = new Map<string, Run>();
  private readonly tasks = new Map<string, Task>();

  constructor() {
    for (const run of RUNS) {
      this.runs.set(run.id, run);
    }
    for (const task of TASKS) {
      this.tasks.set(task.id, task);
    }
  }

  public createRun(input: Omit<RunStartInput, 'id'> & { id?: string }): Run {
    const run = buildRunStartPatch({
      id: input.id ?? randomUUID(),
      projectId: input.projectId,
      taskId: input.taskId,
      startedAt: input.startedAt,
    });

    this.runs.set(run.id, run);

    // Assign member agents when run starts (Lead spawns Members)
    if (run.taskId) {
      const task = this.tasks.get(run.taskId);
      if (task) {
        const memberIds = this.generateMemberAgentIds();
        const updatedTask: Task = { ...task, memberAgentIds: memberIds };
        this.tasks.set(task.id, updatedTask);
      }
    }

    return run;
  }

  public getRunById(id: string): Run | undefined {
    return this.runs.get(id);
  }

  public getRunsByTaskId(taskId: string): Run[] {
    return getRunsByTaskId(Array.from(this.runs.values()), taskId);
  }

  /** Clear member agents on run lifecycle transitions */
  private clearMemberAgents(runId: string): void {
    const run = this.runs.get(runId);
    if (!run?.taskId) return;
    const task = this.tasks.get(run.taskId);
    if (task?.memberAgentIds) {
      const clearedTask: Task = { ...task, memberAgentIds: undefined };
      this.tasks.set(task.id, clearedTask);
    }
  }

  public completeRun(id: string): Run | undefined {
    const run = this.runs.get(id);
    if (!run) return undefined;

    const updated = completeRun(run);
    this.runs.set(updated.id, updated);
    this.clearMemberAgents(id);

    return updated;
  }

  public failRun(id: string): Run | undefined {
    const run = this.runs.get(id);
    if (!run) return undefined;

    const updated = failRun(run);
    this.runs.set(updated.id, updated);
    this.clearMemberAgents(id);

    return updated;
  }

  public cancelRun(id: string): Run | undefined {
    const run = this.runs.get(id);
    if (!run) return undefined;

    const updated = cancelRun(run);
    this.runs.set(updated.id, updated);
    this.clearMemberAgents(id);

    return updated;
  }

  private generateMemberAgentIds(): string[] {
    // Select 2-3 random agents from the available pool
    const count = Math.floor(Math.random() * 2) + 2; // 2-3 members
    const shuffled = [...MEMBER_AGENT_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}
