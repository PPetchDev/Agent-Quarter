import {
  resolveLoungeStation,
  type LoungeStationFurniture,
  type LoungeStationId,
} from '../scene/loungeStations';
import type { AgentState, AgentTaskType, IsoWorldPoint } from './agentTypes';

export type ResolvedAgentTask = {
  taskType: AgentTaskType;
  targetStationId: LoungeStationId;
  /**
   * Isometric world coordinates of the interaction point.
   * Use with proj() from pixiRoom to get the current screen position.
   * Stored here for future pathfinding passes.
   */
  targetIsoPoint: IsoWorldPoint;
  arriveState: AgentState;
  walkingBubbleText: string;
  bubbleText: string;
};

const taskToStationMap: Record<AgentTaskType, LoungeStationId> = {
  code:     'computerDesk',
  research: 'bookshelf',
  meeting:  'meetingTable',
  document: 'documentDesk',
  review:   'computerDesk',
  print:    'printer',
  rest:     'sofa',
  idle:     'sofa',
};

const taskArrivalStateMap: Record<AgentTaskType, AgentState> = {
  code:     'coding',
  research: 'researching',
  meeting:  'meeting',
  document: 'documenting',
  review:   'reviewing',
  print:    'printing',
  rest:     'resting',
  idle:     'idle',
};

const taskWalkingBubbleMap: Record<AgentTaskType, string> = {
  code:     'Going to computer...',
  research: 'Going to bookshelf...',
  meeting:  'Going to meeting table...',
  document: 'Going to document desk...',
  review:   'Going to review station...',
  print:    'Going to printer...',
  rest:     'Going to sofa...',
  idle:     'Going idle...',
};

const taskBubbleMap: Record<AgentTaskType, string> = {
  code:     'Writing code...',
  research: 'Reading docs...',
  meeting:  'Planning with team...',
  document: 'Preparing document...',
  review:   'Reviewing work...',
  print:    'Exporting document...',
  rest:     'Taking a short break...',
  idle:     'Idle...',
};

export function resolveAgentTask(
  taskType: AgentTaskType,
  roomObjects: LoungeStationFurniture[] = [],
): ResolvedAgentTask {
  const targetStationId = taskToStationMap[taskType];
  const station = resolveLoungeStation(targetStationId, roomObjects);
  const p = station.interactionIsoPoint;

  return {
    taskType,
    targetStationId,
    targetIsoPoint: { wx: p.x, wy: p.y, wz: p.z ?? 0 },
    arriveState:       taskArrivalStateMap[taskType],
    walkingBubbleText: taskWalkingBubbleMap[taskType],
    bubbleText:        taskBubbleMap[taskType],
  };
}
