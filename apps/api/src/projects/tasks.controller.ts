import { Controller, Get, Post, Param, NotFoundException, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { TASKS, RUNS, canStartTask } from '@squad/core';

@Controller('tasks')
export class TasksController {
  @Get(':id/runs')
  findRuns(@Param('id') id: string) {
    const task = TASKS.find((t) => t.id === id);
    if (!task) throw new NotFoundException(`Task '${id}' not found`);
    return RUNS.filter((r) => r.taskId === id);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  start(@Param('id') id: string) {
    const task = TASKS.find((t) => t.id === id);
    if (!task) throw new NotFoundException(`Task '${id}' not found`);
    if (!canStartTask(task)) {
      throw new BadRequestException(`Task '${id}' cannot be started (status: ${task.status})`);
    }
    return { ...task, status: 'in_progress' as const };
  }
}
