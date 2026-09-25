// @vitest-environment jsdom

import { StrictMode } from 'react';
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

type SchedulerProps = {
  officeStatus: OfficeWorkflowStatus;
  roomReady: boolean;
  agents: AgentSnapshot[];
};

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
    (props: SchedulerProps) =>
      useDialogueScheduler({
        officeStatus: props.officeStatus,
        roomReady: props.roomReady,
        agents: props.agents,
        appendOfficeChat,
        enableLlmDialogue: overrides.enableLlmDialogue ?? false,
        random: overrides.random ?? (() => 0),
      }),
    {
      initialProps: {
        officeStatus: overrides.officeStatus ?? 'idle',
        roomReady: overrides.roomReady ?? true,
        agents: overrides.agents ?? AGENTS,
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

    rerender({ officeStatus: 'running', roomReady: true, agents: AGENTS });

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

  it('keeps ticking on a stable 4s cadence even when the caller passes a fresh agents array reference every render', async () => {
    // Regression test: LoungeCanvas builds a brand-new `agents` array literal
    // on every render (it re-renders often while idle — e.g. an unrelated
    // 15s chatter interval). If the tick effect ever lists `agents` itself
    // as a dependency, each such render tears down and restarts the 4s
    // interval, resetting the countdown and potentially never letting a
    // tick complete. This test re-renders with a new array identity (same
    // content, different reference) shortly before the 4s mark should fire,
    // and asserts the tick still lands on schedule.
    const { appendOfficeChat, rerender } = renderScheduler({ enableLlmDialogue: false });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    rerender({ officeStatus: 'idle', roomReady: true, agents: [...AGENTS] });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(appendOfficeChat).toHaveBeenCalledOnce();
  });
});

// Next.js App Router runs dev builds under React StrictMode, which mounts,
// simulates an unmount, and mounts again.
describe('useDialogueScheduler under StrictMode', () => {
  function renderStrict(enableLlmDialogue: boolean) {
    const appendOfficeChat = vi.fn();
    const view = renderHook(
      () =>
        useDialogueScheduler({
          officeStatus: 'idle',
          roomReady: true,
          agents: AGENTS,
          appendOfficeChat,
          enableLlmDialogue,
          random: () => 0,
        }),
      { wrapper: StrictMode },
    );
    return { ...view, appendOfficeChat };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    vi.mocked(generateOfficeDialogue).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('appends the LLM line after the simulated remount', async () => {
    vi.mocked(generateOfficeDialogue).mockResolvedValue({
      fromAgentId: 'agent-3',
      toAgentId: 'agent-4',
      text: 'LLM-generated line',
      source: 'llm',
      createdAt: FIXED_NOW,
      fallbackUsed: false,
    });
    const { appendOfficeChat, result } = renderStrict(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });

    expect(appendOfficeChat).toHaveBeenCalledWith({
      agentId: 'agent-3',
      toAgentId: 'agent-4',
      kind: 'dialogue',
      text: 'LLM-generated line',
    });
    expect(result.current.activeDialogueBubble).toEqual({
      agentId: 'agent-3',
      text: 'LLM-generated line',
    });
  });

  it('appends the deterministic fallback when the LLM request fails', async () => {
    vi.mocked(generateOfficeDialogue).mockRejectedValue(new Error('network down'));
    const { appendOfficeChat } = renderStrict(true);

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

  it('still drops a late LLM line after a real unmount', async () => {
    let resolveLlm!: (value: Awaited<ReturnType<typeof generateOfficeDialogue>>) => void;
    vi.mocked(generateOfficeDialogue).mockReturnValue(
      new Promise((resolve) => {
        resolveLlm = resolve;
      }),
    );
    const { appendOfficeChat, unmount } = renderStrict(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    unmount();
    await act(async () => {
      resolveLlm({
        fromAgentId: 'agent-3',
        toAgentId: 'agent-4',
        text: 'late',
        source: 'llm',
        createdAt: FIXED_NOW,
        fallbackUsed: false,
      });
      await Promise.resolve();
    });

    expect(appendOfficeChat).not.toHaveBeenCalled();
  });
});
