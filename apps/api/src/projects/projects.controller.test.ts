import { BadRequestException, ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { PROJECTS, RUNS, TASKS } from '@squad/core';
import { ProjectsController } from './projects.controller';
import { RunsController } from './runs.controller';
import { TasksController } from './tasks.controller';
import { RunsService } from './runs.service';
import { RunsGateway } from './runs.gateway';
import { RunExecutionService } from './run-execution.service';

describe('ProjectsController', () => {
  const controller = new ProjectsController();

  it('returns all seeded projects', () => {
    expect(controller.findAll()).toBe(PROJECTS);
  });

  it('returns a project by id', () => {
    expect(controller.findOne('p-001')).toEqual(PROJECTS[0]);
  });

  it('throws the existing not found message for a missing project', () => {
    expect(() => controller.findOne('missing')).toThrow(NotFoundException);
    expect(() => controller.findOne('missing')).toThrow("Project 'missing' not found");
  });

  it('returns tasks for an existing project', () => {
    expect(controller.findTasks('p-001')).toEqual(
      TASKS.filter((task) => task.projectId === 'p-001'),
    );
  });

  it('throws before returning tasks for a missing project', () => {
    expect(() => controller.findTasks('missing')).toThrow(NotFoundException);
    expect(() => controller.findTasks('missing')).toThrow("Project 'missing' not found");
  });
});

describe('TasksController', () => {
  const runsService = new RunsService();
  const runsGateway = new RunsGateway();
  const controller = new TasksController(runsService, runsGateway);

  it('returns runs for an existing task', () => {
    expect(controller.findRuns('t-001')).toEqual(
      RUNS.filter((run) => run.taskId === 't-001'),
    );
  });

  it('throws the existing not found message for missing task runs', () => {
    expect(() => controller.findRuns('missing')).toThrow(NotFoundException);
    expect(() => controller.findRuns('missing')).toThrow("Task 'missing' not found");
  });

  it('starts a todo task and returns a running run', () => {
    const result = controller.start('t-008');
    expect(result.taskId).toBe('t-008');
    expect(result.projectId).toBe('p-004');
    expect(result.status).toBe('running');
    expect(typeof result.id).toBe('string');
    expect(typeof result.startedAt).toBe('string');
    expect(TASKS.find((task) => task.id === 't-008')?.status).toBe('todo');
  });

  it('rejects a non-todo task with the existing message', () => {
    expect(() => controller.start('t-002')).toThrow(BadRequestException);
    expect(() => controller.start('t-002')).toThrow(
      "Task 't-002' cannot be started (status: in_progress)",
    );
  });

  it('throws the existing not found message for a missing task start', () => {
    expect(() => controller.start('missing')).toThrow(NotFoundException);
    expect(() => controller.start('missing')).toThrow("Task 'missing' not found");
  });
});

describe('RunsController', () => {
  const runsService = new RunsService();
  const runsGateway = new RunsGateway();
  const mockRunExecutionService = {
    executeRun: vi.fn().mockResolvedValue(undefined),
  } as unknown as RunExecutionService;
  const controller = new RunsController(runsService, runsGateway, mockRunExecutionService);

  it('completes a run without mutating seed data', () => {
    const result = controller.complete('r-002');
    expect(result.status).toBe('success');
    expect(typeof result.completedAt).toBe('string');
    expect(RUNS.find((run) => run.id === 'r-002')?.status).toBe('running');
  });

  it('fails a run without mutating seed data', () => {
    const result = controller.fail('r-002');
    expect(result.status).toBe('failed');
    expect(typeof result.completedAt).toBe('string');
    expect(RUNS.find((run) => run.id === 'r-002')?.status).toBe('running');
  });

  it('cancels a run without mutating seed data', () => {
    const result = controller.cancel('r-002');
    expect(result.status).toBe('cancelled');
    expect(typeof result.completedAt).toBe('string');
    expect(RUNS.find((run) => run.id === 'r-002')?.status).toBe('running');
  });

  it('throws the existing not found message for missing runs', () => {
    expect(() => controller.complete('missing')).toThrow(NotFoundException);
    expect(() => controller.complete('missing')).toThrow("Run 'missing' not found");
    expect(() => controller.fail('missing')).toThrow(NotFoundException);
    expect(() => controller.cancel('missing')).toThrow(NotFoundException);
  });

  // ─── executeRun tests ──────────────────────────────────────────────────

  describe('executeRun', () => {
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
      process.env = { ...ORIGINAL_ENV };
      process.env.NODE_ENV = 'development';
      process.env.ENABLE_LOCAL_CODEX = 'true';
      process.env.ALLOW_LOCAL_PROCESS_EXECUTION = 'true';
      vi.clearAllMocks();
    });

    afterEach(() => {
      process.env = ORIGINAL_ENV;
    });

    it('returns runId and executionStarted true on success', () => {
      const result = controller.executeRun('r-002', { prompt: 'Review the code' });
      expect(result).toEqual({ runId: 'r-002', executionStarted: true });
    });

    it('refuses in production with ForbiddenException', () => {
      process.env.NODE_ENV = 'production';
      expect(() => controller.executeRun('r-002', { prompt: 'test' })).toThrow(ForbiddenException);
    });

    it('refuses when ENABLE_LOCAL_CODEX is missing', () => {
      process.env.ENABLE_LOCAL_CODEX = 'false';
      expect(() => controller.executeRun('r-002', { prompt: 'test' })).toThrow(
        ServiceUnavailableException,
      );
    });

    it('refuses when ALLOW_LOCAL_PROCESS_EXECUTION is missing', () => {
      process.env.ALLOW_LOCAL_PROCESS_EXECUTION = 'false';
      expect(() => controller.executeRun('r-002', { prompt: 'test' })).toThrow(
        ServiceUnavailableException,
      );
    });

    it('returns NotFoundException for missing run', () => {
      expect(() => controller.executeRun('missing', { prompt: 'test' })).toThrow(NotFoundException);
    });

    it('rejects missing prompt with BadRequestException', () => {
      expect(() => controller.executeRun('r-002', {})).toThrow(BadRequestException);
    });

    it('rejects empty prompt with BadRequestException', () => {
      expect(() => controller.executeRun('r-002', { prompt: '   ' })).toThrow(BadRequestException);
    });

    it('defaults mode to read-only', () => {
      controller.executeRun('r-002', { prompt: 'test' });
      const call = vi.mocked(mockRunExecutionService.executeRun).mock.calls[0][0];
      expect(call.mode).toBe('read-only');
    });

    it('rejects invalid mode', () => {
      expect(() =>
        controller.executeRun('r-002', {
          prompt: 'test',
          mode: 'danger-full-access' as 'read-only',
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects workspace-write when ALLOW_CODEX_WORKSPACE_WRITE is not true', () => {
      expect(() =>
        controller.executeRun('r-002', { prompt: 'test', mode: 'workspace-write' }),
      ).toThrow(BadRequestException);
    });

    it('allows workspace-write when ALLOW_CODEX_WORKSPACE_WRITE is true', () => {
      process.env.ALLOW_CODEX_WORKSPACE_WRITE = 'true';
      const result = controller.executeRun('r-002', { prompt: 'test', mode: 'workspace-write' });
      expect(result.executionStarted).toBe(true);
      const call = vi.mocked(mockRunExecutionService.executeRun).mock.calls[0][0];
      expect(call.mode).toBe('workspace-write');
    });

    it('calls RunExecutionService.executeRun with runId/taskId/projectId/prompt/cwd/mode', () => {
      process.env.CODEX_CWD = '/tmp/test-cwd';
      controller.executeRun('r-002', { prompt: 'Review the code', mode: 'read-only' });

      const call = vi.mocked(mockRunExecutionService.executeRun).mock.calls[0][0];
      expect(call.runId).toBe('r-002');
      expect(call.taskId).toBe('t-002');
      expect(call.projectId).toBe('p-001');
      expect(call.prompt).toBe('Review the code');
      expect(call.cwd).toBe('/tmp/test-cwd');
      expect(call.mode).toBe('read-only');
    });

    it('does not call RunsService.completeRun', () => {
      const completeSpy = vi.spyOn(runsService, 'completeRun');
      controller.executeRun('r-002', { prompt: 'test' });
      expect(completeSpy).not.toHaveBeenCalled();
    });

    it('does not call RunsService.failRun', () => {
      const failSpy = vi.spyOn(runsService, 'failRun');
      controller.executeRun('r-002', { prompt: 'test' });
      expect(failSpy).not.toHaveBeenCalled();
    });
  });
});
