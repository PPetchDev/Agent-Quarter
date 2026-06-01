import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { PROJECTS, RUNS, TASKS } from '@squad/core';
import { ProjectsController } from './projects.controller';
import { RunsController } from './runs.controller';
import { TasksController } from './tasks.controller';

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
  const controller = new TasksController();

  it('returns runs for an existing task', () => {
    expect(controller.findRuns('t-001')).toEqual(
      RUNS.filter((run) => run.taskId === 't-001'),
    );
  });

  it('throws the existing not found message for missing task runs', () => {
    expect(() => controller.findRuns('missing')).toThrow(NotFoundException);
    expect(() => controller.findRuns('missing')).toThrow("Task 'missing' not found");
  });

  it('starts a todo task without mutating seed data', () => {
    const result = controller.start('t-008');
    expect(result).toEqual({ ...TASKS.find((task) => task.id === 't-008'), status: 'in_progress' });
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
  const controller = new RunsController();

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
});
