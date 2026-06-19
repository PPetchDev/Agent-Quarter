// ─── Agent Event Types (shared between api + web) ────────────────────────────
// Design spec §7 extension — lounge agent events on /lounge namespace

export type AgentEventType =
  | 'agent.state.changed'
  | 'agent.task.assigned'
  | 'agent.task.completed'
  | 'agent.error';

export type AgentLoungeState =
  | 'idle'
  | 'walking'
  | 'thinking'
  | 'coding'
  | 'researching'
  | 'meeting'
  | 'documenting'
  | 'reviewing'
  | 'printing'
  | 'resting'
  | 'done'
  | 'error';

export type AgentLoungeTaskType =
  | 'code'
  | 'research'
  | 'meeting'
  | 'document'
  | 'review'
  | 'print'
  | 'rest'
  | 'idle';

// ─── Base ─────────────────────────────────────────────────────────────────────

export type AgentEventPayload = {
  agentId: string;
  characterId: string;
  timestamp: string;
};

// ─── Event payloads ───────────────────────────────────────────────────────────

export type AgentStateChangedPayload = AgentEventPayload & {
  event: 'agent.state.changed';
  state: AgentLoungeState;
  previousState?: AgentLoungeState;
};

export type AgentTaskAssignedPayload = AgentEventPayload & {
  event: 'agent.task.assigned';
  taskType: AgentLoungeTaskType;
  targetStationId?: string;
};

export type AgentTaskCompletedPayload = AgentEventPayload & {
  event: 'agent.task.completed';
  taskType: AgentLoungeTaskType;
  durationMs?: number;
};

export type AgentErrorPayload = AgentEventPayload & {
  event: 'agent.error';
  error: string;
  taskType?: AgentLoungeTaskType;
};

// ─── Union ────────────────────────────────────────────────────────────────────

export type AgentEvent =
  | AgentStateChangedPayload
  | AgentTaskAssignedPayload
  | AgentTaskCompletedPayload
  | AgentErrorPayload;
