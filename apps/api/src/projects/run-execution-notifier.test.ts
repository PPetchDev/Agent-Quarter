import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRunExecutionNotifier } from './run-execution-notifier';
import { RunsGateway } from './runs.gateway';

function makeGateway() {
  return {
    emitRunExecutionStarted: vi.fn(),
    emitRunExecutionLog: vi.fn(),
    emitRunExecutionCompleted: vi.fn(),
    emitRunExecutionFailed: vi.fn(),
  } as unknown as RunsGateway;
}

const CONTEXT = { runId: 'r-001', taskId: 't-008', projectId: 'p-004', agentId: 'agent-1' };

describe('createRunExecutionNotifier', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('started() merges context, payload, and a timestamp into emitRunExecutionStarted', () => {
    const gateway = makeGateway();
    const notifier = createRunExecutionNotifier(gateway, CONTEXT);

    notifier.started({ provider: 'codex', mode: 'read-only' });

    expect(gateway.emitRunExecutionStarted).toHaveBeenCalledWith({
      ...CONTEXT,
      provider: 'codex',
      mode: 'read-only',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
  });

  it('log() merges context, payload, and a timestamp into emitRunExecutionLog', () => {
    const gateway = makeGateway();
    const notifier = createRunExecutionNotifier(gateway, CONTEXT);

    notifier.log({ level: 'info', message: 'hello' });

    expect(gateway.emitRunExecutionLog).toHaveBeenCalledWith({
      ...CONTEXT,
      level: 'info',
      message: 'hello',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
  });

  it('completed() merges context, payload, and a timestamp into emitRunExecutionCompleted', () => {
    const gateway = makeGateway();
    const notifier = createRunExecutionNotifier(gateway, CONTEXT);

    notifier.completed({ summary: 'All done' });

    expect(gateway.emitRunExecutionCompleted).toHaveBeenCalledWith({
      ...CONTEXT,
      summary: 'All done',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
  });

  it('failed() merges context, payload, and a timestamp into emitRunExecutionFailed', () => {
    const gateway = makeGateway();
    const notifier = createRunExecutionNotifier(gateway, CONTEXT);

    notifier.failed({ errorSummary: 'boom' });

    expect(gateway.emitRunExecutionFailed).toHaveBeenCalledWith({
      ...CONTEXT,
      errorSummary: 'boom',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
  });

  it('generates a fresh timestamp per call rather than caching one at creation', () => {
    const gateway = makeGateway();
    const notifier = createRunExecutionNotifier(gateway, CONTEXT);

    notifier.started({ provider: 'codex', mode: 'read-only' });
    vi.setSystemTime(new Date('2026-01-01T00:02:10.000Z'));
    notifier.completed({ summary: 'done' });

    const startedCall = vi.mocked(gateway.emitRunExecutionStarted).mock.calls[0]![0];
    const completedCall = vi.mocked(gateway.emitRunExecutionCompleted).mock.calls[0]![0];
    expect(startedCall.timestamp).toBe('2026-01-01T00:00:00.000Z');
    expect(completedCall.timestamp).toBe('2026-01-01T00:02:10.000Z');
  });

  it('passes optional context fields through as undefined when not provided', () => {
    const gateway = makeGateway();
    const notifier = createRunExecutionNotifier(gateway, { runId: 'r-solo' });

    notifier.started({ provider: 'mock', mode: 'read-only' });

    expect(gateway.emitRunExecutionStarted).toHaveBeenCalledWith({
      runId: 'r-solo',
      taskId: undefined,
      projectId: undefined,
      agentId: undefined,
      provider: 'mock',
      mode: 'read-only',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
  });
});
