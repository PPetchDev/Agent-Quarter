import { describe, it, expect } from 'vitest';
import type { AgentState, Direction } from '../agents/agentTypes';
import { resolveWalkingAnimation, resolveStateAnimation } from '../animation/animationResolver';

const walkingAnimationCases = [
  ['up', 'walk_up'],
  ['down', 'walk_down'],
  ['left', 'walk_left'],
  ['right', 'walk_right'],
] as const satisfies ReadonlyArray<readonly [Direction, string]>;

const stateAnimationCases = [
  ['idle', 'idle'],
  ['walking', 'walk_down'],
  ['thinking', 'thinking'],
  ['coding', 'typing'],
  ['researching', 'reading'],
  ['meeting', 'talking'],
  ['documenting', 'documenting'],
  ['reviewing', 'typing'],
  ['printing', 'printing'],
  ['resting', 'resting'],
  ['done', 'happy'],
  ['error', 'confused'],
] as const satisfies ReadonlyArray<readonly [AgentState, string]>;

describe('resolveWalkingAnimation', () => {
  it.each(walkingAnimationCases)('maps %s to %s', (direction, animation) => {
    expect(resolveWalkingAnimation(direction)).toBe(animation);
  });
});

describe('resolveStateAnimation', () => {
  it.each(stateAnimationCases)('maps %s to %s', (state, animation) => {
    expect(resolveStateAnimation(state)).toBe(animation);
  });
});
