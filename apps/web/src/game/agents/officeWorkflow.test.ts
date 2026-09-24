import { describe, expect, it } from 'vitest';
import {
  convertLLMSteps,
  createOfficeToolEvent,
  createOfficeWorkflowSteps,
  describeOfficeStepDone,
  describeOfficeStepStart,
  inferPrimaryOfficeTask,
  normalizeOfficeCommand,
  OFFICE_WORKFLOW_AGENTS,
  planWorkflowSteps,
} from './officeWorkflow';
import type { OfficeAgentId } from './officeWorkflow';
import { resolveAgentTask } from './taskResolver';

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

describe('planWorkflowSteps (dynamic planner)', () => {
  it('produces 2 steps for simple commands', () => {
    const steps = planWorkflowSteps('fix typo');
    // build + close = 2
    expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(steps.map((s) => s.title)).toContain('Build');
    expect(steps.map((s) => s.title)).toContain('Close');
  });

  it('produces more steps for complex commands', () => {
    const steps = planWorkflowSteps('refactor the entire backend API and migrate database schema');
    // plan + build + review + contract + close >= 4
    expect(steps.length).toBeGreaterThanOrEqual(4);
  });

  it('routes UI keywords to Mika or Mai', () => {
    const steps = planWorkflowSteps('polish the responsive layout');
    const buildStep = steps.find((s) => s.title === 'Build');
    expect(buildStep).toBeDefined();
    // Mika (agent-5) or Mai (agent-1) should be the builder
    expect(['agent-1', 'agent-5']).toContain(buildStep!.agentId);
  });

  it('routes backend keywords to Ren', () => {
    const steps = planWorkflowSteps('design the database schema and API contract');
    const buildStep = steps.find((s) => s.title === 'Build');
    expect(buildStep!.agentId).toBe('agent-3'); // Ren
  });

  it('routes test keywords to Yui', () => {
    const steps = planWorkflowSteps('audit regression tests');
    const buildStep = steps.find((s) => s.title === 'Build');
    expect(buildStep!.agentId).toBe('agent-4'); // Yui
  });

  it('routes deploy keywords to Aki', () => {
    const steps = planWorkflowSteps('deploy the new CI pipeline');
    const buildStep = steps.find((s) => s.title === 'Build');
    expect(buildStep!.agentId).toBe('agent-2'); // Aki
  });

  it('skips busy agents', () => {
    const busy: OfficeAgentId[] = ['agent-3']; // Ren is busy
    const steps = planWorkflowSteps('design the database schema', { busyAgentIds: busy });
    const buildStep = steps.find((s) => s.title === 'Build');
    // Should pick someone else since Ren is busy
    expect(buildStep!.agentId).not.toBe('agent-3');
  });

  it('produces single rest step for rest commands', () => {
    const steps = planWorkflowSteps('rest');
    expect(steps).toHaveLength(1);
    expect(steps[0]!.taskType).toBe('rest');
    expect(steps[0]!.title).toBe('Rest');
  });

  it('adds retry step when previousError is true', () => {
    const steps = planWorkflowSteps('refactor the API layer', {
      previousError: true,
    });
    const titles = steps.map((s) => s.title);
    expect(titles).toContain('Retry');
    // Retry is between Plan and Build
    const retryIdx = titles.indexOf('Retry');
    const buildIdx = titles.indexOf('Build');
    expect(retryIdx).toBeLessThan(buildIdx);
  });

  it('review step goes to different agent than builder', () => {
    const steps = planWorkflowSteps('verify the UI tests');
    const buildStep = steps.find((s) => s.title === 'Build');
    const reviewStep = steps.find((s) => s.title === 'Review');
    if (reviewStep) {
      expect(reviewStep.agentId).not.toBe(buildStep!.agentId);
    }
  });
});

describe('convertLLMSteps', () => {
  it('falls back to a task type the lounge can resolve when the LLM returns an unknown one', () => {
    const [step] = convertLLMSteps([
      {
        agentName: 'Mai',
        title: 'Build',
        taskType: 'coding',
        detail: 'Ship it',
        toolLabel: 'Build',
      },
    ]);

    expect(step!.taskType).toBe('code');
    expect(() => resolveAgentTask(step!.taskType)).not.toThrow();
  });

  it.each(['constructor', '__proto__', 'toString'])(
    'treats inherited object keys like %s as unknown',
    (key) => {
      const [step] = convertLLMSteps([
        {
          agentName: key,
          title: 'Build',
          taskType: key,
          detail: 'x',
          toolLabel: key,
          handoffTo: key,
        },
      ]);

      expect(step!.taskType).toBe('code');
      expect(step!.agentId).toBe('agent-1');
      expect(step!.toolId).toBe('edit');
      expect(step!.handoffTo).toBeUndefined();
    },
  );
});
