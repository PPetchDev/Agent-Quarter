import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import type { Run } from '@squad/core';

// ─── Execution event payloads ─────────────────────────────────────────────────

export type RunExecutionEventBase = {
  runId: string;
  taskId?: string;
  projectId?: string;
  agentId?: string;
  timestamp: string;
};

export type RunExecutionStartedPayload = RunExecutionEventBase & {
  provider: 'codex' | 'mock' | 'manual';
  mode: 'read-only' | 'workspace-write';
};

export type RunExecutionLogPayload = RunExecutionEventBase & {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
};

export type RunExecutionToolPayload = RunExecutionEventBase & {
  toolName: string;
  status: 'started' | 'completed' | 'failed';
  summary?: string;
};

export type RunExecutionCompletedPayload = RunExecutionEventBase & {
  summary: string;
};

export type RunExecutionFailedPayload = RunExecutionEventBase & {
  errorSummary: string;
};

// ─── Gateway ───────────────────────────────────────────────────────────────────

@WebSocketGateway({
  namespace: '/runs',
  cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' },
})
export class RunsGateway {
  @WebSocketServer()
  private readonly server!: Server;

  // ── Lifecycle events ────────────────────────────────────────────────────────

  emitRunStarted(run: Run): void {
    this.server?.emit('run.started', { run });
  }

  emitRunCompleted(run: Run): void {
    this.server?.emit('run.completed', { run });
  }

  emitRunFailed(run: Run): void {
    this.server?.emit('run.failed', { run });
  }

  emitRunCancelled(run: Run): void {
    this.server?.emit('run.cancelled', { run });
  }

  // ── Execution events ────────────────────────────────────────────────────────

  emitRunExecutionStarted(payload: RunExecutionStartedPayload): void {
    this.server?.emit('run.execution.started', payload);
  }

  emitRunExecutionLog(payload: RunExecutionLogPayload): void {
    this.server?.emit('run.execution.log', payload);
  }

  emitRunExecutionTool(payload: RunExecutionToolPayload): void {
    this.server?.emit('run.execution.tool', payload);
  }

  emitRunExecutionCompleted(payload: RunExecutionCompletedPayload): void {
    this.server?.emit('run.execution.completed', payload);
  }

  emitRunExecutionFailed(payload: RunExecutionFailedPayload): void {
    this.server?.emit('run.execution.failed', payload);
  }
}
