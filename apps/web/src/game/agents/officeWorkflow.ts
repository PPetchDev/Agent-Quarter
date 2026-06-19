import type { AgentTaskType } from './agentTypes';

export type OfficeAgentId = 'agent-1' | 'agent-2' | 'agent-3' | 'agent-4' | 'agent-5';

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

export const OFFICE_TOOL_BOUNDARIES: Readonly<
  Record<
    OfficeToolId,
    {
      label: string;
      guardrail: string;
    }
  >
> = {
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

// ─── Dynamic workflow planner (phase 1: rule-based) ──────────────────────────

export type PlanWorkflowContext = {
  busyAgentIds?: OfficeAgentId[];
  previousError?: boolean;
};

function scoreAgentForCommand(
  agent: OfficeWorkflowAgent,
  lowerCommand: string,
): number {
  let score = 0;
  const { name } = agent;
  if (/ui|style|css|responsive|design|visual|layout|polish|flow/.test(lowerCommand)) {
    if (name === 'Mika') score += 4;
    if (name === 'Mai') score += 2;
  }
  if (/api|backend|data|schema|contract|endpoint|database/.test(lowerCommand)) {
    if (name === 'Ren') score += 4;
  }
  if (/test|qa|verify|audit|regression|edge case|coverage/.test(lowerCommand)) {
    if (name === 'Yui') score += 4;
    if (name === 'Aki') score += 2;
  }
  if (/deploy|ci|build|pipeline|docker|container/.test(lowerCommand)) {
    if (name === 'Aki') score += 4;
  }
  if (/docs|readme|document/.test(lowerCommand)) {
    if (name === 'Ren') score += 2;
  }
  return score;
}

function estimateCommandComplexity(commandText: string): number {
  const text = commandText.toLowerCase();
  let score = 1;
  if (text.length > 40) score += 1;
  if (/refactor|migrate|overhaul|rewrite|full/.test(text)) score += 2;
  if (/and|also|plus/.test(text)) score += 1;
  if (text.split(/\s+/).length > 8) score += 1;
  return Math.min(score, 3);
}

export function planWorkflowSteps(
  commandText: string,
  context?: PlanWorkflowContext,
): OfficeWorkflowStep[] {
  const primaryTask = inferPrimaryOfficeTask(commandText);
  const lowerCommand = commandText.toLowerCase();
  const complexity = estimateCommandComplexity(commandText);
  const busyIds = new Set(context?.busyAgentIds ?? []);

  // Trivial rest command: single step
  if (primaryTask === 'rest' && lowerCommand.split(/\s+/).length <= 2) {
    const available = OFFICE_WORKFLOW_AGENTS.filter((a) => !busyIds.has(a.id));
    const agent = available[0] ?? OFFICE_WORKFLOW_AGENTS[0]!;
    return [{
      id: 'rest-task',
      order: 1,
      agentId: agent.id,
      taskType: 'rest',
      title: 'Rest',
      detail: 'Take a break and recover.',
      toolId: 'map',
    }];
  }

  // Score agents for command match
  const scored = OFFICE_WORKFLOW_AGENTS
    .filter((a) => !busyIds.has(a.id))
    .map((a) => ({ agent: a, score: scoreAgentForCommand(a, lowerCommand) }))
    .sort((a, b) => b.score - a.score);

  const buildAgent = scored[0]?.agent ?? OFFICE_WORKFLOW_AGENTS[0]!;
  const reviewAgent = OFFICE_WORKFLOW_AGENTS.find(
    (a) => a.name === 'Yui' && a.id !== buildAgent.id && !busyIds.has(a.id),
  ) ?? OFFICE_WORKFLOW_AGENTS.find((a) => a.name === 'Aki' && !busyIds.has(a.id))
    ?? OFFICE_WORKFLOW_AGENTS[3]!;

  const steps: OfficeWorkflowStep[] = [];
  let order = 0;

  // Plan/Map step (complexity >= 2)
  if (complexity >= 2) {
    const mapper = scored.find((s) => s.agent.name === 'Mika' || s.agent.name === 'Mai')
      ?.agent ?? OFFICE_WORKFLOW_AGENTS[4]!;
    steps.push({
      id: `plan-${order}`,
      order: ++order,
      agentId: mapper.id,
      taskType: 'meeting',
      title: 'Plan',
      detail: 'Scope the command and pick a narrow slice.',
      toolId: 'map',
      handoffTo: buildAgent.id,
    });
  }

  // Build step (always)
  steps.push({
    id: `build-${order}`,
    order: ++order,
    agentId: buildAgent.id,
    taskType: primaryTask,
    title: 'Build',
    detail: 'Patch the smallest working version.',
    toolId: 'edit',
    handoffTo: complexity >= 2 ? reviewAgent.id : undefined,
  });

  // Review step (complexity >= 2)
  if (complexity >= 2) {
    steps.push({
      id: `review-${order}`,
      order: ++order,
      agentId: reviewAgent.id,
      taskType: 'review',
      title: 'Review',
      detail: 'Check for regressions and edge cases.',
      toolId: 'test',
      handoffTo: complexity >= 3 ? OFFICE_WORKFLOW_AGENTS[1]!.id : undefined,
    });
  }

  // Contract/Verify step (complexity >= 3)
  if (complexity >= 3) {
    const verifier = OFFICE_WORKFLOW_AGENTS.find((a) => a.name === 'Ren' && !busyIds.has(a.id))
      ?? OFFICE_WORKFLOW_AGENTS[2]!;
    steps.push({
      id: `contract-${order}`,
      order: ++order,
      agentId: verifier.id,
      taskType: 'document',
      title: 'Contract',
      detail: 'Verify API, data, and tool boundaries.',
      toolId: 'edit',
      handoffTo: OFFICE_WORKFLOW_AGENTS[1]!.id,
    });
  }

  // Close step (always)
  const closer = OFFICE_WORKFLOW_AGENTS.find((a) => a.name === 'Aki' && !busyIds.has(a.id))
    ?? OFFICE_WORKFLOW_AGENTS[1]!;
  steps.push({
    id: `close-${order}`,
    order: ++order,
    agentId: closer.id,
    taskType: 'print',
    title: 'Close',
    detail: 'Package the result with exact status.',
    toolId: 'git',
  });

  // Retry step if previous error
  if (context?.previousError && complexity >= 2) {
    const retryAgent = OFFICE_WORKFLOW_AGENTS.find(
      (a) => a.id !== buildAgent.id && !busyIds.has(a.id),
    ) ?? OFFICE_WORKFLOW_AGENTS[0]!;
    steps.splice(1, 0, {
      id: 'retry-step',
      order: 2,
      agentId: retryAgent.id,
      taskType: primaryTask,
      title: 'Retry',
      detail: 'Re-attempt with corrected approach.',
      toolId: 'edit',
      handoffTo: buildAgent.id,
    });
    steps.forEach((s, i) => { s.order = i + 1; });
  }

  return steps;
}

export function getOfficeAgent(agentId: OfficeAgentId): OfficeWorkflowAgent {
  const agent = OFFICE_WORKFLOW_AGENTS.find((item) => item.id === agentId);
  if (!agent) {
    throw new Error(`Unknown office agent: ${agentId}`);
  }
  return agent;
}

export function describeOfficeStepStart(step: OfficeWorkflowStep, commandText: string): string {
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

export function createOfficeToolEvent(step: OfficeWorkflowStep): Omit<OfficeToolEvent, 'id'> {
  const tool = OFFICE_TOOL_BOUNDARIES[step.toolId];
  return {
    agentId: step.agentId,
    toolId: step.toolId,
    status: 'allowed',
    label: tool.label,
    detail: tool.guardrail,
  };
}

// ─── LLM workflow step converter ─────────────────────────────────────────────

const AGENT_NAME_TO_ID: Record<string, OfficeAgentId> = {
  Mai: 'agent-1',
  Aki: 'agent-2',
  Ren: 'agent-3',
  Yui: 'agent-4',
  Mika: 'agent-5',
};

const TASK_TYPE_TO_AGENT_TYPE: Record<string, AgentTaskType> = {
  code: 'code',
  review: 'review',
  document: 'document',
  research: 'research',
  meeting: 'meeting',
  print: 'print',
  rest: 'rest',
};

const TOOL_LABEL_TO_TOOL_ID: Record<string, OfficeToolId> = {
  Map: 'map',
  Build: 'edit',
  Review: 'test',
  Contract: 'edit',
  Close: 'git',
};

export function convertLLMSteps(
  llmSteps: { agentName: string; title: string; taskType: string; detail: string; toolLabel: string; handoffTo?: string }[],
): OfficeWorkflowStep[] {
  return llmSteps.map((step, i) => {
    const agentId = AGENT_NAME_TO_ID[step.agentName] ?? 'agent-1';
    const handoffToName = step.handoffTo;
    const handoffToId = handoffToName ? (AGENT_NAME_TO_ID[handoffToName] as OfficeAgentId | undefined) : undefined;
    const nextStep = llmSteps[i + 1];
    const nextAgentName = nextStep?.agentName;
    const nextAgentId = nextAgentName ? (AGENT_NAME_TO_ID[nextAgentName] as OfficeAgentId | undefined) : undefined;

    return {
      id: `llm-${i}-${step.title.toLowerCase()}`,
      order: i + 1,
      agentId,
      taskType: TASK_TYPE_TO_AGENT_TYPE[step.taskType] ?? 'coding',
      title: step.title,
      detail: step.detail,
      toolId: TOOL_LABEL_TO_TOOL_ID[step.toolLabel] ?? 'edit',
      handoffTo: handoffToId ?? nextAgentId,
    };
  });
}
