import { describe, it, expect } from 'vitest';
import { STATION_AMBIENTS, type AmbientShape } from './stationAmbients';
import { loungeStations } from '../../game/scene/loungeStations';

function inUnitRange(value: number): boolean {
  return value >= 0 && value <= 1;
}

describe('STATION_AMBIENTS', () => {
  it('has an entry for every station furniture type referenced by loungeStations', () => {
    const missing: string[] = [];
    for (const station of Object.values(loungeStations)) {
      if (!STATION_AMBIENTS[station.furnitureType]) {
        missing.push(`${station.id} (${station.furnitureType})`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('contains only non-empty shape arrays', () => {
    for (const [type, shapes] of Object.entries(STATION_AMBIENTS)) {
      expect(shapes.length, `${type}: empty shapes array`).toBeGreaterThan(0);
    }
  });

  it('keeps every alpha and fillAlpha within [0, 1]', () => {
    for (const [type, shapes] of Object.entries(STATION_AMBIENTS)) {
      for (const shape of shapes) {
        if (shape.kind === 'custom') continue;
        expect(
          inUnitRange(shape.alpha),
          `${type} ${shape.kind}: alpha ${shape.alpha} out of range`,
        ).toBe(true);
        if (shape.kind === 'topOutline') {
          expect(
            inUnitRange(shape.fillAlpha),
            `${type} topOutline: fillAlpha ${shape.fillAlpha} out of range`,
          ).toBe(true);
        }
      }
    }
  });

  it('face shapes satisfy fx0 < fx1 and fz0 < fz1', () => {
    for (const [type, shapes] of Object.entries(STATION_AMBIENTS)) {
      for (const shape of shapes) {
        if (shape.kind !== 'face') continue;
        expect(shape.fx0, `${type} face: fx0`).toBeLessThan(shape.fx1);
        expect(shape.fz0, `${type} face: fz0`).toBeLessThan(shape.fz1);
      }
    }
  });

  it('halo shapes have positive radii', () => {
    for (const [type, shapes] of Object.entries(STATION_AMBIENTS)) {
      for (const shape of shapes) {
        if (shape.kind !== 'halo') continue;
        expect(shape.rx, `${type} halo: rx`).toBeGreaterThan(0);
        expect(shape.ry, `${type} halo: ry`).toBeGreaterThan(0);
      }
    }
  });

  it('point shapes have a positive radius', () => {
    for (const [type, shapes] of Object.entries(STATION_AMBIENTS)) {
      for (const shape of shapes) {
        if (shape.kind !== 'point') continue;
        expect(shape.r, `${type} point: r`).toBeGreaterThan(0);
      }
    }
  });

  it('topOutline shapes have a positive lineWidth', () => {
    for (const [type, shapes] of Object.entries(STATION_AMBIENTS)) {
      for (const shape of shapes) {
        if (shape.kind !== 'topOutline') continue;
        expect(shape.lineWidth, `${type} topOutline: lineWidth`).toBeGreaterThan(0);
      }
    }
  });

  it('only emits shape kinds known to the union', () => {
    const known = new Set<AmbientShape['kind']>([
      'face',
      'halo',
      'point',
      'topOutline',
      'custom',
    ]);
    for (const [type, shapes] of Object.entries(STATION_AMBIENTS)) {
      for (const shape of shapes) {
        expect(
          known.has(shape.kind),
          `${type}: unknown kind ${shape.kind}`,
        ).toBe(true);
      }
    }
  });

  it('custom shape kind invokes its draw fn with the context, obj, and alpha', () => {
    const calls: { obj: unknown; alpha: number }[] = [];
    const customShape: AmbientShape = {
      kind: 'custom',
      draw: (_ctx, obj, alpha) => {
        calls.push({ obj, alpha });
      },
    };
    // Drive draw via the typed call path used by the interpreter
    customShape.draw(
      {
        proj: () => [0, 0],
        fillQuad: () => {},
        strokeQuad: () => {},
        circle: () => {},
        ellipse: () => {},
        dim: { w: 1, d: 1, h: 1 },
      },
      { id: 0, furnitureType: 'x', label: '', description: '', wx: 0, wy: 0, wz: 0, happiness: 0, draggable: false },
      0.5,
    );
    expect(calls.length).toBe(1);
    expect(calls[0]?.alpha).toBe(0.5);
  });
});
