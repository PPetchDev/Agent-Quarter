import type { AgentState, Direction } from '../agents/agentTypes';

const WALK_ANIM = {
  up: 'walk_up',
  down: 'walk_down',
  left: 'walk_left',
  right: 'walk_right',
} as const satisfies Readonly<Record<Direction, string>>;

const STATE_ANIM = {
  idle: 'idle',
  walking: 'walk_down',
  thinking: 'thinking',
  coding: 'typing',
  researching: 'reading',
  meeting: 'talking',
  documenting: 'documenting',
  reviewing: 'typing',
  printing: 'printing',
  resting: 'resting',
  done: 'happy',
  error: 'confused',
} as const satisfies Readonly<Record<AgentState, string>>;

export function resolveWalkingAnimation(direction: Direction): string {
  return WALK_ANIM[direction];
}

export function resolveStateAnimation(state: AgentState): string {
  return STATE_ANIM[state];
}
