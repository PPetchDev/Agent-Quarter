import {
  resolveLoungeStation,
  type LoungeStationFurniture,
  type LoungeStationId,
} from '../scene/loungeStations';
import type { AgentState, AgentTaskType, IsoWorldPoint } from './agentTypes';

export type ResolvedAgentTask = {
  taskType: AgentTaskType;
  targetStationId: LoungeStationId;
  /** Isometric world coordinates of the interaction point. */
  targetIsoPoint: IsoWorldPoint;
  arriveState: AgentState;
  walkingBubbleText: string;
  bubbleText: string;
  /** Bubble text shown when the work timer auto-completes and the agent returns to idle. */
  doneBubbleText: string;
  /** Deterministic duration the agent should remain in the arrival state. 0 = no work loop. */
  workDurationMs: number;
};

type TaskConfig = {
  stationId: LoungeStationId;
  arriveState: AgentState;
  walkingBubble: string;
  bubble: string;
  doneBubble: string;
  workDurationMs: number;
};

const TASK_CONFIG: Record<AgentTaskType, TaskConfig> = {
  code: {
    stationId: 'computerDesk',
    arriveState: 'coding',
    walkingBubble: 'Going to computer...',
    bubble: 'Writing code...',
    doneBubble: 'Code session done.',
    workDurationMs: 8000,
  },
  research: {
    stationId: 'bookshelf',
    arriveState: 'researching',
    walkingBubble: 'Going to bookshelf...',
    bubble: 'Reading docs...',
    doneBubble: 'Finished reading.',
    workDurationMs: 6000,
  },
  meeting: {
    stationId: 'meetingTable',
    arriveState: 'meeting',
    walkingBubble: 'Going to meeting table...',
    bubble: 'Planning with team...',
    doneBubble: 'Wrapped up the meeting.',
    workDurationMs: 7000,
  },
  document: {
    stationId: 'documentDesk',
    arriveState: 'documenting',
    walkingBubble: 'Going to document desk...',
    bubble: 'Preparing document...',
    doneBubble: 'Document ready.',
    workDurationMs: 6500,
  },
  review: {
    stationId: 'computerDesk',
    arriveState: 'reviewing',
    walkingBubble: 'Going to review station...',
    bubble: 'Reviewing work...',
    doneBubble: 'Review complete.',
    workDurationMs: 7000,
  },
  print: {
    stationId: 'printer',
    arriveState: 'printing',
    walkingBubble: 'Going to printer...',
    bubble: 'Exporting document...',
    doneBubble: 'Print job sent.',
    workDurationMs: 3500,
  },
  rest: {
    stationId: 'sofa',
    arriveState: 'resting',
    walkingBubble: 'Going to sofa...',
    bubble: 'Taking a short break...',
    doneBubble: 'Feeling refreshed.',
    workDurationMs: 9000,
  },
  idle: {
    stationId: 'sofa',
    arriveState: 'idle',
    walkingBubble: 'Going idle...',
    bubble: 'Idle...',
    doneBubble: 'Idle.',
    workDurationMs: 0,
  },
};

export function resolveAgentTask(
  taskType: AgentTaskType,
  roomObjects: LoungeStationFurniture[] = [],
): ResolvedAgentTask {
  const config = TASK_CONFIG[taskType];
  const station = resolveLoungeStation(config.stationId, roomObjects);
  const p = station.interactionIsoPoint;

  return {
    taskType,
    targetStationId: config.stationId,
    targetIsoPoint: { wx: p.x, wy: p.y, wz: p.z ?? 0 },
    arriveState: config.arriveState,
    walkingBubbleText: config.walkingBubble,
    bubbleText: config.bubble,
    doneBubbleText: config.doneBubble,
    workDurationMs: config.workDurationMs,
  };
}
