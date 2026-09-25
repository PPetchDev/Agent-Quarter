import {
  Controller,
  Get,
  Post,
  Param,
  NotFoundException,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { canStartTask, type Task } from '@squad/core';
import { ProjectsService } from './projects.service';
import { RunsService } from './runs.service';
import { RunsGateway } from './runs.gateway';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly runsService: RunsService,
    private readonly runsGateway: RunsGateway,
    private readonly projectsService: ProjectsService,
  ) {}

  @Get(':id/runs')
  async findRuns(@Param('id') id: string) {
    await this.findTaskOrThrow(id);
    return this.runsService.getRunsByTaskId(id);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  async start(@Param('id') id: string) {
    const task = await this.findTaskOrThrow(id);
    if (!canStartTask(task)) throw notStartable(task);

    // Claim todo -> in_progress atomically before creating the run, so a lost race or a
    // failed write never leaves an orphan run behind.
    if (!(await this.projectsService.transitionTaskStatus(id, 'todo', 'in_progress'))) {
      throw notStartable(await this.findTaskOrThrow(id));
    }

    const run = this.runsService.createRun({ projectId: task.projectId, taskId: task.id });
    this.runsGateway.emitRunStarted(run);
    return run;
  }

  /** Undo a start (in_progress -> todo). A task someone finished or blocked is never touched. */
  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  async release(@Param('id') id: string) {
    if (!(await this.projectsService.transitionTaskStatus(id, 'in_progress', 'todo'))) {
      const task = await this.findTaskOrThrow(id);
      throw new BadRequestException(`Task '${id}' cannot be released (status: ${task.status})`);
    }
    return this.findTaskOrThrow(id);
  }

  private async findTaskOrThrow(id: string): Promise<Task> {
    const task = await this.projectsService.findTaskById(id);
    if (!task) throw new NotFoundException(`Task '${id}' not found`);
    return task;
  }
}

function notStartable(task: Task): BadRequestException {
  return new BadRequestException(`Task '${task.id}' cannot be started (status: ${task.status})`);
}
