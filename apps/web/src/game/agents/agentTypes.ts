export type AgentState =
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

export type AgentTaskType =
  | 'code'
  | 'research'
  | 'meeting'
  | 'document'
  | 'review'
  | 'print'
  | 'rest'
  | 'idle';

export type Direction = 'up' | 'down' | 'left' | 'right';

export type Position = {
  x: number;
  y: number;
};

/** Isometric world coordinate (matches pixiRoom wx/wy/wz convention) */
export type IsoWorldPoint = {
  wx: number;
  wy: number;
  wz: number;
};

export type Agent = {
  id: string;
  name: string;
  characterId: string;
  state: AgentState;
  taskType?: AgentTaskType;
  position: Position;
  targetPosition?: Position;
  targetStationId?: string;
  arriveState?: AgentState;
  arriveBubbleText?: string;
  /** Spine animation to play on arrival (for furniture interaction slots). */
  arriveAnim?: string;
  direction: Direction;
  animation: string;
  bubbleText?: string;
  speed: number;
  /** Total milliseconds the agent should remain in the arrival state before auto-idling. */
  workDurationMs?: number;
  /** Milliseconds already elapsed in the current work session. */
  workElapsedMs?: number;
  /**
   * Pending task types the agent will auto-run after the current work timer completes.
   * Head of the list is the next task to start.
   */
  taskQueue: AgentTaskType[];
};
