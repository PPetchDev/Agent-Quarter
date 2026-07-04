# Extract useDialogueScheduler from LoungeCanvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the autonomous-agent dialogue tick effect (LLM race-guards, deterministic fallback, bubble scheduling) out of `apps/web/src/components/lounge/LoungeCanvas.tsx` into a standalone, unit-tested hook `useDialogueScheduler`, with zero behavior change.

**Status:** Implemented on `claude/elated-chebyshev-efcd4b` in commits `162df39` and `aaac50c`; verified with 13 hook tests, full web tests, web/API typechecks, API tests, and lounge browser smoke.

**Architecture:** This is a deepening extraction, not a feature change. The dialogue tick effect currently lives inline in `LoungeCanvas.tsx` (~135 lines spanning an interval scheduler, 5 internal refs, an LLM in-flight/cooldown/request-id race-guard, and a deterministic-pool fallback), closing over 5 separately-declared agent walker states. It has zero test coverage today. The new hook exposes a small interface (5 inputs, 1 output) and hides the entire race-guard state machine behind it. `LoungeCanvas.tsx` becomes a thin caller. This follows the exact same pattern already proven in this codebase for `useLoungePersistence`, `useDormTickLoop`, and `useFurnitureDrag` (all in `apps/web/src/hooks/`).

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, `@testing-library/react` (`renderHook`, `act`).

## Global Constraints

- Hooks live in `apps/web/src/hooks/`, one file per hook, named `use<Thing>.ts` with a co-located `use<Thing>.test.ts`.
- Test files start with the `// @vitest-environment jsdom` pragma (first line, exact text) — this project's existing hook tests all require it.
- Zero behavior change: the new hook must reproduce the original inline effect's exact semantics (gating, cooldowns, race-guards, fallback branching). Do not "improve" or fix anything you notice while extracting — this is characterization, not redesign.
- Real dependencies, not premature abstractions: import `pickAgentDialogue` from `@/game/dialogue/dialogueScheduler` and `generateOfficeDialogue` from `@/game/dialogue/dialogueAdapter` directly in the hook (both are already-shared, already-used modules) — do not wrap them in new interfaces.
- Only mock true I/O boundaries. `generateOfficeDialogue` performs a real network `fetch` — mock the whole module for it. `pickAgentDialogue` is a pure function — call it for real in tests (it already accepts an injectable `random?: () => number`, use that instead of mocking it).
- After wiring into `LoungeCanvas.tsx`, run the **entire** `apps/web` test suite (`pnpm exec vitest run` from `apps/web/`) and `pnpm exec tsc -p tsconfig.json --noEmit` (also from `apps/web/`) — both must be clean before the task is done.
- Verification commands must be run from `apps/web/` (the workspace root for this package), not the monorepo root.

---

### Task 1: Extract `useDialogueScheduler`

**Files:**
- Create: `apps/web/src/hooks/useDialogueScheduler.ts`
- Create: `apps/web/src/hooks/useDialogueScheduler.test.ts`
- Modify: `apps/web/src/components/lounge/LoungeCanvas.tsx:1478-1622` (exact block given below — line numbers may drift by the time you run this task; locate the block by its content, specifically the comment `// ── Autonomous agent dialogue ──` through the `useEffect` whose body sets `dialogueMountedRef.current = false`)

**Interfaces:**

- Consumes (already exist in the codebase, do not create):
  - `pickAgentDialogue(input: PickAgentDialogueInput): AgentDialogueMessage | null` from `@/game/dialogue/dialogueScheduler` — `PickAgentDialogueInput = { now: number; lastDialogueAt: number | null; cooldownMs: number; probability: number; agents: AgentSnapshot[]; recentTexts?: string[]; random?: () => number }`. `AgentSnapshot = { id: OfficeAgentId; state?: string }`. `AgentDialogueMessage = { fromAgentId: OfficeAgentId; toAgentId?: OfficeAgentId; text: string; createdAt: number; source: 'deterministic' }`.
  - `generateOfficeDialogue(input: GenerateOfficeDialogueRequest): Promise<DialogueResponse | null>` from `@/game/dialogue/dialogueAdapter` — `GenerateOfficeDialogueRequest = { fromAgentId: OfficeAgentId; toAgentId?: OfficeAgentId; officeStatus?: 'idle' | 'working'; recentDialogue?: string[]; now?: number; maxChars?: number }`. `DialogueResponse = { fromAgentId: OfficeAgentId; toAgentId?: OfficeAgentId; text: string; source: 'llm' | 'deterministic'; createdAt: number; fallbackUsed: boolean; errorSummary?: string; model?: string; requestId?: string }`.
  - `OfficeChatMessage`, `OfficeWorkflowStatus`, `OfficeAgentId` types from `@/game/agents/officeWorkflow`.

- Produces (this task defines these; `LoungeCanvas.tsx`'s wiring step below is the only consumer):
  ```typescript
  export interface UseDialogueSchedulerParams {
    officeStatus: OfficeWorkflowStatus;
    roomReady: boolean;
    agents: AgentSnapshot[];
    appendOfficeChat: (message: Omit<OfficeChatMessage, 'id'>) => void;
    enableLlmDialogue: boolean;
    random?: () => number;
  }

  export interface UseDialogueSchedulerResult {
    activeDialogueBubble: { agentId: OfficeAgentId; text: string } | null;
  }

  export function useDialogueScheduler(params: UseDialogueSchedulerParams): UseDialogueSchedulerResult
  ```

**The original inline code being extracted** (for reference — this is what Step 1's tests characterize and Step 3's implementation must reproduce exactly):

```typescript
// ── Autonomous agent dialogue ──────────────────────────────────────────
const lastDialogueAtRef = useRef<number | null>(null);
const recentDialogueTextsRef = useRef<string[]>([]);
const [activeDialogueBubble, setActiveDialogueBubble] = useState<{
  agentId: OfficeAgentId;
  text: string;
} | null>(null);
const dialogueBubbleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// LLM guards
const llmInFlightRef = useRef(false);
const llmLastRequestAtRef = useRef<number | null>(null);
const dialogueMountedRef = useRef(true);
const officeStatusRef = useRef(officeStatus);
const llmRequestIdRef = useRef(0);

useEffect(() => {
  officeStatusRef.current = officeStatus;
}, [officeStatus]);

useEffect(() => {
  if (officeStatus !== 'idle') return;
  if (!roomReady) return;

  const tick = () => {
    const message = pickAgentDialogue({
      now: Date.now(),
      lastDialogueAt: lastDialogueAtRef.current,
      cooldownMs: 15_000,
      probability: 0.1,
      agents: [
        { id: 'agent-1', state: agent.state },
        { id: 'agent-2', state: aki.agent.state },
        { id: 'agent-3', state: ren.agent.state },
        { id: 'agent-4', state: yui.agent.state },
        { id: 'agent-5', state: mika.agent.state },
      ],
      recentTexts: recentDialogueTextsRef.current,
    });

    if (message) {
      const now = message.createdAt;
      lastDialogueAtRef.current = now;

      const appendDialogue = (
        fromAgentId: OfficeAgentId,
        toAgentId: OfficeAgentId | undefined,
        text: string,
      ) => {
        recentDialogueTextsRef.current = [...recentDialogueTextsRef.current.slice(-4), text];
        appendOfficeChat({
          agentId: fromAgentId,
          toAgentId,
          kind: 'dialogue',
          text,
        });

        // Show bubble above speaking agent
        const bubble = { agentId: fromAgentId, text };
        setActiveDialogueBubble(bubble);
        if (dialogueBubbleTimeoutRef.current) {
          clearTimeout(dialogueBubbleTimeoutRef.current);
        }
        dialogueBubbleTimeoutRef.current = setTimeout(() => {
          setActiveDialogueBubble(null);
          dialogueBubbleTimeoutRef.current = null;
        }, 5_000);
      };

      // Try LLM
      if (
        ENABLE_LLM_DIALOGUE &&
        !llmInFlightRef.current &&
        (llmLastRequestAtRef.current === null ||
          now - llmLastRequestAtRef.current >= LLM_REQUEST_COOLDOWN_MS)
      ) {
        llmInFlightRef.current = true;
        llmLastRequestAtRef.current = now;
        const requestId = ++llmRequestIdRef.current;

        generateOfficeDialogue({
          fromAgentId: message.fromAgentId,
          toAgentId: message.toAgentId,
          officeStatus: 'idle',
          recentDialogue: recentDialogueTextsRef.current,
          now,
          maxChars: 80,
        })
          .then((response) => {
            llmInFlightRef.current = false;

            if (
              requestId !== llmRequestIdRef.current ||
              !dialogueMountedRef.current ||
              officeStatusRef.current !== 'idle'
            ) {
              return;
            }

            if (!response || !response.text?.trim()) {
              // Fallback to deterministic
              appendDialogue(message.fromAgentId, message.toAgentId, message.text);
              return;
            }

            appendDialogue(response.fromAgentId, response.toAgentId, response.text);
          })
          .catch(() => {
            llmInFlightRef.current = false;
            if (
              requestId === llmRequestIdRef.current &&
              dialogueMountedRef.current &&
              officeStatusRef.current === 'idle'
            ) {
              appendDialogue(message.fromAgentId, message.toAgentId, message.text);
            }
          });
      } else {
        // Deterministic only (guarded out or flag disabled)
        appendDialogue(message.fromAgentId, message.toAgentId, message.text);
      }
    }
  };

  const interval = setInterval(tick, 4_000);
  return () => clearInterval(interval);
}, [
  officeStatus,
  roomReady,
  agent.state,
  aki.agent.state,
  ren.agent.state,
  yui.agent.state,
  mika.agent.state,
  appendOfficeChat,
]);

// Cleanup dialogue bubble timeout on unmount
useEffect(() => {
  return () => {
    dialogueMountedRef.current = false;
    if (dialogueBubbleTimeoutRef.current) {
      clearTimeout(dialogueBubbleTimeoutRef.current);
    }
  };
}, []);
```

Note two module-level constants this block references, both defined near the top of `LoungeCanvas.tsx` (around line 261-263) and **not moved** by this task — they become caller-supplied values instead:
```typescript
const ENABLE_LLM_DIALOGUE = process.env.NEXT_PUBLIC_ENABLE_LLM_DIALOGUE === 'true';
const LLM_REQUEST_COOLDOWN_MS = 90_000;
```
`ENABLE_LLM_DIALOGUE` becomes the `enableLlmDialogue` param the caller passes in (`LoungeCanvas.tsx` keeps the constant and passes it through). `LLM_REQUEST_COOLDOWN_MS` stays a hardcoded `90_000` inside the new hook (it is an implementation cadence detail, not something any caller needs to vary — do not turn it into a parameter).

- [x] **Step 1: Write the failing test**

Create `apps/web/src/hooks/useDialogueScheduler.test.ts` with this exact content:

```typescript
// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pickAgentDialogue, type AgentSnapshot } from '@/game/dialogue/dialogueScheduler';
import { generateOfficeDialogue } from '@/game/dialogue/dialogueAdapter';
import { useDialogueScheduler } from './useDialogueScheduler';
import type { OfficeWorkflowStatus } from '@/game/agents/officeWorkflow';

vi.mock('@/game/dialogue/dialogueAdapter', () => ({
  generateOfficeDialogue: vi.fn(),
}));

const FIXED_NOW = new Date('2026-01-01T00:00:00.000Z').getTime();

const AGENTS: AgentSnapshot[] = [
  { id: 'agent-1', state: 'idle' },
  { id: 'agent-2', state: 'idle' },
  { id: 'agent-3', state: 'idle' },
  { id: 'agent-4', state: 'idle' },
  { id: 'agent-5', state: 'idle' },
];

// Ground truth: what pickAgentDialogue actually returns on a fresh first
// tick with these exact agents/random/probability/cooldown — computed via
// the real pure function so tests never hardcode a guessed agent/text pair.
const EXPECTED_FIRST_MESSAGE = pickAgentDialogue({
  now: FIXED_NOW,
  lastDialogueAt: null,
  cooldownMs: 15_000,
  probability: 0.1,
  agents: AGENTS,
  recentTexts: [],
  random: () => 0,
})!;

function renderScheduler(
  overrides: {
    officeStatus?: OfficeWorkflowStatus;
    roomReady?: boolean;
    agents?: AgentSnapshot[];
    enableLlmDialogue?: boolean;
    random?: () => number;
  } = {},
) {
  const appendOfficeChat = vi.fn();
  const view = renderHook(
    (props: { officeStatus: OfficeWorkflowStatus; roomReady: boolean }) =>
      useDialogueScheduler({
        officeStatus: props.officeStatus,
        roomReady: props.roomReady,
        agents: overrides.agents ?? AGENTS,
        appendOfficeChat,
        enableLlmDialogue: overrides.enableLlmDialogue ?? false,
        random: overrides.random ?? (() => 0),
      }),
    {
      initialProps: {
        officeStatus: overrides.officeStatus ?? 'idle',
        roomReady: overrides.roomReady ?? true,
      },
    },
  );
  return { ...view, appendOfficeChat };
}

describe('useDialogueScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    vi.mocked(generateOfficeDialogue).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when officeStatus is not idle', async () => {
    const { appendOfficeChat, result } = renderScheduler({ officeStatus: 'running' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(appendOfficeChat).not.toHaveBeenCalled();
    expect(result.current.activeDialogueBubble).toBeNull();
  });

  it('does nothing when roomReady is false', async () => {
    const { appendOfficeChat } = renderScheduler({ roomReady: false });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(appendOfficeChat).not.toHaveBeenCalled();
  });

  it('does not append when the probability roll fails', async () => {
    const { appendOfficeChat } = renderScheduler({ random: () => 1 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(appendOfficeChat).not.toHaveBeenCalled();
  });

  it('appends the deterministic message and shows a bubble when LLM dialogue is disabled', async () => {
    const { appendOfficeChat, result } = renderScheduler({ enableLlmDialogue: false });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });

    expect(appendOfficeChat).toHaveBeenCalledWith({
      agentId: EXPECTED_FIRST_MESSAGE.fromAgentId,
      toAgentId: EXPECTED_FIRST_MESSAGE.toAgentId,
      kind: 'dialogue',
      text: EXPECTED_FIRST_MESSAGE.text,
    });
    expect(result.current.activeDialogueBubble).toEqual({
      agentId: EXPECTED_FIRST_MESSAGE.fromAgentId,
      text: EXPECTED_FIRST_MESSAGE.text,
    });
    expect(generateOfficeDialogue).not.toHaveBeenCalled();
  });

  it('clears the bubble 5 seconds after it is shown', async () => {
    const { result } = renderScheduler({ enableLlmDialogue: false });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(result.current.activeDialogueBubble).not.toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(result.current.activeDialogueBubble).toBeNull();
  });

  it('appends the LLM response instead of the deterministic message when LLM enabled and it resolves with real text', async () => {
    vi.mocked(generateOfficeDialogue).mockResolvedValue({
      fromAgentId: 'agent-3',
      toAgentId: 'agent-4',
      text: 'LLM-generated line',
      source: 'llm',
      createdAt: FIXED_NOW,
      fallbackUsed: false,
    });
    const { appendOfficeChat } = renderScheduler({ enableLlmDialogue: true });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });

    expect(generateOfficeDialogue).toHaveBeenCalledOnce();
    expect(appendOfficeChat).toHaveBeenCalledWith({
      agentId: 'agent-3',
      toAgentId: 'agent-4',
      kind: 'dialogue',
      text: 'LLM-generated line',
    });
  });

  it('falls back to the deterministic message when the LLM response text is empty', async () => {
    vi.mocked(generateOfficeDialogue).mockResolvedValue({
      fromAgentId: 'agent-3',
      toAgentId: 'agent-4',
      text: '   ',
      source: 'llm',
      createdAt: FIXED_NOW,
      fallbackUsed: true,
    });
    const { appendOfficeChat } = renderScheduler({ enableLlmDialogue: true });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });

    expect(appendOfficeChat).toHaveBeenCalledWith({
      agentId: EXPECTED_FIRST_MESSAGE.fromAgentId,
      toAgentId: EXPECTED_FIRST_MESSAGE.toAgentId,
      kind: 'dialogue',
      text: EXPECTED_FIRST_MESSAGE.text,
    });
  });

  it('falls back to the deterministic message when the LLM call rejects', async () => {
    vi.mocked(generateOfficeDialogue).mockRejectedValue(new Error('network down'));
    const { appendOfficeChat } = renderScheduler({ enableLlmDialogue: true });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });

    expect(appendOfficeChat).toHaveBeenCalledWith({
      agentId: EXPECTED_FIRST_MESSAGE.fromAgentId,
      toAgentId: EXPECTED_FIRST_MESSAGE.toAgentId,
      kind: 'dialogue',
      text: EXPECTED_FIRST_MESSAGE.text,
    });
  });

  it('drops the LLM response with no fallback when officeStatus moved away from idle before it resolves', async () => {
    let resolveLlm!: (value: Awaited<ReturnType<typeof generateOfficeDialogue>>) => void;
    vi.mocked(generateOfficeDialogue).mockReturnValue(
      new Promise((resolve) => {
        resolveLlm = resolve;
      }),
    );
    const { appendOfficeChat, rerender } = renderScheduler({ enableLlmDialogue: true });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(generateOfficeDialogue).toHaveBeenCalledOnce();

    rerender({ officeStatus: 'running', roomReady: true });

    await act(async () => {
      resolveLlm({
        fromAgentId: 'agent-3',
        toAgentId: 'agent-4',
        text: 'too-late response',
        source: 'llm',
        createdAt: FIXED_NOW,
        fallbackUsed: false,
      });
      await Promise.resolve();
    });

    expect(appendOfficeChat).not.toHaveBeenCalled();
  });

  it('does not start a second LLM call while one is already in flight', async () => {
    vi.mocked(generateOfficeDialogue).mockReturnValue(new Promise(() => {}));
    const { appendOfficeChat } = renderScheduler({ enableLlmDialogue: true });

    // First tick starts an LLM call that never resolves.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(generateOfficeDialogue).toHaveBeenCalledOnce();

    // Advance far enough (16s more) to clear the 15s dialogue-level cooldown
    // and produce a second non-null pick, while the first LLM call is still
    // in flight (it never resolves in this test).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16_000);
    });

    expect(generateOfficeDialogue).toHaveBeenCalledOnce();
    expect(appendOfficeChat).toHaveBeenCalledOnce();
  });

  it('does not start a second LLM call within the 90s LLM request cooldown', async () => {
    vi.mocked(generateOfficeDialogue).mockResolvedValue({
      fromAgentId: 'agent-3',
      toAgentId: 'agent-4',
      text: 'first LLM line',
      source: 'llm',
      createdAt: FIXED_NOW,
      fallbackUsed: false,
    });
    const { appendOfficeChat } = renderScheduler({ enableLlmDialogue: true });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(generateOfficeDialogue).toHaveBeenCalledOnce();

    // 16s later clears the 15s dialogue-cooldown (second message picked)
    // but is well inside the 90s LLM-request cooldown.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16_000);
    });

    expect(generateOfficeDialogue).toHaveBeenCalledOnce();
    expect(appendOfficeChat).toHaveBeenCalledTimes(2);
  });

  it('stops ticking and ignores late LLM responses after unmount', async () => {
    let resolveLlm!: (value: Awaited<ReturnType<typeof generateOfficeDialogue>>) => void;
    vi.mocked(generateOfficeDialogue).mockReturnValue(
      new Promise((resolve) => {
        resolveLlm = resolve;
      }),
    );
    const { appendOfficeChat, unmount } = renderScheduler({ enableLlmDialogue: true });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    unmount();

    await act(async () => {
      resolveLlm({
        fromAgentId: 'agent-3',
        toAgentId: 'agent-4',
        text: 'late response after unmount',
        source: 'llm',
        createdAt: FIXED_NOW,
        fallbackUsed: false,
      });
      await Promise.resolve();
    });

    expect(appendOfficeChat).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

From `apps/web/`, run: `pnpm exec vitest run src/hooks/useDialogueScheduler.test.ts`
Expected: FAIL — `Failed to resolve import "./useDialogueScheduler"` (the hook module does not exist yet). If the failure is anything else (a syntax error, a different missing import), fix the test file itself before proceeding — do not write the implementation to work around a test bug.

- [x] **Step 3: Write minimal implementation**

Create `apps/web/src/hooks/useDialogueScheduler.ts` with this exact content:

```typescript
import { useEffect, useRef, useState } from 'react';
import { pickAgentDialogue, type AgentSnapshot } from '@/game/dialogue/dialogueScheduler';
import { generateOfficeDialogue } from '@/game/dialogue/dialogueAdapter';
import type { OfficeAgentId, OfficeChatMessage, OfficeWorkflowStatus } from '@/game/agents/officeWorkflow';

const LLM_REQUEST_COOLDOWN_MS = 90_000;

export interface UseDialogueSchedulerParams {
  officeStatus: OfficeWorkflowStatus;
  roomReady: boolean;
  agents: AgentSnapshot[];
  appendOfficeChat: (message: Omit<OfficeChatMessage, 'id'>) => void;
  enableLlmDialogue: boolean;
  random?: () => number;
}

export interface UseDialogueSchedulerResult {
  activeDialogueBubble: { agentId: OfficeAgentId; text: string } | null;
}

/**
 * Owns the autonomous-agent dialogue tick: picks a line via pickAgentDialogue
 * every 4s while idle, tries the LLM adapter (gated by an in-flight guard and
 * a 90s per-request cooldown), and falls back to the deterministic line on
 * empty/failed/stale LLM responses. A stale response (officeStatus moved off
 * 'idle', or the hook unmounted, before the LLM promise settles) is dropped
 * with no fallback at all — matches the original inline effect exactly.
 */
export function useDialogueScheduler({
  officeStatus,
  roomReady,
  agents,
  appendOfficeChat,
  enableLlmDialogue,
  random,
}: UseDialogueSchedulerParams): UseDialogueSchedulerResult {
  const lastDialogueAtRef = useRef<number | null>(null);
  const recentDialogueTextsRef = useRef<string[]>([]);
  const [activeDialogueBubble, setActiveDialogueBubble] = useState<{
    agentId: OfficeAgentId;
    text: string;
  } | null>(null);
  const dialogueBubbleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const llmInFlightRef = useRef(false);
  const llmLastRequestAtRef = useRef<number | null>(null);
  const dialogueMountedRef = useRef(true);
  const officeStatusRef = useRef(officeStatus);
  const llmRequestIdRef = useRef(0);

  useEffect(() => {
    officeStatusRef.current = officeStatus;
  }, [officeStatus]);

  useEffect(() => {
    if (officeStatus !== 'idle') return;
    if (!roomReady) return;

    const tick = () => {
      const message = pickAgentDialogue({
        now: Date.now(),
        lastDialogueAt: lastDialogueAtRef.current,
        cooldownMs: 15_000,
        probability: 0.1,
        agents,
        recentTexts: recentDialogueTextsRef.current,
        random,
      });

      if (message) {
        const now = message.createdAt;
        lastDialogueAtRef.current = now;

        const appendDialogue = (
          fromAgentId: OfficeAgentId,
          toAgentId: OfficeAgentId | undefined,
          text: string,
        ) => {
          recentDialogueTextsRef.current = [...recentDialogueTextsRef.current.slice(-4), text];
          appendOfficeChat({
            agentId: fromAgentId,
            toAgentId,
            kind: 'dialogue',
            text,
          });

          const bubble = { agentId: fromAgentId, text };
          setActiveDialogueBubble(bubble);
          if (dialogueBubbleTimeoutRef.current) {
            clearTimeout(dialogueBubbleTimeoutRef.current);
          }
          dialogueBubbleTimeoutRef.current = setTimeout(() => {
            setActiveDialogueBubble(null);
            dialogueBubbleTimeoutRef.current = null;
          }, 5_000);
        };

        if (
          enableLlmDialogue &&
          !llmInFlightRef.current &&
          (llmLastRequestAtRef.current === null ||
            now - llmLastRequestAtRef.current >= LLM_REQUEST_COOLDOWN_MS)
        ) {
          llmInFlightRef.current = true;
          llmLastRequestAtRef.current = now;
          const requestId = ++llmRequestIdRef.current;

          generateOfficeDialogue({
            fromAgentId: message.fromAgentId,
            toAgentId: message.toAgentId,
            officeStatus: 'idle',
            recentDialogue: recentDialogueTextsRef.current,
            now,
            maxChars: 80,
          })
            .then((response) => {
              llmInFlightRef.current = false;

              if (
                requestId !== llmRequestIdRef.current ||
                !dialogueMountedRef.current ||
                officeStatusRef.current !== 'idle'
              ) {
                return;
              }

              if (!response || !response.text?.trim()) {
                appendDialogue(message.fromAgentId, message.toAgentId, message.text);
                return;
              }

              appendDialogue(response.fromAgentId, response.toAgentId, response.text);
            })
            .catch(() => {
              llmInFlightRef.current = false;
              if (
                requestId === llmRequestIdRef.current &&
                dialogueMountedRef.current &&
                officeStatusRef.current === 'idle'
              ) {
                appendDialogue(message.fromAgentId, message.toAgentId, message.text);
              }
            });
        } else {
          appendDialogue(message.fromAgentId, message.toAgentId, message.text);
        }
      }
    };

    const interval = setInterval(tick, 4_000);
    return () => clearInterval(interval);
  }, [officeStatus, roomReady, agents, appendOfficeChat, enableLlmDialogue, random]);

  useEffect(() => {
    return () => {
      dialogueMountedRef.current = false;
      if (dialogueBubbleTimeoutRef.current) {
        clearTimeout(dialogueBubbleTimeoutRef.current);
      }
    };
  }, []);

  return { activeDialogueBubble };
}
```

- [x] **Step 4: Run test to verify it passes**

From `apps/web/`, run: `pnpm exec vitest run src/hooks/useDialogueScheduler.test.ts`
Expected: PASS — all 13 tests green.

- [x] **Step 5: Wire into LoungeCanvas.tsx**

In `apps/web/src/components/lounge/LoungeCanvas.tsx`:

1. Add the import near the other hook imports (alongside `useLoungePersistence`, `useDormTickLoop`, `useFurnitureDrag`):
   ```typescript
   import { useDialogueScheduler } from '@/hooks/useDialogueScheduler';
   ```

2. Find the exact block quoted in full in this task's "Interfaces" section above (starts at the comment `// ── Autonomous agent dialogue ──────────────────────────────────────────`, ends at the `useEffect` that sets `dialogueMountedRef.current = false`). Delete that entire block and replace it with:
   ```typescript
   const { activeDialogueBubble } = useDialogueScheduler({
     officeStatus,
     roomReady,
     agents: [
       { id: 'agent-1', state: agent.state },
       { id: 'agent-2', state: aki.agent.state },
       { id: 'agent-3', state: ren.agent.state },
       { id: 'agent-4', state: yui.agent.state },
       { id: 'agent-5', state: mika.agent.state },
     ],
     appendOfficeChat,
     enableLlmDialogue: ENABLE_LLM_DIALOGUE,
   });
   ```
   Do not pass `random` — omit it so the hook defaults to `Math.random` in production, exactly matching the original inline behavior.

3. Confirm `activeDialogueBubble` is still in scope everywhere it was read before (its only usage renders a speech-bubble UI element, e.g. `{activeDialogueBubble && a.id === activeDialogueBubble.agentId && (...)}`) — since it is now a `const` from hook destructuring instead of `useState`, this read-only usage needs no further change. Do **not** search for or modify a `setActiveDialogueBubble` call anywhere else in the file — there is none outside the block you just deleted.

4. Confirm the module-level constants `ENABLE_LLM_DIALOGUE` and `LLM_REQUEST_COOLDOWN_MS` (near line 261-263) are unchanged. `ENABLE_LLM_DIALOGUE` is now used only as the `enableLlmDialogue` argument above. `LLM_REQUEST_COOLDOWN_MS` becomes unused in `LoungeCanvas.tsx` once the block is deleted — if your editor/linter flags it as an unused local, delete that one constant declaration from `LoungeCanvas.tsx` (it now lives inside `useDialogueScheduler.ts`). Do not delete `ENABLE_LLM_DIALOGUE` — it is still used.

- [x] **Step 6: Run full verification**

From `apps/web/`, run, in order:
```bash
pnpm exec tsc -p tsconfig.json --noEmit
pnpm exec vitest run
```
Expected: `tsc` prints nothing (clean). `vitest run` reports every test file passing, with no decrease in the total test count compared to before this task (check the summary line, e.g. `Test Files  N passed (N)` / `Tests  M passed (M)` — M must be >= the pre-task count plus the 13 new tests, and zero failures).

If `tsc` reports an unused-variable error for `LLM_REQUEST_COOLDOWN_MS` in `LoungeCanvas.tsx`, that confirms Step 5.4's note — delete that single line and re-run both commands.

- [x] **Step 7: Commit**

```bash
git add apps/web/src/hooks/useDialogueScheduler.ts apps/web/src/hooks/useDialogueScheduler.test.ts apps/web/src/components/lounge/LoungeCanvas.tsx
git commit -m "$(cat <<'EOF'
refactor(lounge): extract useDialogueScheduler from LoungeCanvas

Moves the autonomous-agent dialogue tick (LLM race-guards, deterministic
fallback, bubble scheduling) out of the untested LoungeCanvas god-file into
a standalone, unit-tested hook with a narrow interface. Zero behavior
change — same gating, same cooldowns, same fallback branching.
EOF
)"
```
