import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { RunExecutionService } from './run-execution.service';
import type { RunExecutionInput } from './run-execution.service';
import { RunsGateway } from './runs.gateway';
import { LocalCodexRunner } from '../execution/local-codex-runner';
import type { LocalCodexRunnerResult } from '../execution/local-codex-runner';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function makeGateway() {
  return {
    emitRunExecutionStarted: vi.fn(),
    emitRunExecutionLog: vi.fn(),
    emitRunExecutionTool: vi.fn(),
    emitRunExecutionCompleted: vi.fn(),
    emitRunExecutionFailed: vi.fn(),
    emitRunStarted: vi.fn(),
    emitRunCompleted: vi.fn(),
    emitRunFailed: vi.fn(),
    emitRunCancelled: vi.fn(),
  } as unknown as RunsGateway;
}

function makeRunner(result: LocalCodexRunnerResult): LocalCodexRunner {
  return {
    run: vi.fn().mockResolvedValue(result),
  } as unknown as LocalCodexRunner;
}

function makeThrowingRunner(err: Error): LocalCodexRunner {
  return {
    run: vi.fn().mockRejectedValue(err),
  } as unknown as LocalCodexRunner;
}

function makeNeverResolvingRunner(): LocalCodexRunner {
  return {
    run: vi.fn().mockReturnValue(new Promise(() => {})),
  } as unknown as LocalCodexRunner;
}

const safeInput: RunExecutionInput = {
  runId: 'r-001',
  taskId: 't-008',
  projectId: 'p-004',
  agentId: 'agent-1',
  prompt: 'Review the code',
  cwd: '/tmp/test',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RunExecutionService', () => {
  it('emits run.execution.started before runner call', async () => {
    const gateway = makeGateway();
    const runner = makeRunner({ ok: true, events: [], finalMessage: 'Done' });
    const svc = new RunExecutionService(gateway, runner);

    await svc.executeRun(safeInput);

    expect(gateway.emitRunExecutionStarted).toHaveBeenCalledOnce();
    const call = vi.mocked(gateway.emitRunExecutionStarted).mock.calls[0][0];
    expect(call.runId).toBe('r-001');
    expect(call.provider).toBe('codex');
    expect(call.mode).toBe('read-only');
  });

  it('calls LocalCodexRunner.run with prompt/cwd/read-only by default', async () => {
    const gateway = makeGateway();
    const runner = makeRunner({ ok: true, events: [], finalMessage: 'Done' });
    const svc = new RunExecutionService(gateway, runner);

    await svc.executeRun(safeInput);

    expect(runner.run).toHaveBeenCalledOnce();
    const call = vi.mocked(runner.run).mock.calls[0][0];
    expect(call.prompt).toBe('Review the code');
    expect(call.cwd).toBe('/tmp/test');
    expect(call.sandbox).toBe('read-only');
  });

  it('supports workspace-write mode when explicitly provided', async () => {
    const gateway = makeGateway();
    const runner = makeRunner({ ok: true, events: [], finalMessage: 'Done' });
    const svc = new RunExecutionService(gateway, runner);

    await svc.executeRun({ ...safeInput, mode: 'workspace-write' });

    const call = vi.mocked(runner.run).mock.calls[0][0];
    expect(call.sandbox).toBe('workspace-write');
    const startCall = vi.mocked(gateway.emitRunExecutionStarted).mock.calls[0][0];
    expect(startCall.mode).toBe('workspace-write');
  });

  it('emits run.execution.log for runner events', async () => {
    const gateway = makeGateway();
    const runner = makeRunner({
      ok: true,
      events: [
        { type: 'system', message: 'Starting...' },
        { type: 'tool_use', message: 'Read file' },
      ],
      finalMessage: 'Done',
    });
    const svc = new RunExecutionService(gateway, runner);

    await svc.executeRun(safeInput);

    expect(gateway.emitRunExecutionLog).toHaveBeenCalledTimes(2);
    const msgs = vi.mocked(gateway.emitRunExecutionLog).mock.calls.map((c) => c[0].message);
    expect(msgs).toEqual(['Starting...', 'Read file']);
  });

  it('emits run.execution.completed when runner ok', async () => {
    const gateway = makeGateway();
    const runner = makeRunner({ ok: true, events: [], finalMessage: 'All done!' });
    const svc = new RunExecutionService(gateway, runner);

    await svc.executeRun(safeInput);

    expect(gateway.emitRunExecutionCompleted).toHaveBeenCalledOnce();
    const call = vi.mocked(gateway.emitRunExecutionCompleted).mock.calls[0][0];
    expect(call.summary).toBe('All done!');
    expect(call.runId).toBe('r-001');
  });

  it('emits run.execution.failed when runner returns ok false', async () => {
    const gateway = makeGateway();
    const runner = makeRunner({
      ok: false,
      events: [],
      errorSummary: 'codex not found',
    });
    const svc = new RunExecutionService(gateway, runner);

    await svc.executeRun(safeInput);

    expect(gateway.emitRunExecutionFailed).toHaveBeenCalledOnce();
    const call = vi.mocked(gateway.emitRunExecutionFailed).mock.calls[0][0];
    expect(call.errorSummary).toBe('codex not found');
  });

  it('emits run.execution.failed when runner throws', async () => {
    const gateway = makeGateway();
    const runner = makeThrowingRunner(new Error('spawn ENOENT'));
    const svc = new RunExecutionService(gateway, runner);

    await svc.executeRun(safeInput);

    expect(gateway.emitRunExecutionFailed).toHaveBeenCalledOnce();
    const call = vi.mocked(gateway.emitRunExecutionFailed).mock.calls[0][0];
    expect(call.errorSummary).toContain('ENOENT');
  });

  it('does not call run.completed lifecycle event', async () => {
    const gateway = makeGateway();
    const runner = makeRunner({ ok: true, events: [], finalMessage: 'Done' });
    const svc = new RunExecutionService(gateway, runner);

    await svc.executeRun(safeInput);

    expect(gateway.emitRunCompleted).not.toHaveBeenCalled();
  });

  it('does not call run.failed lifecycle event', async () => {
    const gateway = makeGateway();
    const runner = makeRunner({ ok: false, events: [], errorSummary: 'bad' });
    const svc = new RunExecutionService(gateway, runner);

    await svc.executeRun(safeInput);

    expect(gateway.emitRunFailed).not.toHaveBeenCalled();
  });

  it('does not require RunsService', async () => {
    const gateway = makeGateway();
    const runner = makeRunner({ ok: true, events: [], finalMessage: 'Done' });
    const svc = new RunExecutionService(gateway, runner);

    await expect(svc.executeRun(safeInput)).resolves.toBeUndefined();
  });

  it('does not throw on runner failure', async () => {
    const gateway = makeGateway();
    const runner = makeRunner({ ok: false, events: [], errorSummary: 'fail' });
    const svc = new RunExecutionService(gateway, runner);

    await expect(svc.executeRun(safeInput)).resolves.toBeUndefined();
  });

  it('truncates long event log messages to 500 chars', async () => {
    const gateway = makeGateway();
    const longMsg = 'x'.repeat(600);
    const runner = makeRunner({
      ok: true,
      events: [{ type: 'info', message: longMsg }],
      finalMessage: 'Done',
    });
    const svc = new RunExecutionService(gateway, runner);

    await svc.executeRun(safeInput);

    const call = vi.mocked(gateway.emitRunExecutionLog).mock.calls[0][0];
    expect(call.message.length).toBeLessThanOrEqual(500);
  });

  it('does not include raw command strings in emitted payloads', async () => {
    const gateway = makeGateway();
    const runner = makeRunner({ ok: true, events: [], finalMessage: 'Done' });
    const svc = new RunExecutionService(gateway, runner);

    await svc.executeRun(safeInput);

    const started = vi.mocked(gateway.emitRunExecutionStarted).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(JSON.stringify(started)).not.toMatch(/codex exec/);
  });

  // ─── Timeout guard tests ─────────────────────────────────────────────────

  describe('timeout guard', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('emits run.execution.failed on service timeout when runner never resolves', async () => {
      const gateway = makeGateway();
      const runner = makeNeverResolvingRunner();
      const svc = new RunExecutionService(gateway, runner);

      const promise = svc.executeRun(safeInput);

      // Fast-forward past service timeout (130s)
      await vi.advanceTimersByTimeAsync(130_001);

      await promise;

      // Started emitted before runner
      expect(gateway.emitRunExecutionStarted).toHaveBeenCalledOnce();

      // Failed emitted with timeout summary
      expect(gateway.emitRunExecutionFailed).toHaveBeenCalledOnce();
      const failCall = vi.mocked(gateway.emitRunExecutionFailed).mock.calls[0][0];
      expect(failCall.errorSummary).toBe('Execution timed out waiting for runner result');
      expect(failCall.runId).toBe('r-001');

      // Completed NOT emitted
      expect(gateway.emitRunExecutionCompleted).not.toHaveBeenCalled();
    });

    it('does not emit service timeout when runner resolves before timeout', async () => {
      const gateway = makeGateway();
      const runner = makeRunner({ ok: true, events: [], finalMessage: 'Done' });
      const svc = new RunExecutionService(gateway, runner);

      const promise = svc.executeRun(safeInput);

      // Runner resolves immediately (microtask), advance time well below timeout
      await vi.advanceTimersByTimeAsync(1);

      await promise;

      // Normal success path
      expect(gateway.emitRunExecutionStarted).toHaveBeenCalledOnce();
      expect(gateway.emitRunExecutionCompleted).toHaveBeenCalledOnce();
      expect(gateway.emitRunExecutionFailed).not.toHaveBeenCalled();
    });

    it('emits exactly one terminal event on runner failure (not timeout)', async () => {
      const gateway = makeGateway();
      const runner = makeRunner({ ok: false, events: [], errorSummary: 'fail' });
      const svc = new RunExecutionService(gateway, runner);

      const promise = svc.executeRun(safeInput);
      await vi.advanceTimersByTimeAsync(1);
      await promise;

      // One failed, no completed
      expect(gateway.emitRunExecutionFailed).toHaveBeenCalledOnce();
      expect(gateway.emitRunExecutionCompleted).not.toHaveBeenCalled();
    });

    it('emits exactly one terminal event on runner throw (not timeout)', async () => {
      const gateway = makeGateway();
      const runner = makeThrowingRunner(new Error('boom'));
      const svc = new RunExecutionService(gateway, runner);

      const promise = svc.executeRun(safeInput);
      await vi.advanceTimersByTimeAsync(1);
      await promise;

      // One failed, no completed
      expect(gateway.emitRunExecutionFailed).toHaveBeenCalledOnce();
      expect(gateway.emitRunExecutionCompleted).not.toHaveBeenCalled();
    });
  });
});
