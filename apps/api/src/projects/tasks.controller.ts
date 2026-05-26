import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { TASKS, RUNS } from '@squad/core';

@Controller('tasks')
export class TasksController {
  @Get(':id/runs')
  findRuns(@Param('id') id: string) {
    const task = TASKS.find((t) => t.id === id);
    if (!task) throw new NotFoundException(`Task '${id}' not found`);
    return RUNS.filter((r) => r.taskId === id);
  }
}
