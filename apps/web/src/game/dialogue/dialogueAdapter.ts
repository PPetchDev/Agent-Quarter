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
    return res.json();
  } catch {
    return null;
  }
}
