import { ArrayMaxSize, IsArray, IsIn, IsString, MaxLength } from 'class-validator';
import {
  PROJECT_STATUS_LABEL,
  type Project,
  type ProjectStatus,
  type Task,
  type TaskStatus,
} from '@squad/core';
import {
  IsOmittable,
  MAX_ID_LENGTH,
  MAX_LIST_LENGTH,
  MAX_PROMPT_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
} from '../common/validation';

const PROJECT_STATUSES = Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[];
// A Record keeps the list exhaustive: a new TaskStatus fails to compile until it is added here.
const TASK_STATUS_KEYS: Record<TaskStatus, true> = {
  todo: true,
  in_progress: true,
  done: true,
  blocked: true,
};
const TASK_STATUSES = Object.keys(TASK_STATUS_KEYS) as TaskStatus[];
const RUN_MODES = ['read-only', 'workspace-write'] as const;

export class CreateProjectDto implements Omit<Project, 'id'> {
  @IsString() @MaxLength(MAX_ID_LENGTH) characterId!: string;
  @IsString() @MaxLength(MAX_TITLE_LENGTH) title!: string;
  @IsIn(PROJECT_STATUSES) status!: ProjectStatus;
  @IsString() @MaxLength(MAX_TEXT_LENGTH) summary!: string;
  @IsString() @MaxLength(MAX_TEXT_LENGTH) nextAction!: string;
  @IsString() @MaxLength(MAX_TITLE_LENGTH) updatedLabel!: string;
}

export class UpdateProjectDto implements Partial<Omit<Project, 'id'>> {
  @IsOmittable() @IsString() @MaxLength(MAX_ID_LENGTH) characterId?: string;
  @IsOmittable() @IsString() @MaxLength(MAX_TITLE_LENGTH) title?: string;
  @IsOmittable() @IsIn(PROJECT_STATUSES) status?: ProjectStatus;
  @IsOmittable() @IsString() @MaxLength(MAX_TEXT_LENGTH) summary?: string;
  @IsOmittable() @IsString() @MaxLength(MAX_TEXT_LENGTH) nextAction?: string;
  @IsOmittable() @IsString() @MaxLength(MAX_TITLE_LENGTH) updatedLabel?: string;
}

export class CreateTaskDto implements Omit<Task, 'id' | 'projectId'> {
  @IsString() @MaxLength(MAX_TITLE_LENGTH) title!: string;
  @IsIn(TASK_STATUSES) status!: TaskStatus;
  @IsOmittable() @IsString() @MaxLength(MAX_ID_LENGTH) assignedCharacterId?: string;

  @IsOmittable()
  @IsArray()
  @ArrayMaxSize(MAX_LIST_LENGTH)
  @IsString({ each: true })
  @MaxLength(MAX_ID_LENGTH, { each: true })
  memberAgentIds?: string[];
}

export class UpdateTaskDto implements Partial<Omit<Task, 'id'>> {
  @IsOmittable() @IsString() @MaxLength(MAX_ID_LENGTH) projectId?: string;
  @IsOmittable() @IsString() @MaxLength(MAX_TITLE_LENGTH) title?: string;
  @IsOmittable() @IsIn(TASK_STATUSES) status?: TaskStatus;
  @IsOmittable() @IsString() @MaxLength(MAX_ID_LENGTH) assignedCharacterId?: string;

  @IsOmittable()
  @IsArray()
  @ArrayMaxSize(MAX_LIST_LENGTH)
  @IsString({ each: true })
  @MaxLength(MAX_ID_LENGTH, { each: true })
  memberAgentIds?: string[];
}

/** Shape only; the controller keeps its own "prompt is required" and env-gate checks. */
export class ExecuteRunDto {
  @IsOmittable() @IsString() @MaxLength(MAX_PROMPT_LENGTH) prompt?: string;
  @IsOmittable() @IsIn(RUN_MODES) mode?: (typeof RUN_MODES)[number];
}
