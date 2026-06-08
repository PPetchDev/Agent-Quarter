import { describe, expect, it } from 'vitest';
import {
  RunsGateway,
  type RunExecutionStartedPayload,
} from './runs.gateway';

function makeStarted(): RunExecutionStartedPayload {
  return {
    runId: 'r-001',
    taskId: 't-008',
    projectId: 'p-004',
    agentId: 'agent-1',
    timestamp: new Date().toISOString(),
    provider: 'mock',
    mode: 'read-only',
  };
}

describe('RunsGateway', () => {
  const gateway = new RunsGateway();

  // ── No-server safety ────────────────────────────────────────────────────────

  it('emitRunExecutionStarted does not throw without server', () => {
    expect(() =>
      gateway.emitRunExecutionStarted(makeStarted()),
    ).not.toThrow();
  });

  it('emitRunExecutionLog does not throw without server', () => {
    expect(() =>
      gateway.emitRunExecutionLog({
        runId: 'r-001',
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Hello',
      }),
    ).not.toThrow();
  });

  it('emitRunExecutionTool does not throw without server', () => {
    expect(() =>
      gateway.emitRunExecutionTool({
        runId: 'r-001',
        timestamp: new Date().toISOString(),
        toolName: 'Read',
        status: 'started',
      }),
    ).not.toThrow();
  });

  it('emitRunExecutionCompleted does not throw without server', () => {
    expect(() =>
      gateway.emitRunExecutionCompleted({
        runId: 'r-001',
        timestamp: new Date().toISOString(),
        summary: 'Done',
      }),
    ).not.toThrow();
  });

  it('emitRunExecutionFailed does not throw without server', () => {
    expect(() =>
      gateway.emitRunExecutionFailed({
        runId: 'r-001',
        timestamp: new Date().toISOString(),
        errorSummary: 'Boom',
      }),
    ).not.toThrow();
  });

  // ── Existing lifecycle safety ───────────────────────────────────────────────

  it('emitRunStarted does not throw without server', () => {
    expect(() =>
      gateway.emitRunStarted({
        id: 'r-001',
        projectId: 'p-001',
        taskId: 't-001',
        status: 'running',
      }),
    ).not.toThrow();
  });

  it('emitRunCompleted does not throw without server', () => {
    expect(() =>
      gateway.emitRunCompleted({
        id: 'r-001',
        projectId: 'p-001',
        taskId: 't-001',
        status: 'success',
      }),
    ).not.toThrow();
  });
});
