import { Injectable } from '@nestjs/common';
import type { Project as PrismaProject, Task as PrismaTask } from '@prisma/client';
import {
  PROJECTS,
  TASKS,
  type Project,
  type ProjectStatus,
  type Task,
  type TaskStatus,
} from '@squad/core';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  private seedPromise: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  // Project CRUD
  public async findAllProjects(): Promise<Project[]> {
    await this.ensureSeedData();
    const projects = await this.prisma.project.findMany({ orderBy: { id: 'asc' } });
    return projects.map(mapProject);
  }

  public async findProjectById(id: string): Promise<Project | undefined> {
    await this.ensureSeedData();
    const project = await this.prisma.project.findUnique({ where: { id } });
    return project ? mapProject(project) : undefined;
  }

  public async createProject(input: Omit<Project, 'id'>): Promise<Project> {
    await this.ensureSeedData();
    const project = await this.prisma.project.create({
      data: projectCreateData({ ...input, id: randomUUID() }),
    });
    return mapProject(project);
  }

  public async updateProject(
    id: string,
    updates: Partial<Omit<Project, 'id'>>,
  ): Promise<Project | undefined> {
    await this.ensureSeedData();
    try {
      const project = await this.prisma.project.update({
        where: { id },
        data: projectUpdateData(updates),
      });
      return mapProject(project);
    } catch (err) {
      if (isPrismaNotFound(err)) return undefined;
      throw err;
    }
  }

  public async deleteProject(id: string): Promise<boolean> {
    await this.ensureSeedData();
    try {
      await this.prisma.project.delete({ where: { id } });
      return true;
    } catch (err) {
      if (isPrismaNotFound(err)) return false;
      throw err;
    }
  }

  // Task CRUD
  public async findAllTasksByProjectId(projectId: string): Promise<Task[]> {
    await this.ensureSeedData();
    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      orderBy: { id: 'asc' },
    });
    return tasks.map(mapTask);
  }

  public async findTaskById(id: string): Promise<Task | undefined> {
    await this.ensureSeedData();
    const task = await this.prisma.task.findUnique({ where: { id } });
    return task ? mapTask(task) : undefined;
  }

  public async createTask(input: Omit<Task, 'id'>): Promise<Task> {
    await this.ensureSeedData();
    const task = await this.prisma.task.create({
      data: taskCreateData({ ...input, id: randomUUID() }),
    });
    return mapTask(task);
  }

  public async updateTask(
    id: string,
    updates: Partial<Omit<Task, 'id'>>,
  ): Promise<Task | undefined> {
    await this.ensureSeedData();
    try {
      const task = await this.prisma.task.update({
        where: { id },
        data: taskUpdateData(updates),
      });
      return mapTask(task);
    } catch (err) {
      if (isPrismaNotFound(err)) return undefined;
      throw err;
    }
  }

  public async deleteTask(id: string): Promise<boolean> {
    await this.ensureSeedData();
    try {
      await this.prisma.task.delete({ where: { id } });
      return true;
    } catch (err) {
      if (isPrismaNotFound(err)) return false;
      throw err;
    }
  }

  private async ensureSeedData(): Promise<void> {
    if (!this.seedPromise) {
      this.seedPromise = this.seedIfEmpty().catch((err) => {
        this.seedPromise = null;
        throw err;
      });
    }

    await this.seedPromise;
  }

  private async seedIfEmpty(): Promise<void> {
    const projectCount = await this.prisma.project.count();
    if (projectCount > 0) return;

    await this.prisma.$transaction(async (tx) => {
      for (const project of PROJECTS) {
        await tx.project.upsert({
          where: { id: project.id },
          update: {},
          create: projectCreateData(project),
        });
      }

      for (const task of TASKS) {
        await tx.task.upsert({
          where: { id: task.id },
          update: {},
          create: taskCreateData(task),
        });
      }
    });
  }
}

function mapProject(project: PrismaProject): Project {
  return {
    id: project.id,
    characterId: project.characterId || project.leadCharacterId,
    title: project.title,
    status: project.status as ProjectStatus,
    summary: project.summary || project.context,
    nextAction: project.nextAction,
    updatedLabel: project.updatedLabel,
  };
}

function mapTask(task: PrismaTask): Task {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    status: task.status as TaskStatus,
    assignedCharacterId: task.assignedCharacterId ?? undefined,
    memberAgentIds: parseMemberAgentIds(task.memberAgentIdsJson),
  };
}

function projectCreateData(project: Project) {
  return {
    id: project.id,
    title: project.title,
    characterId: project.characterId,
    summary: project.summary,
    nextAction: project.nextAction,
    updatedLabel: project.updatedLabel,
    context: project.summary,
    leadCharacterId: project.characterId,
    status: project.status,
  };
}

function projectUpdateData(updates: Partial<Omit<Project, 'id'>>) {
  return {
    ...(updates.title !== undefined ? { title: updates.title } : {}),
    ...(updates.characterId !== undefined
      ? { characterId: updates.characterId, leadCharacterId: updates.characterId }
      : {}),
    ...(updates.summary !== undefined
      ? { summary: updates.summary, context: updates.summary }
      : {}),
    ...(updates.nextAction !== undefined ? { nextAction: updates.nextAction } : {}),
    ...(updates.updatedLabel !== undefined ? { updatedLabel: updates.updatedLabel } : {}),
    ...(updates.status !== undefined ? { status: updates.status } : {}),
  };
}

function taskCreateData(task: Task) {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    status: task.status,
    assignedCharacterId: task.assignedCharacterId,
    memberAgentIdsJson: stringifyMemberAgentIds(task.memberAgentIds),
  };
}

function taskUpdateData(updates: Partial<Omit<Task, 'id'>>) {
  return {
    ...(updates.projectId !== undefined ? { projectId: updates.projectId } : {}),
    ...(updates.title !== undefined ? { title: updates.title } : {}),
    ...(updates.status !== undefined ? { status: updates.status } : {}),
    ...(updates.assignedCharacterId !== undefined
      ? { assignedCharacterId: updates.assignedCharacterId }
      : {}),
    ...(updates.memberAgentIds !== undefined
      ? { memberAgentIdsJson: stringifyMemberAgentIds(updates.memberAgentIds) }
      : {}),
  };
}

function parseMemberAgentIds(value: string | null): string[] | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === 'string')) {
      return parsed;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function stringifyMemberAgentIds(value: string[] | undefined): string | undefined {
  return value ? JSON.stringify(value) : undefined;
}

function isPrismaNotFound(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2025'
  );
}
