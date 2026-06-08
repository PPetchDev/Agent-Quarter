import { describe, expect, it, vi } from 'vitest';
import { pickAgentDialogue } from './dialogueScheduler';
import type { AgentSnapshot } from './dialogueScheduler';

function makeAgents(...states: string[]): AgentSnapshot[] {
  return states.map((state, index) => ({
    id: `agent-${index + 1}` as AgentSnapshot['id'],
    state,
  }));
}

describe('pickAgentDialogue', () => {
  const COOLDOWN = 15_000;
  const NOW = 1_000_000;
  const allIdle = makeAgents('idle', 'idle', 'idle', 'idle', 'idle');

  // Override randomness so probability gate always passes
  function alwaysPick(seed = 0.05): () => number {
    let calls = 0;
    return () => {
      calls++;
      // first call is probability gate; subsequent are for shuffle/index
      if (calls === 1) return 0.05; // pass probability
      return (seed + calls * 0.001) % 1;
    };
  }

  // ── Cooldown ───────────────────────────────────────────────────────────────

  it('returns null during cooldown', () => {
    const result = pickAgentDialogue({
      now: NOW,
      lastDialogueAt: NOW - 5_000, // only 5s ago
      cooldownMs: COOLDOWN,
      probability: 1,
      agents: allIdle,
    });
    expect(result).toBeNull();
  });

  it('returns null when lastDialogueAt is exactly at edge', () => {
    const result = pickAgentDialogue({
      now: NOW,
      lastDialogueAt: NOW - COOLDOWN + 1, // 1ms short
      cooldownMs: COOLDOWN,
      probability: 1,
      agents: allIdle,
    });
    expect(result).toBeNull();
  });

  // ── Probability gate ─────────────────────────────────────────────────────────

  it('returns null when probability check fails', () => {
    const result = pickAgentDialogue({
      now: NOW,
      lastDialogueAt: null,
      cooldownMs: COOLDOWN,
      probability: 0.1,
      agents: allIdle,
      random: () => 0.9, // random > probability
    });
    expect(result).toBeNull();
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('returns a message when cooldown/probability allow', () => {
    const result = pickAgentDialogue({
      now: NOW,
      lastDialogueAt: null,
      cooldownMs: COOLDOWN,
      probability: 1,
      agents: allIdle,
      random: () => 0.05,
    });
    expect(result).not.toBeNull();
    expect(result!.text).toBeTruthy();
    expect(result!.source).toBe('deterministic');
    expect(result!.createdAt).toBe(NOW);
    expect(result!.fromAgentId).toBeTruthy();
    expect(result!.toAgentId).toBeTruthy();
    expect(result!.fromAgentId).not.toBe(result!.toAgentId);
  });

  // ── Agent count ──────────────────────────────────────────────────────────────

  it('returns null when fewer than 2 agents', () => {
    const result = pickAgentDialogue({
      now: NOW,
      lastDialogueAt: null,
      cooldownMs: COOLDOWN,
      probability: 1,
      agents: [{ id: 'agent-1', state: 'idle' }],
      random: () => 0.05,
    });
    expect(result).toBeNull();
  });

  it('returns null when only 1 agent is idle', () => {
    const result = pickAgentDialogue({
      now: NOW,
      lastDialogueAt: null,
      cooldownMs: COOLDOWN,
      probability: 1,
      agents: makeAgents('idle', 'walking', 'coding', 'meeting', 'printing'),
      random: () => 0.05,
    });
    expect(result).toBeNull();
  });

  // ── Speaker ≠ target ─────────────────────────────────────────────────────────

  it('never picks same from/to agent', () => {
    for (let i = 0; i < 20; i++) {
      const result = pickAgentDialogue({
        now: NOW,
        lastDialogueAt: null,
        cooldownMs: 0,
        probability: 1,
        agents: allIdle,
        random: () => 0.05,
      });
      expect(result).not.toBeNull();
      expect(result!.fromAgentId).not.toBe(result!.toAgentId);
    }
  });

  // ── Random injection ─────────────────────────────────────────────────────────

  it('respects provided random function', () => {
    // deterministic random that forces probability pass + specific shuffle order
    let call = 0;
    const random = () => [0.05, 0.0, 0.0][call++] ?? 0.5;

    const result = pickAgentDialogue({
      now: NOW,
      lastDialogueAt: null,
      cooldownMs: COOLDOWN,
      probability: 1,
      agents: allIdle,
      random,
    });
    expect(result).not.toBeNull();
  });

  // ── Dedup ──────────────────────────────────────────────────────────────────

  it('avoids recent duplicate text when possible', () => {
    // force first agent's first message, then block it with recentTexts
    const result1 = pickAgentDialogue({
      now: NOW,
      lastDialogueAt: null,
      cooldownMs: 0,
      probability: 1,
      agents: [allIdle[0]!, allIdle[1]!],
      random: () => 0.05,
    });
    expect(result1).not.toBeNull();

    const result2 = pickAgentDialogue({
      now: NOW + COOLDOWN,
      lastDialogueAt: null,
      cooldownMs: 0,
      probability: 1,
      agents: [allIdle[0]!, allIdle[1]!],
      random: () => 0.05,
      recentTexts: [result1!.text], // block the first message
    });
    expect(result2).not.toBeNull();
    expect(result2!.text).not.toBe(result1!.text);
  });

  // ── Immutability ─────────────────────────────────────────────────────────────

  it('does not mutate input agents', () => {
    const frozen = makeAgents('idle', 'idle', 'idle');
    const snapshot = JSON.stringify(frozen);
    pickAgentDialogue({
      now: NOW,
      lastDialogueAt: null,
      cooldownMs: COOLDOWN,
      probability: 1,
      agents: frozen,
      random: () => 0.05,
    });
    expect(JSON.stringify(frozen)).toBe(snapshot);
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  it('returns null safely for empty agents', () => {
    const result = pickAgentDialogue({
      now: NOW,
      lastDialogueAt: null,
      cooldownMs: COOLDOWN,
      probability: 1,
      agents: [],
    });
    expect(result).toBeNull();
  });

  it('supports all five agent ids', () => {
    const result = pickAgentDialogue({
      now: NOW,
      lastDialogueAt: null,
      cooldownMs: 0,
      probability: 1,
      agents: allIdle,
      random: alwaysPick(),
    });
    expect(result).not.toBeNull();
    const validIds = ['agent-1', 'agent-2', 'agent-3', 'agent-4', 'agent-5'];
    expect(validIds).toContain(result!.fromAgentId);
    expect(validIds).toContain(result!.toAgentId!);
  });

  it('returned message has source deterministic', () => {
    const result = pickAgentDialogue({
      now: NOW,
      lastDialogueAt: null,
      cooldownMs: 0,
      probability: 1,
      agents: allIdle,
      random: () => 0.05,
    });
    expect(result!.source).toBe('deterministic');
  });

  it('returned message has createdAt equal to now', () => {
    const result = pickAgentDialogue({
      now: NOW,
      lastDialogueAt: null,
      cooldownMs: 0,
      probability: 1,
      agents: allIdle,
      random: () => 0.05,
    });
    expect(result!.createdAt).toBe(NOW);
  });

  it('message text is non-empty', () => {
    const result = pickAgentDialogue({
      now: NOW,
      lastDialogueAt: null,
      cooldownMs: 0,
      probability: 1,
      agents: allIdle,
      random: () => 0.05,
    });
    expect(result!.text.length).toBeGreaterThan(0);
  });

  it('does not throw on malformed/minimal input', () => {
    expect(() =>
      pickAgentDialogue({
        now: 0,
        lastDialogueAt: null,
        cooldownMs: 0,
        probability: 0,
        agents: [],
      }),
    ).not.toThrow();
    expect(
      pickAgentDialogue({
        now: 0,
        lastDialogueAt: null,
        cooldownMs: 0,
        probability: 0,
        agents: [],
      }),
    ).toBeNull();
  });

  it('ignores undefined agent states (treats as available)', () => {
    const result = pickAgentDialogue({
      now: NOW,
      lastDialogueAt: null,
      cooldownMs: 0,
      probability: 1,
      agents: [{ id: 'agent-1' }, { id: 'agent-2' }],
      random: () => 0.05,
    });
    expect(result).not.toBeNull();
  });
});
