import { Injectable } from '@nestjs/common';
import {
  RUNS,
  buildRunStartPatch,
  cancelRun,
  completeRun,
  failRun,
  getRunsByTaskId,
  type Run,
  type RunStartInput,
} from '@squad/core';
import { randomUUID } from 'crypto';

@Injectable()
export class RunsService {
  private readonly runs = new Map<string, Run>();

  constructor() {
    for (const run of RUNS) {
      this.runs.set(run.id, run);
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
    return updated;
  }

  public failRun(id: string): Run | undefined {
    const run = this.runs.get(id);
    if (!run) return undefined;

    const updated = failRun(run);
    this.runs.set(updated.id, updated);
    return updated;
  }

  public cancelRun(id: string): Run | undefined {
    const run = this.runs.get(id);
    if (!run) return undefined;

    const updated = cancelRun(run);
    this.runs.set(updated.id, updated);
    return updated;
  }
}
