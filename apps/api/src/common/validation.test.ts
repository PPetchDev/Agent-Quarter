import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { describe, expect, it } from 'vitest';
import { JoinStageDto, SendMessageDto } from '../claude/dto';
import { OfficeDialogueDto, PlanWorkflowDto } from '../dialogue/dto';
import {
  CreateProjectDto,
  CreateTaskDto,
  ExecuteRunDto,
  UpdateProjectDto,
  UpdateTaskDto,
} from '../projects/dto';
import { createHttpValidationPipe, createWsValidationPipe } from './validation';

const pipe = createHttpValidationPipe();
const body = (metatype: ArgumentMetadata['metatype']): ArgumentMetadata => ({
  type: 'body',
  metatype,
});
const accepts = (metatype: ArgumentMetadata['metatype'], value: unknown) =>
  pipe.transform(value, body(metatype));
const rejects = async (metatype: ArgumentMetadata['metatype'], value: unknown) =>
  expect(pipe.transform(value, body(metatype))).rejects.toThrow(BadRequestException);

const project = {
  characterId: 'yui',
  title: 'Docs Refresh',
  status: 'active',
  summary: 'Update onboarding docs.',
  nextAction: 'Draft outline',
  updatedLabel: 'Just now',
};

describe('project DTOs', () => {
  it('accepts the payload the web sends to create a project', async () => {
    await expect(accepts(CreateProjectDto, project)).resolves.toMatchObject(project);
  });

  it('rejects an empty create body instead of letting Prisma 500', async () => {
    await rejects(CreateProjectDto, {});
  });

  it('rejects unknown fields and unknown statuses', async () => {
    await rejects(CreateProjectDto, { ...project, id: 'p-999' });
    await rejects(CreateProjectDto, { ...project, status: 'archived' });
  });

  it('accepts partial updates and rejects wrong types', async () => {
    await expect(accepts(UpdateProjectDto, { status: 'paused' })).resolves.toMatchObject({
      status: 'paused',
    });
    await rejects(UpdateProjectDto, { title: 42 });
  });
});

describe('task DTOs', () => {
  const task = { title: 'Write migration notes', status: 'todo', assignedCharacterId: 'aki' };

  it('accepts the payload the web sends to create a task', async () => {
    await expect(accepts(CreateTaskDto, task)).resolves.toMatchObject(task);
    await expect(
      accepts(CreateTaskDto, { ...task, memberAgentIds: ['agent-1', 'agent-2'] }),
    ).resolves.toMatchObject({ memberAgentIds: ['agent-1', 'agent-2'] });
  });

  it('rejects free-form statuses and non-array member ids', async () => {
    await rejects(CreateTaskDto, { ...task, status: 'whenever' });
    await rejects(UpdateTaskDto, { memberAgentIds: 'agent-1' });
    await rejects(UpdateTaskDto, { memberAgentIds: [1, 2] });
  });

  it('treats an explicit null as invalid rather than omitted', async () => {
    await rejects(UpdateTaskDto, { title: null });
    await rejects(UpdateProjectDto, { status: null });
  });

  it('accepts the office demo reset', async () => {
    await expect(accepts(UpdateTaskDto, { status: 'todo' })).resolves.toMatchObject({
      status: 'todo',
    });
  });
});

describe('ExecuteRunDto', () => {
  it('accepts the dev execute payload and rejects an unknown mode', async () => {
    await expect(
      accepts(ExecuteRunDto, { prompt: 'Summarize', mode: 'read-only' }),
    ).resolves.toMatchObject({ prompt: 'Summarize' });
    await rejects(ExecuteRunDto, { prompt: 'Summarize', mode: 'root' });
  });
});

describe('dialogue DTOs', () => {
  it('accepts the office dialogue payload the web sends', async () => {
    const payload = {
      fromAgentId: 'agent-1',
      toAgentId: 'agent-2',
      officeStatus: 'idle',
      recentDialogue: ['Hi'],
      now: 1_700_000_000_000,
      maxChars: 80,
    };
    await expect(accepts(OfficeDialogueDto, payload)).resolves.toMatchObject(payload);
    await expect(accepts(OfficeDialogueDto, { fromAgentId: 'agent-3' })).resolves.toBeDefined();
  });

  it('rejects unknown agents and nonsense limits', async () => {
    await rejects(OfficeDialogueDto, { fromAgentId: 'agent-9' });
    await rejects(OfficeDialogueDto, { fromAgentId: 'agent-1', maxChars: 0 });
    await rejects(OfficeDialogueDto, { fromAgentId: 'agent-1', recentDialogue: 'Hi' });
  });

  it('caps the command text sent to the planner LLM', async () => {
    await expect(
      accepts(PlanWorkflowDto, {
        commandText: 'Build a verified lounge workflow',
        busyAgentIds: ['agent-2'],
        previousError: false,
      }),
    ).resolves.toBeDefined();
    await rejects(PlanWorkflowDto, { commandText: 'x'.repeat(2001) });
    await rejects(PlanWorkflowDto, {});
  });
});

describe('stage socket DTOs', () => {
  const wsPipe = createWsValidationPipe();
  const message = (metatype: ArgumentMetadata['metatype'], value: unknown) =>
    wsPipe.transform(value, body(metatype));

  it('accepts the web join and send payloads', async () => {
    await expect(message(JoinStageDto, { characterId: 'yui' })).resolves.toBeDefined();
    await expect(
      message(SendMessageDto, { characterId: 'yui', content: 'Hello!' }),
    ).resolves.toBeDefined();
  });

  it('rejects oversized or non-string chat content with a WsException', async () => {
    await expect(
      message(SendMessageDto, { characterId: 'yui', content: 'x'.repeat(4001) }),
    ).rejects.toThrow(WsException);
    await expect(message(SendMessageDto, { characterId: 'yui', content: {} })).rejects.toThrow(
      WsException,
    );
    await expect(message(JoinStageDto, {})).rejects.toThrow(WsException);
  });
});
