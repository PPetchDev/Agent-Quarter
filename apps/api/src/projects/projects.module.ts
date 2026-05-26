import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { TasksController } from './tasks.controller';
import { RunsController } from './runs.controller';

@Module({ controllers: [ProjectsController, TasksController, RunsController] })
export class ProjectsModule {}
