import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { describe, expect, it, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { PROJECTS, RUNS, TASKS } from '@squad/core';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { RunsController } from './runs.controller';
import { TasksController } from './tasks.controller';
import { RunsService } from './runs.service';
import { RunsGateway } from './runs.gateway';
import { RunExecutionService } from './run-execution.service';
import { PrismaService } from '../prisma/prisma.service';
import { assertTestDatabase } from '../prisma/test-database';

describe('ProjectsController', () => {
  let prisma: PrismaService;
  let controller: ProjectsController;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetProjectTables(prisma);
    controller = new ProjectsController(new ProjectsService(prisma));
  });

  afterAll(async () => {
    await resetProjectTables(prisma);
    await prisma.$disconnect();
  });

  it('returns all seeded projects', async () => {
    await expect(controller.findAll()).resolves.toEqual(PROJECTS);
  });

  it('returns a project by id', async () => {
    await expect(controller.findOne('p-001')).resolves.toEqual(PROJECTS[0]);
  });

  it('throws the existing not found message for a missing project', async () => {
    await expect(controller.findOne('missing')).rejects.toThrow(NotFoundException);
    await expect(controller.findOne('missing')).rejects.toThrow("Project 'missing' not found");
  });

  it('creates, updates, and deletes a project', async () => {
    const created = await controller.create({
      characterId: 'yui',
      title: 'Docs Refresh',
      status: 'active',
      summary: 'Update onboarding docs.',
      nextAction: 'Draft outline',
      updatedLabel: 'Just now',
    });

    expect(created.id).toEqual(expect.any(String));
    expect(created.title).toBe('Docs Refresh');

    await expect(
      controller.update(created.id, { status: 'review', nextAction: 'Review outline' }),
    ).resolves.toMatchObject({
      id: created.id,
      status: 'review',
      nextAction: 'Review outline',
    });

    await expect(controller.delete(created.id)).resolves.toEqual({ success: true });
    await expect(controller.findOne(created.id)).rejects.toThrow(NotFoundException);
  });

  it('returns tasks for an existing project', async () => {
    await expect(controller.findTasks('p-001')).resolves.toEqual(
      TASKS.filter((task) => task.projectId === 'p-001'),
    );
  });

  it('creates and updates tasks for a project', async () => {
    const task = await controller.createTask('p-001', {
      title: 'Write migration notes',
      status: 'todo',
      assignedCharacterId: 'aki',
    });

    expect(task.projectId).toBe('p-001');
    expect(task.id).toEqual(expect.any(String));

    await expect(controller.updateTask(task.id, { status: 'in_progress' })).resolves.toMatchObject({
      id: task.id,
      status: 'in_progress',
    });
  });

  it('cascade-deletes tasks when a project is deleted', async () => {
    await expect(controller.findTasks('p-001')).resolves.toHaveLength(2);

    await controller.delete('p-001');

    await expect(controller.findTasks('p-001')).rejects.toThrow(NotFoundException);
    expect(await prisma.task.findMany({ where: { projectId: 'p-001' } })).toEqual([]);
  });

  it('throws before returning tasks for a missing project', async () => {
    await expect(controller.findTasks('missing')).rejects.toThrow(NotFoundException);
    await expect(controller.findTasks('missing')).rejects.toThrow("Project 'missing' not found");
  });
});

async function resetProjectTables(prisma: PrismaService) {
  assertTestDatabase();
  await prisma.relay.deleteMany();
  await prisma.stageMessage.deleteMany();
  await prisma.projectStage.deleteMany();
  await prisma.todoItem.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
}

describe('TasksController', () => {
  let prisma: PrismaService;
  let projectsService: ProjectsService;
  let controller: TasksController;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetProjectTables(prisma);
    projectsService = new ProjectsService(prisma);
    controller = new TasksController(new RunsService(), new RunsGateway(), projectsService);
  });

  afterAll(async () => {
    await resetProjectTables(prisma);
    await prisma.$disconnect();
  });

  it('returns runs for an existing task', async () => {
    await expect(controller.findRuns('t-001')).resolves.toEqual(
      RUNS.filter((run) => run.taskId === 't-001'),
    );
  });

  it('throws the existing not found message for missing task runs', async () => {
    await expect(controller.findRuns('missing')).rejects.toThrow(NotFoundException);
    await expect(controller.findRuns('missing')).rejects.toThrow("Task 'missing' not found");
  });

  it('starts a todo task, moves it to in_progress in the database, and returns a running run', async () => {
    const result = await controller.start('t-008');
    expect(result.taskId).toBe('t-008');
    expect(result.projectId).toBe('p-004');
    expect(result.status).toBe('running');
    expect(typeof result.id).toBe('string');
    expect(typeof result.startedAt).toBe('string');
    await expect(projectsService.findTaskById('t-008')).resolves.toMatchObject({
      status: 'in_progress',
    });
    expect(TASKS.find((task) => task.id === 't-008')?.status).toBe('todo');
  });

  it('refuses to start the same task twice', async () => {
    await controller.start('t-008');
    await expect(controller.start('t-008')).rejects.toThrow(
      "Task 't-008' cannot be started (status: in_progress)",
    );
  });

  it('lets exactly one of two concurrent starts win', async () => {
    const results = await Promise.allSettled([
      controller.start('t-008'),
      controller.start('t-008'),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  });

  it('starts and lists runs for a task that only exists in the database', async () => {
    const task = await projectsService.createTask({
      projectId: 'p-001',
      title: 'Created through the API',
      status: 'todo',
      assignedCharacterId: 'aki',
    });

    const run = await controller.start(task.id);
    expect(run).toMatchObject({ taskId: task.id, projectId: 'p-001', status: 'running' });
    await expect(controller.findRuns(task.id)).resolves.toEqual([run]);
  });

  it('reads the start guard from the database, not the seed', async () => {
    await projectsService.updateTask('t-008', { status: 'done' });
    await expect(controller.start('t-008')).rejects.toThrow(BadRequestException);
    await expect(controller.start('t-008')).rejects.toThrow(
      "Task 't-008' cannot be started (status: done)",
    );
  });

  it('rejects a non-todo task with the existing message', async () => {
    await expect(controller.start('t-002')).rejects.toThrow(BadRequestException);
    await expect(controller.start('t-002')).rejects.toThrow(
      "Task 't-002' cannot be started (status: in_progress)",
    );
  });

  it('releases a started task back to todo so it can be started again', async () => {
    await controller.start('t-008');
    await expect(controller.release('t-008')).resolves.toMatchObject({
      id: 't-008',
      status: 'todo',
    });
    await expect(controller.start('t-008')).resolves.toMatchObject({ status: 'running' });
  });

  it('never releases a task someone finished or blocked', async () => {
    await projectsService.updateTask('t-008', { status: 'done' });
    await expect(controller.release('t-008')).rejects.toThrow(
      "Task 't-008' cannot be released (status: done)",
    );
    await expect(projectsService.findTaskById('t-008')).resolves.toMatchObject({ status: 'done' });
  });

  it('throws the existing not found message for a missing task release', async () => {
    await expect(controller.release('missing')).rejects.toThrow("Task 'missing' not found");
  });

  it('throws the existing not found message for a missing task start', async () => {
    await expect(controller.start('missing')).rejects.toThrow(NotFoundException);
    await expect(controller.start('missing')).rejects.toThrow("Task 'missing' not found");
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
