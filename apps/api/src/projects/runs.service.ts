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
        const memberIds = this.generateMemberAgentIds(task.assignedCharacterId);
        const updatedTask = { ...task, memberAgentIds: memberIds } as Task;
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

  public completeRun(id: string): Run | undefined {
    const run = this.runs.get(id);
    if (!run) return undefined;

    const updated = completeRun(run);
    this.runs.set(updated.id, updated);

    // Clear member agents on completion
    if (run.taskId) {
      const task = this.tasks.get(run.taskId);
      if (task && (task as any).memberAgentIds) {
        const clearedTask = { ...task, memberAgentIds: undefined } as Task;
        this.tasks.set(task.id, clearedTask);
      }
    }

    return updated;
  }

  public failRun(id: string): Run | undefined {
    const run = this.runs.get(id);
    if (!run) return undefined;

    const updated = failRun(run);
    this.runs.set(updated.id, updated);

    // Clear member agents on failure
    if (run.taskId) {
      const task = this.tasks.get(run.taskId);
      if (task && (task as any).memberAgentIds) {
        const clearedTask = { ...task, memberAgentIds: undefined } as Task;
        this.tasks.set(task.id, clearedTask);
      }
    }

    return updated;
  }

  public cancelRun(id: string): Run | undefined {
    const run = this.runs.get(id);
    if (!run) return undefined;

    const updated = cancelRun(run);
    this.runs.set(updated.id, updated);

    // Clear member agents on cancellation
    if (run.taskId) {
      const task = this.tasks.get(run.taskId);
      if (task && (task as any).memberAgentIds) {
        const clearedTask = { ...task, memberAgentIds: undefined } as Task;
        this.tasks.set(task.id, clearedTask);
      }
    }

    return updated;
  }

  private generateMemberAgentIds(leadCharacterId?: string): string[] {
    // For now, generate 2-3 random member agent IDs
    // In a full implementation, this would select from available agent pool
    const count = Math.floor(Math.random() * 2) + 2; // 2-3 members
    const members: string[] = [];
    for (let i = 0; i < count; i++) {
      members.push(`member-${randomUUID().slice(0, 8)}`);
    }
    return members;
  }
}
