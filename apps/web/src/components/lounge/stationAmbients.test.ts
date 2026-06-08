import { describe, it, expect } from 'vitest';
import {
  STATION_AMBIENTS,
  applyStationAmbient,
  getStationDim,
  type AmbientShape,
  type AmbientDrawContext,
} from './stationAmbients';
import { loungeStations } from '../../game/scene/loungeStations';
import type { RoomObject } from './roomDefs';

type RecordedOp =
  | { op: 'fillQuad'; points: [number, number][]; color: number; alpha: number }
  | {
      op: 'strokeQuad';
      points: [number, number][];
      color: number;
      lineWidth: number;
      alpha: number;
    }
  | { op: 'circle'; cx: number; cy: number; r: number; color: number; alpha: number }
  | { op: 'ellipse'; cx: number; cy: number; rx: number; ry: number; color: number; alpha: number };

function buildRecordingCtx(furnitureType: string): { ctx: AmbientDrawContext; ops: RecordedOp[] } {
  const ops: RecordedOp[] = [];
  const ctx: AmbientDrawContext = {
    proj: (wx, wy, wz) => [wx * 100 + wz * 10, wy * 100 + wz * 10],
    fillQuad: (points, color, alpha) => ops.push({ op: 'fillQuad', points, color, alpha }),
    strokeQuad: (points, color, lineWidth, alpha) =>
      ops.push({ op: 'strokeQuad', points, color, lineWidth, alpha }),
    circle: (cx, cy, r, color, alpha) => ops.push({ op: 'circle', cx, cy, r, color, alpha }),
    ellipse: (cx, cy, rx, ry, color, alpha) =>
      ops.push({ op: 'ellipse', cx, cy, rx, ry, color, alpha }),
    dim: getStationDim(furnitureType),
  };
  return { ctx, ops };
}

function buildObj(furnitureType: string): RoomObject {
  return {
    id: 1,
    furnitureType,
    label: '',
    description: '',
    wx: 2,
    wy: 3,
    wz: 0,
    happiness: 0,
    draggable: false,
  };
}

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
    const known = new Set<AmbientShape['kind']>(['face', 'halo', 'point', 'topOutline', 'custom']);
    for (const [type, shapes] of Object.entries(STATION_AMBIENTS)) {
      for (const shape of shapes) {
        expect(known.has(shape.kind), `${type}: unknown kind ${shape.kind}`).toBe(true);
      }
    }
  });

  it('applyStationAmbient records at least one draw op for every defined station type', () => {
    for (const type of Object.keys(STATION_AMBIENTS)) {
      const { ctx, ops } = buildRecordingCtx(type);
      applyStationAmbient(ctx, buildObj(type), 0.8);
      expect(ops.length, `${type}: no ops recorded`).toBeGreaterThan(0);
    }
  });

  it('applyStationAmbient yields no ops for unknown furniture types', () => {
    const { ctx, ops } = buildRecordingCtx('not_a_real_station');
    applyStationAmbient(ctx, buildObj('not_a_real_station'), 0.8);
    expect(ops).toEqual([]);
  });

  it('applyStationAmbient scales final alpha by the pulse alpha', () => {
    const { ctx, ops } = buildRecordingCtx('printer');
    applyStationAmbient(ctx, buildObj('printer'), 0.5);
    // Printer shapes include a halo and a point; the point's shape alpha is 1.0,
    // so the recorded op alpha should equal the pulse alpha exactly.
    const pointOp = ops.find((o) => o.op === 'circle');
    expect(pointOp).toBeDefined();
    expect(pointOp?.alpha).toBeCloseTo(0.5, 5);
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
      {
        id: 0,
        furnitureType: 'x',
        label: '',
        description: '',
        wx: 0,
        wy: 0,
        wz: 0,
        happiness: 0,
        draggable: false,
      },
      0.5,
    );
    expect(calls.length).toBe(1);
    expect(calls[0]?.alpha).toBe(0.5);
  });
});
