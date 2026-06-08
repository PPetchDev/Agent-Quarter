import type { AgentTaskType } from './agentTypes';

export type OfficeAgentId =
  | 'agent-1'
  | 'agent-2'
  | 'agent-3'
  | 'agent-4'
  | 'agent-5';

export type OfficeToolId = 'map' | 'edit' | 'test' | 'browser' | 'git';

export type OfficeWorkflowStatus = 'idle' | 'running' | 'paused' | 'done';

export type OfficeWorkflowAgent = {
  id: OfficeAgentId;
  name: string;
  title: string;
  characterId: string;
  focus: string;
};

export type OfficeWorkflowStep = {
  id: string;
  order: number;
  agentId: OfficeAgentId;
  taskType: AgentTaskType;
  title: string;
  detail: string;
  toolId: OfficeToolId;
  handoffTo?: OfficeAgentId;
};

export type OfficeChatKind = 'status' | 'handoff' | 'done' | 'blocked' | 'dialogue';

export type OfficeChatMessage = {
  id: string;
  agentId: OfficeAgentId;
  toAgentId?: OfficeAgentId;
  kind: OfficeChatKind;
  text: string;
};

export type OfficeToolEventStatus = 'allowed' | 'done' | 'blocked';

export type OfficeToolEvent = {
  id: string;
  agentId: OfficeAgentId;
  toolId: OfficeToolId;
  status: OfficeToolEventStatus;
  label: string;
  detail: string;
};

export const OFFICE_WORKFLOW_AGENTS: readonly OfficeWorkflowAgent[] = [
  {
    id: 'agent-1',
    name: 'Mai',
    title: 'Frontend Lead',
    characterId: 'mai',
    focus: 'UI slice',
  },
  {
    id: 'agent-2',
    name: 'Aki',
    title: 'DevOps',
    characterId: 'aki',
    focus: 'verification',
  },
  {
    id: 'agent-3',
    name: 'Ren',
    title: 'Backend',
    characterId: 'ren',
    focus: 'contracts',
  },
  {
    id: 'agent-4',
    name: 'Yui',
    title: 'Reviewer',
    characterId: 'yui',
    focus: 'risk review',
  },
  {
    id: 'agent-5',
    name: 'Mika',
    title: 'Designer',
    characterId: 'mika',
    focus: 'flow shape',
  },
];

export const OFFICE_TOOL_BOUNDARIES: Readonly<Record<OfficeToolId, {
  label: string;
  guardrail: string;
}>> = {
  map: {
    label: 'Map',
    guardrail: 'Read ai/maps before source.',
  },
  edit: {
    label: 'Patch',
    guardrail: 'Change only the active slice.',
  },
  test: {
    label: 'Verify',
    guardrail: 'Run exact verification commands.',
  },
  browser: {
    label: 'Browser',
    guardrail: 'Inspect visual changes when needed.',
  },
  git: {
    label: 'Close',
    guardrail: 'Summarize changed files and risks.',
  },
};

const DEFAULT_COMMAND = 'Build the next verified office workflow slice';

function includesAny(text: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => text.includes(token));
}

export function normalizeOfficeCommand(commandText: string): string {
  const trimmed = commandText.trim().replace(/\s+/g, ' ');
  return trimmed.length > 0 ? trimmed : DEFAULT_COMMAND;
}

export function inferPrimaryOfficeTask(commandText: string): AgentTaskType {
  const text = normalizeOfficeCommand(commandText).toLowerCase();

  if (includesAny(text, ['review', 'audit', 'ตรวจ', 'รีวิว'])) return 'review';
  if (includesAny(text, ['doc', 'docs', 'readme', 'document', 'เอกสาร'])) return 'document';
  if (includesAny(text, ['research', 'map', 'ศึกษา', 'หา'])) return 'research';
  if (includesAny(text, ['meeting', 'plan', 'ประชุม', 'วางแผน'])) return 'meeting';
  if (includesAny(text, ['print', 'report', 'สรุป'])) return 'print';
  if (includesAny(text, ['rest', 'พัก'])) return 'rest';

  return 'code';
}

export function createOfficeWorkflowSteps(commandText: string): OfficeWorkflowStep[] {
  const primaryTask = inferPrimaryOfficeTask(commandText);

  const steps: OfficeWorkflowStep[] = [
    {
      id: 'map-scope',
      order: 1,
      agentId: 'agent-5',
      taskType: 'meeting',
      title: 'Map',
      detail: 'Scope the command and pick a narrow slice.',
      toolId: 'map',
      handoffTo: 'agent-1',
    },
    {
      id: 'build-slice',
      order: 2,
      agentId: 'agent-1',
      taskType: primaryTask,
      title: 'Build',
      detail: 'Patch the smallest working version.',
      toolId: 'edit',
      handoffTo: 'agent-3',
    },
    {
      id: 'contract-check',
      order: 3,
      agentId: 'agent-3',
      taskType: 'document',
      title: 'Contract',
      detail: 'Check API, data, and tool boundaries.',
      toolId: 'edit',
      handoffTo: 'agent-4',
    },
    {
      id: 'risk-review',
      order: 4,
      agentId: 'agent-4',
      taskType: 'review',
      title: 'Review',
      detail: 'Look for regressions and missing verification.',
      toolId: 'test',
      handoffTo: 'agent-2',
    },
    {
      id: 'closeout',
      order: 5,
      agentId: 'agent-2',
      taskType: 'print',
      title: 'Close',
      detail: 'Package the result with exact status.',
      toolId: 'git',
    },
  ];

  return steps;
}

export function getOfficeAgent(agentId: OfficeAgentId): OfficeWorkflowAgent {
  const agent = OFFICE_WORKFLOW_AGENTS.find((item) => item.id === agentId);
  if (!agent) {
    throw new Error(`Unknown office agent: ${agentId}`);
  }
  return agent;
}

export function describeOfficeStepStart(
  step: OfficeWorkflowStep,
  commandText: string,
): string {
  const command = normalizeOfficeCommand(commandText);
  return `${step.title}: ${step.detail} Command: ${command}`;
}

export function describeOfficeStepDone(
  step: OfficeWorkflowStep,
  nextStep?: OfficeWorkflowStep,
): string {
  if (!nextStep) return `${step.title} done. Workflow ready for closeout.`;
  const nextAgent = getOfficeAgent(nextStep.agentId);
  return `${step.title} done. Handing off to ${nextAgent.name}.`;
}

export function createOfficeToolEvent(
  step: OfficeWorkflowStep,
): Omit<OfficeToolEvent, 'id'> {
  const tool = OFFICE_TOOL_BOUNDARIES[step.toolId];
  return {
    agentId: step.agentId,
    toolId: step.toolId,
    status: 'allowed',
    label: tool.label,
    detail: tool.guardrail,
  };
}
