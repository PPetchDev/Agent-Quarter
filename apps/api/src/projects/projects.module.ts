import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { TasksController } from './tasks.controller';
import { RunsController } from './runs.controller';
import { RunsService } from './runs.service';
import { RunsGateway } from './runs.gateway';
import { RunExecutionService } from './run-execution.service';
import { LocalCodexRunner } from '../execution/local-codex-runner';

@Module({
  controllers: [ProjectsController, TasksController, RunsController],
  providers: [
    RunsService,
    RunsGateway,
    RunExecutionService,
    { provide: LocalCodexRunner, useFactory: () => new LocalCodexRunner() },
  ],
})
export class ProjectsModule {}
