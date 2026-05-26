import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { TasksController } from './tasks.controller';

@Module({ controllers: [ProjectsController, TasksController] })
export class ProjectsModule {}
