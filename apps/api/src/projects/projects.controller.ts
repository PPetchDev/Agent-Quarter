import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PROJECTS, TASKS, getProjectById, getTasksByProjectId } from '@squad/core';

@Controller('projects')
export class ProjectsController {
  @Get()
  findAll() {
    return PROJECTS;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const project = getProjectById(PROJECTS, id);
    if (!project) throw new NotFoundException(`Project '${id}' not found`);
    return project;
  }

  @Get(':id/tasks')
  findTasks(@Param('id') id: string) {
    const project = getProjectById(PROJECTS, id);
    if (!project) throw new NotFoundException(`Project '${id}' not found`);
    return getTasksByProjectId(TASKS, id);
  }
}
