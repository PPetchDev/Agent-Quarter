import {
  Controller,
  Patch,
  Post,
  Param,
  Body,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RunsService } from './runs.service';
import { RunsGateway } from './runs.gateway';
import { RunExecutionService } from './run-execution.service';
import { ExecuteRunDto } from './dto';

@Controller('runs')
export class RunsController {
  constructor(
    private readonly runsService: RunsService,
    private readonly runsGateway: RunsGateway,
    private readonly runExecutionService: RunExecutionService,
  ) {}

  @Patch(':id/complete')
  complete(@Param('id') id: string) {
    const run = this.runsService.completeRun(id);
    if (!run) throw new NotFoundException(`Run '${id}' not found`);
    this.runsGateway.emitRunCompleted(run);
    return run;
  }

  @Patch(':id/fail')
  fail(@Param('id') id: string) {
    const run = this.runsService.failRun(id);
    if (!run) throw new NotFoundException(`Run '${id}' not found`);
    this.runsGateway.emitRunFailed(run);
    return run;
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    const run = this.runsService.cancelRun(id);
    if (!run) throw new NotFoundException(`Run '${id}' not found`);
    this.runsGateway.emitRunCancelled(run);
    return run;
  }

  // ─── Dev-only execution trigger ──────────────────────────────────────────

  @Post(':id/execute')
  @HttpCode(HttpStatus.ACCEPTED)
  executeRun(@Param('id') id: string, @Body() body: ExecuteRunDto) {
    // Safety gates
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Not available in production');
    }
    if (process.env.ENABLE_LOCAL_CODEX !== 'true') {
      throw new ServiceUnavailableException('Local execution is disabled');
    }
    if (process.env.ALLOW_LOCAL_PROCESS_EXECUTION !== 'true') {
      throw new ServiceUnavailableException('Local process execution is disabled');
    }

    // Validate prompt
    const prompt = body.prompt?.trim();
    if (!prompt) {
      throw new BadRequestException('prompt is required');
    }

    // Validate mode
    const mode = body.mode ?? 'read-only';
    if (mode !== 'read-only' && mode !== 'workspace-write') {
      throw new BadRequestException(`invalid mode: ${mode}`);
    }
    if (mode === 'workspace-write' && process.env.ALLOW_CODEX_WORKSPACE_WRITE !== 'true') {
      throw new BadRequestException('workspace-write mode is not enabled');
    }

    // Look up run
    const run = this.runsService.getRunById(id);
    if (!run) {
      throw new NotFoundException(`Run '${id}' not found`);
    }

    // Server-side cwd only
    const cwd = process.env.CODEX_CWD ?? process.cwd();

    // Fire-and-forget execution
    void this.runExecutionService
      .executeRun({
        runId: run.id,
        taskId: run.taskId,
        projectId: run.projectId,
        prompt,
        cwd,
        mode,
      })
      .catch(() => {
        // Silently catch — outcome delivered via socket events
      });

    return { runId: run.id, executionStarted: true };
  }
}
