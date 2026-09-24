// ─── Types ────────────────────────────────────────────────────────────────────

export type OfficeAgentId = 'agent-1' | 'agent-2' | 'agent-3' | 'agent-4' | 'agent-5';

export type GenerateOfficeDialogueRequest = {
  fromAgentId: OfficeAgentId;
  toAgentId?: OfficeAgentId;
  officeStatus?: 'idle' | 'working';
  recentDialogue?: string[];
  now?: number;
  maxChars?: number;
};

export type DialogueResponse = {
  fromAgentId: OfficeAgentId;
  toAgentId?: OfficeAgentId;
  text: string;
  source: 'llm' | 'deterministic';
  createdAt: number;
  fallbackUsed: boolean;
  errorSummary?: string;
  model?: string;
  requestId?: string;
};

// ─── Adapter ──────────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Call POST /api/dialogue/office to generate an office dialogue line.
 * Returns the DialogueResponse or null on failure.
 */
export async function generateOfficeDialogue(
  input: GenerateOfficeDialogueRequest,
): Promise<DialogueResponse | null> {
  try {
    const res = await fetch(`${BASE}/api/dialogue/office`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Workflow plan adapter ────────────────────────────────────────────────────

export type PlanWorkflowLLMRequest = {
  commandText: string;
  busyAgentIds?: OfficeAgentId[];
  previousError?: boolean;
};

export type WorkflowStepLLM = {
  title: string;
  taskType: string;
  agentName: string;
  detail: string;
  toolLabel: string;
  handoffTo?: string;
};

export type PlanWorkflowLLMResponse = {
  steps: WorkflowStepLLM[];
  source: 'llm' | 'deterministic';
  fallbackUsed: boolean;
  errorSummary?: string;
  model?: string;
};

/**
 * Call POST /api/dialogue/plan-workflow to plan a workflow via LLM.
 * Returns the PlanWorkflowLLMResponse or null on failure.
 */
export async function planWorkflowLLM(
  input: PlanWorkflowLLMRequest,
  options: { signal?: AbortSignal } = {},
): Promise<PlanWorkflowLLMResponse | null> {
  try {
    const res = await fetch(`${BASE}/api/dialogue/plan-workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: options.signal,
    });
    if (!res.ok) return null;
    // Awaited so parse errors and aborts during the body read land in the catch.
    return await res.json();
  } catch {
    // Includes AbortError: an aborted plan resolves null like any other failure.
    return null;
  }
}
