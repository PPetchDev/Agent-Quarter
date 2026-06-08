import { describe, expect, it } from 'vitest';
import {
  createOfficeToolEvent,
  createOfficeWorkflowSteps,
  describeOfficeStepDone,
  describeOfficeStepStart,
  inferPrimaryOfficeTask,
  normalizeOfficeCommand,
  OFFICE_WORKFLOW_AGENTS,
} from './officeWorkflow';

describe('office workflow planner', () => {
  it('normalizes blank commands to a default command', () => {
    expect(normalizeOfficeCommand('   ')).toBe('Build the next verified office workflow slice');
  });

  it('plans a five-step handoff through the office squad', () => {
    const steps = createOfficeWorkflowSteps('Add command board');

    expect(steps).toHaveLength(5);
    expect(steps.map((step) => step.title)).toEqual([
      'Map',
      'Build',
      'Contract',
      'Review',
      'Close',
    ]);
    expect(new Set(steps.map((step) => step.agentId)).size).toBe(5);
  });

  it('uses the inferred primary task for the build step', () => {
    expect(inferPrimaryOfficeTask('review the lounge')).toBe('review');
    expect(inferPrimaryOfficeTask('write docs for command board')).toBe('document');
    expect(inferPrimaryOfficeTask('implement the office loop')).toBe('code');

    const steps = createOfficeWorkflowSteps('write docs for command board');
    expect(steps[1]?.taskType).toBe('document');
  });

  it('keeps tool boundaries attached to planned steps', () => {
    const [first] = createOfficeWorkflowSteps('Add browser QA');
    expect(first).toBeDefined();

    const event = createOfficeToolEvent(first!);

    expect(event.status).toBe('allowed');
    expect(event.label).toBe('Map');
    expect(event.detail).toContain('ai/maps');
  });

  it('formats agent chat handoffs with the next agent name', () => {
    const steps = createOfficeWorkflowSteps('Patch and verify');
    const start = describeOfficeStepStart(steps[0]!, 'Patch and verify');
    const done = describeOfficeStepDone(steps[0]!, steps[1]);

    expect(start).toContain('Patch and verify');
    expect(done).toContain('Mai');
  });

  it('ships exactly five visible workflow agents', () => {
    expect(OFFICE_WORKFLOW_AGENTS.map((agent) => agent.characterId)).toEqual([
      'mai',
      'aki',
      'ren',
      'yui',
      'mika',
    ]);
  });
});
