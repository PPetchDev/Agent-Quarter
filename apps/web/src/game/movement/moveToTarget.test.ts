import { describe, it, expect } from 'vitest';
import { moveTowardsTarget } from '../movement/moveToTarget';

describe('moveTowardsTarget', () => {
  it('moves closer to the target', () => {
    const result = moveTowardsTarget({
      current:   { x: 0, y: 0 },
      target:    { x: 100, y: 0 },
      speed:     60,
      deltaTime: 1,
    });
    expect(result.position.x).toBeCloseTo(60);
    expect(result.arrived).toBe(false);
  });

  it('does not overshoot the target', () => {
    const result = moveTowardsTarget({
      current:   { x: 0, y: 0 },
      target:    { x: 10, y: 0 },
      speed:     100,
      deltaTime: 1,
    });
    expect(result.position.x).toBe(10);
    expect(result.arrived).toBe(true);
  });

  it('snaps to target when within arriveThreshold', () => {
    const result = moveTowardsTarget({
      current:          { x: 99, y: 0 },
      target:           { x: 100, y: 0 },
      speed:            10,
      deltaTime:        0.01,
      arriveThreshold:  2,
    });
    expect(result.position.x).toBe(100);
    expect(result.arrived).toBe(true);
  });

  it('returns arrived=true when at exact target', () => {
    const result = moveTowardsTarget({
      current:   { x: 100, y: 50 },
      target:    { x: 100, y: 50 },
      speed:     60,
      deltaTime: 1,
    });
    expect(result.arrived).toBe(true);
  });

  it('returns arrived=false while still moving', () => {
    const result = moveTowardsTarget({
      current:   { x: 0, y: 0 },
      target:    { x: 500, y: 0 },
      speed:     60,
      deltaTime: 1,
    });
    expect(result.arrived).toBe(false);
    expect(result.position.x).toBeCloseTo(60);
  });

  it('returns correct direction while moving horizontally right', () => {
    const result = moveTowardsTarget({
      current:   { x: 0, y: 0 },
      target:    { x: 100, y: 0 },
      speed:     60,
      deltaTime: 1,
    });
    expect(result.direction).toBe('right');
  });

  it('returns correct direction while moving down', () => {
    const result = moveTowardsTarget({
      current:   { x: 0, y: 0 },
      target:    { x: 0, y: 100 },
      speed:     60,
      deltaTime: 1,
    });
    expect(result.direction).toBe('down');
  });
});
