import type { OfficeAgentId } from '../agents/officeWorkflow';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentDialogueMessage = {
  fromAgentId: OfficeAgentId;
  toAgentId?: OfficeAgentId;
  text: string;
  createdAt: number;
  source: 'deterministic';
};

export type AgentSnapshot = {
  id: OfficeAgentId;
  state?: string;
};

export type PickAgentDialogueInput = {
  now: number;
  lastDialogueAt: number | null;
  cooldownMs: number;
  probability: number;
  agents: AgentSnapshot[];
  recentTexts?: string[];
  random?: () => number;
};

// ─── Dialogue pools ───────────────────────────────────────────────────────────

const DIALOGUE_POOLS: Record<OfficeAgentId, readonly string[]> = {
  'agent-1': [
    'Ready for the sprint, team? ✨',
    'UI slice is looking polished!',
    'Let me check those responsive breakpoints~',
    'Accessibility audit passed!',
    'Anyone need a design review?',
    'Component library is holding up nicely.',
    'Pixel-perfect or bust!',
    'Tailwind makes everything faster~',
    'Time to polish those micro-interactions!',
  ],
  'agent-2': [
    'Build passed. Deploy when ready.',
    'CI pipeline is green across the board.',
    'Runtime logs look clean.',
    'No regressions in the last deploy.',
    'Monitoring dashboard is quiet — good sign.',
    'Containers healthy, no restarts.',
    'I will keep an eye on memory usage.',
    'Deploy pipeline is stable.',
    'All checks passed on the last PR.',
  ],
  'agent-3': [
    'API contract looks clean.',
    'Data integrity checks passed.',
    'No breaking changes in the schema.',
    'Endpoint response times are good.',
    'Rate limiting is configured correctly.',
    'Backend is holding up well.',
    'Schema migration was smooth.',
    'Type safety is solid across the stack.',
    'The data layer is consistent.',
  ],
  'agent-4': [
    'Did we cover the edge cases?',
    'Test coverage is looking healthy.',
    'No regressions in the last review.',
    'I will double-check the error paths.',
    'Security audit came back clean.',
    'Code quality is trending up.',
    'Found a small nit — nothing blocking.',
    'Risk surface is manageable.',
    'Review checklist is all green.',
  ],
  'agent-5': [
    'What if we try a softer palette?',
    'Flow feels natural now.',
    'The spacing rhythm is consistent.',
    'Design tokens are in good shape.',
    'Visual hierarchy is clear.',
    'Color contrast passes WCAG.',
    'Typography scale feels balanced.',
    'This layout breathes nicely.',
    'The animation curve feels smooth.',
  ],
};

// ─── Scheduler ────────────────────────────────────────────────────────────────

const IDLE_STATES = new Set(['idle', 'resting']);

function isAgentAvailable(agent: AgentSnapshot): boolean {
  if (agent.state === undefined) return true;
  return IDLE_STATES.has(agent.state);
}

function shuffleCopy<T>(arr: readonly T[], rand: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function pickAgentDialogue(input: PickAgentDialogueInput): AgentDialogueMessage | null {
  const {
    now,
    lastDialogueAt,
    cooldownMs,
    probability,
    agents,
    recentTexts = [],
    random = Math.random,
  } = input;

  // Cooldown guard
  if (lastDialogueAt !== null && now - lastDialogueAt < cooldownMs) {
    return null;
  }

  // Probability gate
  if (random() > probability) {
    return null;
  }

  // Need at least 2 available agents
  const available = agents.filter(isAgentAvailable);
  if (available.length < 2) return null;

  // Pick speaker + target (different agents)
  const shuffled = shuffleCopy(available, random);
  const speaker = shuffled[0]!;
  const target = shuffled[1]!;

  // Get speaker's pool, pick non-recent message
  const pool = DIALOGUE_POOLS[speaker.id];
  if (!pool || pool.length === 0) return null;

  const recentSet = new Set(recentTexts);
  const fresh = pool.filter((text) => !recentSet.has(text));
  const candidates = fresh.length > 0 ? fresh : pool;
  const text = candidates[Math.floor(random() * candidates.length)]!;

  return {
    fromAgentId: speaker.id,
    toAgentId: target.id,
    text,
    createdAt: now,
    source: 'deterministic',
  };
}
