import { describe, expect, it } from 'vitest';
import { DialogueController } from './dialogue.controller';
import { DialogueService } from './dialogue.service';
import type { OfficeAgentId } from './dialogue.service';

describe('DialogueController', () => {
  const service = new DialogueService();
  const controller = new DialogueController(service);

  it('returns DialogueResponse for valid request', async () => {
    const result = await controller.generateOfficeDialogue({
      fromAgentId: 'agent-3',
      officeStatus: 'idle',
    });
    expect(result.fromAgentId).toBe('agent-3');
    expect(result.toAgentId).toBeDefined();
    expect(result.toAgentId).not.toBe('agent-3');
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.source).toBe('deterministic');
    expect(result.fallbackUsed).toBe(true);
  });

  it('preserves fromAgentId', async () => {
    const result = await controller.generateOfficeDialogue({
      fromAgentId: 'agent-1',
      officeStatus: 'idle',
    });
    expect(result.fromAgentId).toBe('agent-1');
  });

  it('returns fallbackUsed true', async () => {
    const result = await controller.generateOfficeDialogue({
      fromAgentId: 'agent-5',
      officeStatus: 'idle',
    });
    expect(result.fallbackUsed).toBe(true);
  });

  it('returns source deterministic', async () => {
    const result = await controller.generateOfficeDialogue({
      fromAgentId: 'agent-2',
      officeStatus: 'working',
    });
    expect(result.source).toBe('deterministic');
  });

  it('invalid fromAgentId returns fallback response with errorSummary, not thrown', async () => {
    const result = await controller.generateOfficeDialogue({
      fromAgentId: 'agent-99' as OfficeAgentId,
      officeStatus: 'idle',
    });
    expect(result.errorSummary).toBeDefined();
    expect(result.errorSummary).toContain('agent-99');
    expect(result.fallbackUsed).toBe(true);
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('missing toAgentId resolves to a different valid target', async () => {
    const result = await controller.generateOfficeDialogue({
      fromAgentId: 'agent-1',
      officeStatus: 'idle',
    });
    expect(result.toAgentId).toBeDefined();
    expect(result.toAgentId).not.toBe('agent-1');
  });

  it('maxChars is respected', async () => {
    const result = await controller.generateOfficeDialogue({
      fromAgentId: 'agent-4',
      officeStatus: 'idle',
      maxChars: 10,
    });
    expect(result.text.length).toBeLessThanOrEqual(10);
  });

  it('recentDialogue is passed through and duplicate avoidance works', async () => {
    const baseline = await controller.generateOfficeDialogue({
      fromAgentId: 'agent-3',
      officeStatus: 'idle',
    });

    const result = await controller.generateOfficeDialogue({
      fromAgentId: 'agent-3',
      officeStatus: 'idle',
      recentDialogue: [baseline.text],
    });
    expect(result.text).not.toBe(baseline.text);
  });

  it('controller does not require ClaudeService', () => {
    expect(controller).toBeDefined();
  });

  it('handles all five agent ids', async () => {
    for (const id of ['agent-1', 'agent-2', 'agent-3', 'agent-4', 'agent-5'] as const) {
      const result = await controller.generateOfficeDialogue({
        fromAgentId: id,
        officeStatus: 'idle',
      });
      expect(result.fromAgentId).toBe(id);
      expect(result.text.length).toBeGreaterThan(0);
    }
  });
});

describe('planOfficeWorkflow', () => {
  const service = new DialogueService();
  const ctrl = new DialogueController(service);

  it('returns deterministic fallback when no LLM provider', async () => {
    const result = await ctrl.planOfficeWorkflow({ commandText: 'build UI' });
    expect(result.source).toBe('deterministic');
    expect(result.fallbackUsed).toBe(true);
    expect(result.steps).toEqual([]);
  });
});
