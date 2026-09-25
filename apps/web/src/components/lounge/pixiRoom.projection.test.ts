// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { computeRoomProjection, projAt, setRoomProjection, worldDeltaFromScreen } from './pixiRoom';

describe('worldDeltaFromScreen', () => {
  it.each([
    [10, 8],
    [14, 9],
    [8, 6],
  ])('inverts the ground-plane projection in a %ix%i room', (cols, rows) => {
    setRoomProjection(cols, rows);
    const { S, OX, OY } = computeRoomProjection(cols, rows);
    const [ox, oy] = projAt(0, 0, 0, S, OX, OY);
    for (const [dwx, dwy] of [
      [1, 0],
      [0, 1],
      [-2, 3],
      [2.5, -1.5],
    ] as const) {
      const [sx, sy] = projAt(dwx, dwy, 0, S, OX, OY);
      const [rx, ry] = worldDeltaFromScreen(sx - ox, sy - oy);
      expect(rx).toBeCloseTo(dwx);
      expect(ry).toBeCloseTo(dwy);
    }
  });

  it('keeps x fixed when the pointer moves straight up one row', () => {
    setRoomProjection(10, 8);
    const { S } = computeRoomProjection(10, 8);
    const [dwx, dwy] = worldDeltaFromScreen(0, -0.65 * S);
    expect(dwx).toBeCloseTo(-0.65);
    expect(dwy).toBeCloseTo(1);
  });
});
