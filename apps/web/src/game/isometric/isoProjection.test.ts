import { describe, it, expect } from 'vitest';
import { isoToScreen, screenToIso } from './isoProjection';
import type { IsoProjectionConfig } from './isoProjection';

const cfg: IsoProjectionConfig = {
  originX: 400,
  originY: 120,
  tileWidth: 96,
  tileHeight: 48,
};

describe('isoToScreen', () => {
  it('origin (0,0,0) maps to the configured origin', () => {
    const r = isoToScreen({ x: 0, y: 0 }, cfg);
    expect(r.x).toBe(cfg.originX);
    expect(r.y).toBe(cfg.originY);
  });

  it('x+1 moves right and down', () => {
    const a = isoToScreen({ x: 0, y: 0 }, cfg);
    const b = isoToScreen({ x: 1, y: 0 }, cfg);
    expect(b.x).toBeGreaterThan(a.x);
    expect(b.y).toBeGreaterThan(a.y);
  });

  it('y+1 moves left and down', () => {
    const a = isoToScreen({ x: 0, y: 0 }, cfg);
    const b = isoToScreen({ x: 0, y: 1 }, cfg);
    expect(b.x).toBeLessThan(a.x);
    expect(b.y).toBeGreaterThan(a.y);
  });

  it('x+1 y+1 moves straight down', () => {
    const a = isoToScreen({ x: 0, y: 0 }, cfg);
    const b = isoToScreen({ x: 1, y: 1 }, cfg);
    expect(b.x).toBe(a.x); // x offsets cancel
    expect(b.y).toBeGreaterThan(a.y);
  });

  it('z lifts the point upward (decreases screen y)', () => {
    const a = isoToScreen({ x: 1, y: 1, z: 0 }, cfg);
    const b = isoToScreen({ x: 1, y: 1, z: 10 }, cfg);
    expect(b.y).toBeLessThan(a.y);
    expect(b.x).toBe(a.x); // z does not affect screen x
  });

  it('z=0 and z=undefined produce the same result', () => {
    const a = isoToScreen({ x: 2, y: 3, z: 0 }, cfg);
    const b = isoToScreen({ x: 2, y: 3 }, cfg);
    expect(a.x).toBe(b.x);
    expect(a.y).toBe(b.y);
  });

  it('x offset is tileWidth/2 per tile', () => {
    const a = isoToScreen({ x: 0, y: 0 }, cfg);
    const b = isoToScreen({ x: 1, y: 0 }, cfg);
    expect(b.x - a.x).toBe(cfg.tileWidth / 2);
  });

  it('y offset is tileHeight/2 per tile', () => {
    const a = isoToScreen({ x: 0, y: 0 }, cfg);
    const b = isoToScreen({ x: 0, y: 1 }, cfg);
    expect(b.y - a.y).toBe(cfg.tileHeight / 2);
  });
});

describe('screenToIso', () => {
  it('origin screen point maps back to (0,0,0)', () => {
    const r = screenToIso({ x: cfg.originX, y: cfg.originY }, cfg);
    expect(r.x).toBeCloseTo(0);
    expect(r.y).toBeCloseTo(0);
  });

  it('roundtrips: screenToIso(isoToScreen(p)) ≈ p', () => {
    const pts: Array<{ x: number; y: number }> = [
      { x: 0, y: 0 },
      { x: 3, y: 2 },
      { x: 5, y: 5 },
      { x: 1, y: 7 },
    ];
    for (const p of pts) {
      const screen = isoToScreen(p, cfg);
      const back = screenToIso(screen, cfg);
      expect(back.x).toBeCloseTo(p.x, 5);
      expect(back.y).toBeCloseTo(p.y, 5);
    }
  });
});
