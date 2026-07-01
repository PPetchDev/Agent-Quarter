import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import type { Project, Task } from '@squad/core';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async findAll() {
    return this.projectsService.findAllProjects();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const project = await this.projectsService.findProjectById(id);
    if (!project) throw new NotFoundException(`Project '${id}' not found`);
    return project;
  }

  @Post()
  async create(@Body() input: Omit<Project, 'id'>) {
    return this.projectsService.createProject(input);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updates: Partial<Omit<Project, 'id'>>) {
    const project = await this.projectsService.updateProject(id, updates);
    if (!project) throw new NotFoundException(`Project '${id}' not found`);
    return project;
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const deleted = await this.projectsService.deleteProject(id);
    if (!deleted) throw new NotFoundException(`Project '${id}' not found`);
    return { success: true };
  }

  @Get(':id/tasks')
  async findTasks(@Param('id') id: string) {
    const project = await this.projectsService.findProjectById(id);
    if (!project) throw new NotFoundException(`Project '${id}' not found`);
    return this.projectsService.findAllTasksByProjectId(id);
  }

  @Post(':id/tasks')
  async createTask(@Param('id') id: string, @Body() input: Omit<Task, 'id' | 'projectId'>) {
    const project = await this.projectsService.findProjectById(id);
    if (!project) throw new NotFoundException(`Project '${id}' not found`);
    return this.projectsService.createTask({ ...input, projectId: id });
  }

  @Patch('tasks/:taskId')
  async updateTask(@Param('taskId') taskId: string, @Body() updates: Partial<Omit<Task, 'id'>>) {
    const task = await this.projectsService.updateTask(taskId, updates);
    if (!task) throw new NotFoundException(`Task '${taskId}' not found`);
    return task;
  }

  @Delete('tasks/:taskId')
  async deleteTask(@Param('taskId') taskId: string) {
    const deleted = await this.projectsService.deleteTask(taskId);
    if (!deleted) throw new NotFoundException(`Task '${taskId}' not found`);
    return { success: true };
  }
}
