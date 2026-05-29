import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PROJECTS, TASKS } from '@squad/core';

@Controller('projects')
export class ProjectsController {
  @Get()
  findAll() {
    return PROJECTS;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const project = PROJECTS.find((p) => p.id === id);
    if (!project) throw new NotFoundException(`Project '${id}' not found`);
    return project;
  }

  @Get(':id/tasks')
  findTasks(@Param('id') id: string) {
    const project = PROJECTS.find((p) => p.id === id);
    if (!project) throw new NotFoundException(`Project '${id}' not found`);
    return TASKS.filter((t) => t.projectId === id);
  }
}
