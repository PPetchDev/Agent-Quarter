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
  direction: Direction;
  animation: string;
  bubbleText?: string;
  speed: number;
};
