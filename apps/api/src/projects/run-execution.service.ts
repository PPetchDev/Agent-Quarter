import { Injectable } from '@nestjs/common';
import { RunsGateway } from './runs.gateway';
import { createRunExecutionNotifier } from './run-execution-notifier';
import { LocalCodexRunner } from '../execution/local-codex-runner';
import type { LocalCodexRunnerResult } from '../execution/local-codex-runner';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RunExecutionInput = {
  runId: string;
  taskId?: string;
  projectId?: string;
  agentId?: string;
  prompt: string;
  cwd: string;
  mode?: 'read-only' | 'workspace-write';
};

// ─── Constants ────────────────────────────────────────────────────────────────

/** Service-level timeout: slightly longer than runner's 120s default */
const SERVICE_TIMEOUT_MS = 130_000;

/** Sentinel value for Promise.race when timeout wins */
const SERVICE_TIMEOUT_SENTINEL = Symbol('service-timeout');

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class RunExecutionService {
  constructor(
    private readonly runsGateway: RunsGateway,
    private readonly codexRunner: LocalCodexRunner,
  ) {}

  async executeRun(input: RunExecutionInput): Promise<void> {
    const { runId, taskId, projectId, agentId, prompt, cwd, mode = 'read-only' } = input;
    const notify = createRunExecutionNotifier(this.runsGateway, { runId, taskId, projectId, agentId });

    // Emit execution started
    notify.started({ provider: 'codex', mode });

    // Run Codex with service-level timeout guard
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<typeof SERVICE_TIMEOUT_SENTINEL>((resolve) => {
      timer = setTimeout(() => resolve(SERVICE_TIMEOUT_SENTINEL), SERVICE_TIMEOUT_MS);
    });

    let result: LocalCodexRunnerResult;
    try {
      const raced = await Promise.race([
        this.codexRunner.run({ prompt, cwd, sandbox: mode }),
        timeoutPromise,
      ]);
      clearTimeout(timer);

      // Service timeout won the race
      if (raced === SERVICE_TIMEOUT_SENTINEL) {
        notify.failed({ errorSummary: 'Execution timed out waiting for runner result' });
        return;
      }

      result = raced as LocalCodexRunnerResult;
    } catch (err) {
      clearTimeout(timer);
      notify.failed({ errorSummary: `unexpected error: ${String(err)}` });
      return;
    }

    // Emit logs from runner events
    for (const event of result.events) {
      const message = event.message ?? event.type;
      notify.log({ level: 'info', message: message.slice(0, 500) });
    }

    // Emit completion or failure
    if (result.ok) {
      notify.completed({ summary: result.finalMessage ?? 'Execution completed.' });
    } else {
      notify.failed({
        errorSummary:
          result.errorSummary ??
          (result.timedOut
            ? 'Execution timed out'
            : result.truncated
              ? 'Execution output truncated'
              : 'Execution failed'),
      });
    }
  }
}
