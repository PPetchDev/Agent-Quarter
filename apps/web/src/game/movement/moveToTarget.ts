import type { Direction, Position } from '../agents/agentTypes';
import { resolveDirection } from './direction';

export type MoveResult = {
  position: Position;
  arrived: boolean;
  direction: Direction;
};

export function moveTowardsTarget(params: {
  current: Position;
  target: Position;
  speed: number;
  deltaTime: number;
  arriveThreshold?: number;
}): MoveResult {
  const { current, target, speed, deltaTime, arriveThreshold = 2 } = params;

  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const direction = resolveDirection(dx, dy);

  if (distance <= arriveThreshold) {
    return { position: target, arrived: true, direction };
  }

  const maxStep = speed * deltaTime;

  if (distance <= maxStep) {
    return { position: target, arrived: true, direction };
  }

  const nx = dx / distance;
  const ny = dy / distance;

  return {
    position: {
      x: current.x + nx * maxStep,
      y: current.y + ny * maxStep,
    },
    arrived: false,
    direction,
  };
}
