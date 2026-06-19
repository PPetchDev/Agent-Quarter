import { describe, expect, it, vi } from 'vitest';
import { DialogueService, buildWorkflowPlanPrompt } from './dialogue.service';
import type { GenerateOfficeDialogueInput, OfficeAgentId } from './dialogue.service';
import type { LlmTextProvider, LlmTextProviderResult } from '../llm/llm-provider.interface';

function makeInput(
  overrides: Partial<GenerateOfficeDialogueInput> = {},
): GenerateOfficeDialogueInput {
  return {
    fromAgentId: 'agent-3',
    officeStatus: 'idle',
    ...overrides,
  };
}

function mockProvider(result: string | Error, model?: string): LlmTextProvider {
  return {
    generateText: vi.fn().mockImplementation(async (): Promise<LlmTextProviderResult> => {
      if (result instanceof Error) throw result;
      return { text: result, model: model ?? 'claude-sonnet-4-6' };
    }),
  };
}

describe('DialogueService', () => {
  // ── Fallback-only (no provider) ────────────────────────────────────────────

  describe('without provider', () => {
    const service = new DialogueService();

    it('returns fallback deterministic response', async () => {
      const result = await service.generateOfficeDialogue(makeInput());
      expect(result.fromAgentId).toBe('agent-3');
      expect(result.toAgentId).toBeDefined();
      expect(result.text.length).toBeGreaterThan(0);
      expect(result.source).toBe('deterministic');
      expect(result.fallbackUsed).toBe(true);
    });

    it('preserves fromAgentId', async () => {
      const result = await service.generateOfficeDialogue(makeInput({ fromAgentId: 'agent-1' }));
      expect(result.fromAgentId).toBe('agent-1');
    });

    it('chooses toAgentId different from fromAgentId', async () => {
      const result = await service.generateOfficeDialogue(makeInput({ fromAgentId: 'agent-2' }));
      expect(result.toAgentId).toBeDefined();
      expect(result.toAgentId).not.toBe('agent-2');
    });

    it('clamps text to maxChars', async () => {
      const result = await service.generateOfficeDialogue(makeInput({ maxChars: 10 }));
      expect(result.text.length).toBeLessThanOrEqual(10);
    });

    it('createdAt uses provided now', async () => {
      const now = 1_700_000_000;
      const result = await service.generateOfficeDialogue(makeInput({ now }));
      expect(result.createdAt).toBe(now);
    });

    it('does not throw for invalid fromAgentId', async () => {
      const result = await service.generateOfficeDialogue(
        makeInput({ fromAgentId: 'agent-99' as OfficeAgentId }),
      );
      expect(result.errorSummary).toBeDefined();
      expect(result.errorSummary).toContain('agent-99');
      expect(result.fallbackUsed).toBe(true);
    });

    it('does not return toAgentId equal to fromAgentId', async () => {
      const result = await service.generateOfficeDialogue(
        makeInput({ fromAgentId: 'agent-1', toAgentId: 'agent-1' }),
      );
      expect(result.toAgentId).not.toBe('agent-1');
    });

    it('avoids recent duplicate text', async () => {
      const baseline = await service.generateOfficeDialogue(makeInput({ fromAgentId: 'agent-3' }));
      const result = await service.generateOfficeDialogue(
        makeInput({ fromAgentId: 'agent-3', recentDialogue: [baseline.text] }),
      );
      expect(result.text).not.toBe(baseline.text);
    });
  });

  // ── Provider success ────────────────────────────────────────────────────────

  describe('with provider (success)', () => {
    const service = new DialogueService(
      mockProvider('Everything looks great today!', 'claude-sonnet-4-6'),
    );

    it('returns source "llm" when provider succeeds', async () => {
      const result = await service.generateOfficeDialogue(makeInput());
      expect(result.source).toBe('llm');
    });

    it('returns fallbackUsed false on provider success', async () => {
      const result = await service.generateOfficeDialogue(makeInput());
      expect(result.fallbackUsed).toBe(false);
    });

    it('preserves fromAgentId and toAgentId on success', async () => {
      const result = await service.generateOfficeDialogue(makeInput());
      expect(result.fromAgentId).toBe('agent-3');
      expect(result.toAgentId).toBeDefined();
    });

    it('clamps output to maxChars', async () => {
      const result = await service.generateOfficeDialogue(makeInput({ maxChars: 10 }));
      expect(result.text.length).toBeLessThanOrEqual(10);
    });

    it('preserves model from provider result', async () => {
      const service2 = new DialogueService(mockProvider('Hello!', 'gpt-4o-mini'));
      const result = await service2.generateOfficeDialogue(makeInput());
      expect(result.model).toBe('gpt-4o-mini');
    });

    it('includes model on success', async () => {
      const result = await service.generateOfficeDialogue(makeInput());
      expect(result.model).toBe('claude-sonnet-4-6');
    });
  });

  // ── Output sanitization ─────────────────────────────────────────────────────

  describe('output sanitization', () => {
    it('sanitizes multiline output into single-line text', async () => {
      const service = new DialogueService(mockProvider('Line one\nLine two\n```code``` **bold**'));
      const result = await service.generateOfficeDialogue(makeInput());
      expect(result.text).not.toMatch(/\n/);
      expect(result.text).not.toMatch(/```/);
      expect(result.text).not.toMatch(/\*\*/);
      expect(result.source).toBe('llm');
    });
  });

  // ── Provider failure → fallback ─────────────────────────────────────────────

  describe('with provider (failure → fallback)', () => {
    it('falls back when provider throws', async () => {
      const service = new DialogueService(mockProvider(new Error('API key missing')));
      const result = await service.generateOfficeDialogue(makeInput());
      expect(result.source).toBe('deterministic');
      expect(result.fallbackUsed).toBe(true);
    });

    it('falls back when provider returns empty string', async () => {
      const service = new DialogueService(mockProvider(''));
      const result = await service.generateOfficeDialogue(makeInput());
      expect(result.source).toBe('deterministic');
      expect(result.fallbackUsed).toBe(true);
    });

    it('falls back when provider returns whitespace', async () => {
      const service = new DialogueService(mockProvider('   \n  '));
      const result = await service.generateOfficeDialogue(makeInput());
      expect(result.source).toBe('deterministic');
      expect(result.fallbackUsed).toBe(true);
    });

    it('invalid fromAgentId still returns safe deterministic fallback', async () => {
      const service = new DialogueService(mockProvider('should not be called'));
      const result = await service.generateOfficeDialogue(
        makeInput({ fromAgentId: 'agent-99' as OfficeAgentId }),
      );
      expect(result.source).toBe('deterministic');
      expect(result.fallbackUsed).toBe(true);
      expect(result.errorSummary).toContain('agent-99');
    });
  });
});

describe('sanitizeDialogueText', () => {
  it('is exercised through provider success path with multiline input', async () => {
    const service = new DialogueService(
      mockProvider("\n```js\ncode\n```\n  **Hello** world  \n'quoted'\n"),
    );
    const result = await service.generateOfficeDialogue(makeInput());
    expect(result.source).toBe('llm');
    expect(result.fallbackUsed).toBe(false);
    expect(result.text).not.toMatch(/```/);
    expect(result.text).not.toMatch(/\*\*/);
    expect(result.text).not.toMatch(/\n/);
  });
});

describe('planOfficeWorkflow', () => {
  it('returns deterministic fallback when no LLM provider', async () => {
    const service = new DialogueService();
    const result = await service.planOfficeWorkflow({ commandText: 'build UI' });
    expect(result.source).toBe('deterministic');
    expect(result.fallbackUsed).toBe(true);
    expect(result.steps).toEqual([]);
  });

  it('parses valid JSON step array from LLM response', async () => {
    const jsonResponse = JSON.stringify([
      { title: 'Plan', taskType: 'meeting', agentName: 'Mika', detail: 'Scope', toolLabel: 'Map', handoffTo: 'Mai' },
      { title: 'Build', taskType: 'code', agentName: 'Mai', detail: 'Implement', toolLabel: 'Build', handoffTo: 'Yui' },
      { title: 'Close', taskType: 'print', agentName: 'Aki', detail: 'Package', toolLabel: 'Close' },
    ]);
    const service = new DialogueService(mockProvider(jsonResponse));
    const result = await service.planOfficeWorkflow({ commandText: 'build UI' });
    expect(result.source).toBe('llm');
    expect(result.fallbackUsed).toBe(false);
    expect(result.steps).toHaveLength(3);
    expect(result.steps[0]!.title).toBe('Plan');
    expect(result.steps[1]!.agentName).toBe('Mai');
    expect(result.steps[2]!.toolLabel).toBe('Close');
  });

  it('sanitizes invalid task types to code', async () => {
    const jsonResponse = JSON.stringify([
      { title: 'Hack', taskType: 'hacking', agentName: 'Mai', detail: 'x', toolLabel: 'Build' },
    ]);
    const service = new DialogueService(mockProvider(jsonResponse));
    const result = await service.planOfficeWorkflow({ commandText: 'test' });
    expect(result.steps[0]!.taskType).toBe('code');
  });

  it('filters empty steps', async () => {
    const jsonResponse = JSON.stringify([
      { title: '', taskType: 'code', agentName: '', detail: '', toolLabel: 'Build' },
      { title: 'Build', taskType: 'code', agentName: 'Mai', detail: 'x', toolLabel: 'Build' },
    ]);
    const service = new DialogueService(mockProvider(jsonResponse));
    const result = await service.planOfficeWorkflow({ commandText: 'test' });
    expect(result.steps).toHaveLength(1);
  });

  it('includes busy agents in prompt', () => {
    const prompt = buildWorkflowPlanPrompt({ commandText: 'test', busyAgentIds: ['agent-1', 'agent-2'] });
    expect(prompt).toContain('Mai');
    expect(prompt).toContain('Aki');
    expect(prompt).toContain('DO NOT assign');
  });

  it('includes error note in prompt when previousError', () => {
    const prompt = buildWorkflowPlanPrompt({ commandText: 'test', previousError: true });
    expect(prompt).toContain('Retry');
  });
});
