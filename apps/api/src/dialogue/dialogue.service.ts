// ─── Types ────────────────────────────────────────────────────────────────────

import { Injectable, Inject } from '@nestjs/common';
import { LLM_TEXT_PROVIDER, type LlmTextProvider } from '../llm/llm-provider.interface';

export type OfficeAgentId = 'agent-1' | 'agent-2' | 'agent-3' | 'agent-4' | 'agent-5';

export type DialogueSource = 'deterministic' | 'llm';

export type OfficeDialogueAgent = {
  id: OfficeAgentId;
  name: string;
  title: string;
  focus: string;
};

export type GenerateOfficeDialogueInput = {
  fromAgentId: OfficeAgentId;
  toAgentId?: OfficeAgentId;
  officeStatus: 'idle' | 'working';
  recentDialogue?: string[];
  now?: number;
  maxChars?: number;
};

export type DialogueResponse = {
  fromAgentId: OfficeAgentId;
  toAgentId?: OfficeAgentId;
  text: string;
  source: DialogueSource;
  createdAt: number;
  fallbackUsed: boolean;
  errorSummary?: string;
  model?: string;
  requestId?: string;
};

// ─── Agent personas ───────────────────────────────────────────────────────────

const AGENTS: Record<OfficeAgentId, OfficeDialogueAgent> = {
  'agent-1': {
    id: 'agent-1',
    name: 'Mai',
    title: 'Cheerful frontend lead',
    focus: 'frontend polish, sprint energy',
  },
  'agent-2': {
    id: 'agent-2',
    name: 'Aki',
    title: 'Calm devops mechanic',
    focus: 'builds, deploys, stability',
  },
  'agent-3': {
    id: 'agent-3',
    name: 'Ren',
    title: 'Precise backend samurai',
    focus: 'APIs, data integrity, contracts',
  },
  'agent-4': {
    id: 'agent-4',
    name: 'Yui',
    title: 'Sharp code reviewer',
    focus: 'edge cases, quality, reviews',
  },
  'agent-5': {
    id: 'agent-5',
    name: 'Mika',
    title: 'Creative UI designer',
    focus: 'visual polish, softness, layout',
  },
};

const VALID_IDS = new Set(Object.keys(AGENTS)) as Set<OfficeAgentId>;

// ─── Fallback dialogue pool ───────────────────────────────────────────────────

const FALLBACK_POOL: Record<OfficeAgentId, readonly string[]> = {
  'agent-1': [
    'Ready for the sprint! ✨',
    'UI slice is looking polished.',
    'Let me check those responsive breakpoints.',
  ],
  'agent-2': ['Build passed. All green.', 'CI pipeline is stable.', 'Runtime logs look clean.'],
  'agent-3': [
    'API contract looks clean.',
    'Data integrity checks passed.',
    'Backend is holding up well.',
  ],
  'agent-4': [
    'Test coverage is looking healthy.',
    'No regressions in the last review.',
    'Edge cases are covered.',
  ],
  'agent-5': [
    'Flow feels natural now.',
    'Design tokens are in good shape.',
    'Color contrast passes WCAG.',
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clampText(text: string, maxChars?: number): string {
  if (maxChars === undefined || text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1) + '…';
}

function pickTarget(fromId: OfficeAgentId, avoid?: OfficeAgentId): OfficeAgentId {
  const candidates = [...VALID_IDS].filter((id) => id !== fromId && id !== avoid);
  // Deterministic: first alphabetically different agent
  return candidates[0] ?? (VALID_IDS.has('agent-1') ? 'agent-1' : fromId);
}

function pickFallbackText(agentId: OfficeAgentId, recentDialogue?: string[]): string {
  const pool = FALLBACK_POOL[agentId];
  if (!pool || pool.length === 0) return 'Working on it.';

  const recentSet = new Set(recentDialogue ?? []);
  const fresh = pool.filter((text) => !recentSet.has(text));
  return fresh.length > 0 ? fresh[0]! : pool[0]!;
}

// ─── Prompt builder (placeholder — not used for Claude yet) ───────────────────

export function buildOfficeDialoguePrompt(input: GenerateOfficeDialogueInput): string {
  const from = AGENTS[input.fromAgentId];
  const to = input.toAgentId ? AGENTS[input.toAgentId] : undefined;

  const lines = [
    `You are ${from.name}, ${from.title}. Focus: ${from.focus}.`,
    to ? `You are speaking to ${to.name}, ${to.title}.` : '',
    `Office status: ${input.officeStatus}.`,
    input.recentDialogue?.length
      ? `Recent dialogue:\n${input.recentDialogue.map((d) => `- ${d}`).join('\n')}`
      : '',
    `Respond with plain text only — no markdown, no code blocks, no roleplay narration, no real tool execution claims.`,
    input.maxChars ? `Keep the response under ${input.maxChars} characters.` : '',
  ];

  return lines.filter(Boolean).join('\n');
}

// ─── Output sanitizer ──────────────────────────────────────────────────────────

function sanitizeDialogueText(raw: string): string {
  let text = raw.trim();

  // Collapse newlines into spaces
  text = text.replace(/\n+/g, ' ');

  // Remove markdown code fence markers
  text = text.replace(/```[\s\S]*?```/g, ' ');
  text = text.replace(/`([^`]+)`/g, '$1');

  // Remove markdown formatting
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');

  // Remove leading/trailing quotes
  text = text.replace(/^["']|["']$/g, '');

  // Collapse multiple spaces
  text = text.replace(/\s{2,}/g, ' ').trim();

  return text;
}

// ─── Workflow planning types ─────────────────────────────────────────────────

export type PlanWorkflowInput = {
  commandText: string;
  busyAgentIds?: OfficeAgentId[];
  previousError?: boolean;
};

export type WorkflowStepPlan = {
  title: string;
  taskType: string;
  agentName: string;
  detail: string;
  toolLabel: string;
  handoffTo?: string;
};

export type PlanWorkflowResponse = {
  steps: WorkflowStepPlan[];
  source: 'llm' | 'deterministic';
  fallbackUsed: boolean;
  errorSummary?: string;
  model?: string;
};

// ─── Workflow plan prompt builder ────────────────────────────────────────────

export function buildWorkflowPlanPrompt(input: PlanWorkflowInput): string {
  const busyList = input.busyAgentIds?.length
    ? `Busy agents (DO NOT assign as primary builder): ${input.busyAgentIds.map((id) => AGENTS[id]?.name ?? id).join(', ')}.`
    : 'All agents available.';
  const errorNote = input.previousError ? 'Previous workflow step failed — include a Retry step with a different agent.' : '';

  return [
    `You are a workflow planner for an anime agent squad.`,
    `Agents: Mai (Frontend Lead, UI/design), Aki (DevOps, CI/deploy), Ren (Backend, APIs/data), Yui (Reviewer, QA/tests), Mika (Designer, visual/flow).`,
    `Tools: Map (scope), Build (implement), Review (verify), Contract (check boundaries), Close (git/package).`,
    `Task types: code, review, document, research, meeting, print, rest.`,
    busyList,
    errorNote,
    `Command: "${input.commandText}"`,
    `Respond with ONLY a JSON array of steps. Each step: {"title":"Plan","taskType":"meeting","agentName":"Mika","detail":"Scope the command","toolLabel":"Map","handoffTo":"Mai"}.`,
    `The first step should assign to the best agent for the command. The last step should be "Close".`,
    `Use 2-5 steps based on command complexity. Simple = 2-3 steps, complex = 4-5 steps.`,
    `Output ONLY the JSON array — no markdown, no explanation.`,
  ].filter(Boolean).join('\n');
}

// ─── Workflow plan parser ────────────────────────────────────────────────────

const VALID_TASK_TYPES = new Set(['code', 'review', 'document', 'research', 'meeting', 'print', 'rest']);
const VALID_TOOL_LABELS = new Set(['Map', 'Build', 'Review', 'Contract', 'Close']);

function parseWorkflowPlanText(raw: string): WorkflowStepPlan[] {
  // Extract JSON array from response
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item) => ({
        title: String(item.title ?? '').trim(),
        taskType: VALID_TASK_TYPES.has(String(item.taskType ?? '')) ? String(item.taskType) : 'code',
        agentName: String(item.agentName ?? '').trim(),
        detail: String(item.detail ?? '').trim(),
        toolLabel: VALID_TOOL_LABELS.has(String(item.toolLabel ?? '')) ? String(item.toolLabel) : 'Build',
        handoffTo: item.handoffTo ? String(item.handoffTo).trim() : undefined,
      }))
      .filter((step) => step.title.length > 0 && step.agentName.length > 0);
  } catch {
    return [];
  }
}

// ─── Plan workflow method ────────────────────────────────────────────────────

export function planWorkflowFallback(input: PlanWorkflowInput): PlanWorkflowResponse {
  return {
    steps: [],
    source: 'deterministic',
    fallbackUsed: true,
  };
}

@Injectable()
export class DialogueService {
  constructor(
    @Inject(LLM_TEXT_PROVIDER)
    private readonly llmProvider?: LlmTextProvider,
  ) {}

  async planOfficeWorkflow(input: PlanWorkflowInput): Promise<PlanWorkflowResponse> {
    // Try LLM
    if (this.llmProvider) {
      try {
        const prompt = buildWorkflowPlanPrompt(input);
        const result = await this.llmProvider.generateText({
          prompt,
          maxTokens: 512,
        });

        if (result.text?.trim()) {
          const steps = parseWorkflowPlanText(result.text);
          if (steps.length > 0) {
            return {
              steps,
              source: 'llm',
              fallbackUsed: false,
              model: result.model,
            };
          }
        }
      } catch {
        // Fall through to deterministic
      }
    }

    return planWorkflowFallback(input);
  }

  async generateOfficeDialogue(input: GenerateOfficeDialogueInput): Promise<DialogueResponse> {
    const now = input.now ?? Date.now();
    const maxChars = input.maxChars;

    // Validate fromAgentId
    if (!VALID_IDS.has(input.fromAgentId)) {
      return {
        fromAgentId: input.fromAgentId as OfficeAgentId,
        toAgentId: undefined,
        text: 'Dialogue service fallback.',
        source: 'deterministic',
        createdAt: now,
        fallbackUsed: true,
        errorSummary: `Unknown agent id: ${input.fromAgentId}`,
      };
    }

    // Resolve target
    let toAgentId = input.toAgentId;
    if (!toAgentId || toAgentId === input.fromAgentId) {
      toAgentId = pickTarget(input.fromAgentId, toAgentId);
    }

    // Try LLM provider
    if (this.llmProvider) {
      try {
        const prompt = buildOfficeDialoguePrompt(input);
        const result = await this.llmProvider.generateText({
          prompt,
          maxTokens: 128,
        });

        if (result.text && result.text.trim().length > 0) {
          const sanitized = sanitizeDialogueText(result.text);
          if (sanitized.length > 0) {
            return {
              fromAgentId: input.fromAgentId,
              toAgentId,
              text: clampText(sanitized, maxChars),
              source: 'llm',
              createdAt: now,
              fallbackUsed: false,
              model: result.model,
            };
          }
        }
      } catch {
        // Fall through to deterministic fallback
      }
    }

    // Deterministic fallback
    const text = pickFallbackText(input.fromAgentId, input.recentDialogue);
    const clamped = clampText(text, maxChars);

    return {
      fromAgentId: input.fromAgentId,
      toAgentId,
      text: clamped,
      source: 'deterministic',
      createdAt: now,
      fallbackUsed: true,
      errorSummary: this.llmProvider ? 'LLM provider unavailable or returned empty' : undefined,
    };
  }
}
