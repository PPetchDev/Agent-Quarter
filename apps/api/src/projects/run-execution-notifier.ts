import type { RunsGateway } from './runs.gateway';

export interface RunExecutionNotifierContext {
  runId: string;
  taskId?: string;
  projectId?: string;
  agentId?: string;
}

export interface RunExecutionNotifier {
  started(payload: { provider: 'codex' | 'mock' | 'manual'; mode: 'read-only' | 'workspace-write' }): void;
  log(payload: { level: 'debug' | 'info' | 'warn' | 'error'; message: string }): void;
  completed(payload: { summary: string }): void;
  failed(payload: { errorSummary: string }): void;
}

/**
 * Binds a run-execution context (runId/taskId/projectId/agentId) once and
 * stamps a fresh timestamp per call, so RunExecutionService stops rebuilding
 * that boilerplate at each of its six emit call sites.
 */
export function createRunExecutionNotifier(
  gateway: RunsGateway,
  context: RunExecutionNotifierContext,
): RunExecutionNotifier {
  return {
    started: (payload) =>
      gateway.emitRunExecutionStarted({ ...context, ...payload, timestamp: new Date().toISOString() }),
    log: (payload) =>
      gateway.emitRunExecutionLog({ ...context, ...payload, timestamp: new Date().toISOString() }),
    completed: (payload) =>
      gateway.emitRunExecutionCompleted({ ...context, ...payload, timestamp: new Date().toISOString() }),
    failed: (payload) =>
      gateway.emitRunExecutionFailed({ ...context, ...payload, timestamp: new Date().toISOString() }),
  };
}
