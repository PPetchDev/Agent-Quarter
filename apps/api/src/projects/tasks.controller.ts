import { Controller, Get, Post, Param, NotFoundException, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { TASKS, canStartTask, getTaskById } from '@squad/core';
import { RunsService } from './runs.service';
import { RunsGateway } from './runs.gateway';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly runsService: RunsService,
    private readonly runsGateway: RunsGateway,
  ) {}

  @Get(':id/runs')
  findRuns(@Param('id') id: string) {
    const task = getTaskById(TASKS, id);
    if (!task) throw new NotFoundException(`Task '${id}' not found`);
    return this.runsService.getRunsByTaskId(id);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  start(@Param('id') id: string) {
    const task = getTaskById(TASKS, id);
    if (!task) throw new NotFoundException(`Task '${id}' not found`);
    if (!canStartTask(task)) {
      throw new BadRequestException(`Task '${id}' cannot be started (status: ${task.status})`);
    }

    const run = this.runsService.createRun({ projectId: task.projectId, taskId: task.id });
    this.runsGateway.emitRunStarted(run);
    return run;
  }
}
