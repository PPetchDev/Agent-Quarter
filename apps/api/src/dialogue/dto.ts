import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  IsOmittable,
  MAX_LIST_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
} from '../common/validation';
import {
  OFFICE_AGENT_IDS,
  type GenerateOfficeDialogueInput,
  type OfficeAgentId,
  type PlanWorkflowInput,
} from './dialogue.service';

const OFFICE_STATUSES = ['idle', 'working'] as const;
const MAX_DIALOGUE_CHARS = 500;

export class OfficeDialogueDto implements GenerateOfficeDialogueInput {
  @IsIn(OFFICE_AGENT_IDS) fromAgentId!: OfficeAgentId;
  @IsOmittable() @IsIn(OFFICE_AGENT_IDS) toAgentId?: OfficeAgentId;
  // The web adapter treats this as optional; the idle loop is the only caller today.
  @IsIn(OFFICE_STATUSES) officeStatus: (typeof OFFICE_STATUSES)[number] = 'idle';

  @IsOmittable()
  @IsArray()
  @ArrayMaxSize(MAX_LIST_LENGTH)
  @IsString({ each: true })
  @MaxLength(MAX_TITLE_LENGTH, { each: true })
  recentDialogue?: string[];

  @IsOmittable() @IsInt() now?: number;
  @IsOmittable() @IsInt() @Min(1) @Max(MAX_DIALOGUE_CHARS) maxChars?: number;
}

export class PlanWorkflowDto implements PlanWorkflowInput {
  @IsString() @MaxLength(MAX_TEXT_LENGTH) commandText!: string;

  @IsOmittable()
  @IsArray()
  @ArrayMaxSize(OFFICE_AGENT_IDS.length)
  @IsIn(OFFICE_AGENT_IDS, { each: true })
  busyAgentIds?: OfficeAgentId[];

  @IsOmittable() @IsBoolean() previousError?: boolean;
}
