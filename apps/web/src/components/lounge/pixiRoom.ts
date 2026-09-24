import * as PIXI from 'pixi.js';
import type { RoomObject, Rotation } from './roomDefs';
import { FURNITURE_DIMS, FURNITURE_TILES, footprintFor, rotateFootprintLocal } from './roomDefs';
import { zabutonPalette } from './furnitureCatalog';
import { applyStationAmbient, getStationDim, type AmbientDrawContext } from './stationAmbients';

export const CANVAS_W = 1240;
export const CANVAS_H = 620;

let _S = 56;
let _OX = 100;
let _OY = 560;

export function computeRoomProjection(
  cols: number,
  rows: number,
): { S: number; OX: number; OY: number } {
  const S = Math.floor(
    Math.min((CANVAS_W - 20) / (cols + rows * 0.65), (CANVAS_H - 20) / (rows * 0.65 + 4.5)),
  );
  const OX = Math.floor((CANVAS_W - S * (cols + rows * 0.65)) / 2);
  const OY = CANVAS_H - 30;
  return { S, OX, OY };
}

export function setRoomProjection(cols: number, rows: number): void {
  const projection = computeRoomProjection(cols, rows);
  _S = projection.S;
  _OX = projection.OX;
  _OY = projection.OY;
}

/** Project isometric coords using explicit scale/origin — pure, no globals. */
export function projAt(
  wx: number,
  wy: number,
  wz: number,
  S: number,
  OX: number,
  OY: number,
): [number, number] {
  return [OX + wx * S + wy * S * 0.65, OY - wy * S * 0.65 - wz * S];
}

// ─── Active furniture draw rotation ───────────────────────────────────────────
//
// A furniture body is drawn in footprint-local coordinates ([0..w] × [0..d]).
// To rotate it we transform those local coords in the world plane about the
// object anchor BEFORE projecting — so every draw helper that calls proj()
// rotates transparently. Rotation is only active between beginFurnitureRotation()
// and endFurnitureRotation(); outside that window proj() is identity (_rotQ = 0).

let _rotQ = 0; // active quarter-turns 0|1|2|3
let _rotAx = 0; // anchor world x (min corner)
let _rotAy = 0; // anchor world y (min corner)
let _rotW = 1; // unrotated footprint width
let _rotD = 1; // unrotated footprint depth

function beginFurnitureRotation(type: string, wx: number, wy: number, rotation: Rotation = 0) {
  _rotQ = rotation & 3;
  _rotAx = wx;
  _rotAy = wy;
  const fp = FURNITURE_TILES[type] ?? { w: 1, d: 1 };
  _rotW = fp.w;
  _rotD = fp.d;
}

function endFurnitureRotation() {
  _rotQ = 0;
}

/** Maps a world point inside the active furniture footprint through the active rotation. */
function rotateLocal(wx: number, wy: number): [number, number] {
  const [x, y] = rotateFootprintLocal(wx - _rotAx, wy - _rotAy, _rotW, _rotD, _rotQ);
  return [_rotAx + x, _rotAy + y];
}

export function proj(wx: number, wy: number, wz: number): [number, number] {
  if (_rotQ !== 0) [wx, wy] = rotateLocal(wx, wy);
  return projAt(wx, wy, wz, _S, _OX, _OY);
}

export function worldDeltaFromScreen(dx: number, dy: number): [number, number] {
  const dwy = -dy / (_S * 0.65);
  const dwx = dx / _S - dy / _S;
  return [dwx, dwy];
}

// ─── Primitive helpers ────────────────────────────────────────────────────────

function P(pts: [number, number][]): number[] {
  return pts.flatMap(([x, y]) => [x, y]);
}

function qfill(g: PIXI.Graphics, pts: [number, number][], color: number, alpha = 1) {
  g.beginFill(color, alpha).drawPolygon(P(pts)).endFill();
}

function qstroke(
  g: PIXI.Graphics,
  pts: [number, number][],
  color: number,
  width = 0.7,
  alpha = 0.18,
) {
  g.lineStyle(width, color, alpha).drawPolygon(P(pts));
}

function ln(
  g: PIXI.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number,
  width: number,
  alpha = 1,
) {
  g.lineStyle(width, color, alpha).moveTo(x1, y1).lineTo(x2, y2);
}

export function isoBox(
  g: PIXI.Graphics,
  wx: number,
  wy: number,
  wz: number,
  w: number,
  d: number,
  h: number,
  topColor?: number,
  frontColor?: number,
  rightColor?: number,
  topAlpha = 1,
  frontAlpha = 1,
  rightAlpha = 1,
) {
  if (_rotQ !== 0) {
    // A quarter-turned box is still axis-aligned: draw it over its rotated world
    // extent with rotation paused, so the visible faces keep their shading.
    const [ax, ay] = rotateLocal(wx, wy);
    const [bx, by] = rotateLocal(wx + w, wy + d);
    const quarter = _rotQ;
    _rotQ = 0;
    try {
      isoBox(
        g,
        Math.min(ax, bx),
        Math.min(ay, by),
        wz,
        Math.abs(bx - ax),
        Math.abs(by - ay),
        h,
        topColor,
        frontColor,
        rightColor,
        topAlpha,
        frontAlpha,
        rightAlpha,
      );
    } finally {
      _rotQ = quarter;
    }
    return;
  }
  if (topColor !== undefined) {
    const pts: [number, number][] = [
      proj(wx, wy, wz + h),
      proj(wx + w, wy, wz + h),
      proj(wx + w, wy + d, wz + h),
      proj(wx, wy + d, wz + h),
    ];
    qfill(g, pts, topColor, topAlpha);
    qstroke(g, pts, 0, 0.6, 0.1);
  }
  if (frontColor !== undefined) {
    const pts: [number, number][] = [
      proj(wx, wy, wz),
      proj(wx + w, wy, wz),
      proj(wx + w, wy, wz + h),
      proj(wx, wy, wz + h),
    ];
    qfill(g, pts, frontColor, frontAlpha);
    qstroke(g, pts, 0, 0.6, 0.1);
  }
  if (rightColor !== undefined) {
    const pts: [number, number][] = [
      proj(wx + w, wy, wz),
      proj(wx + w, wy + d, wz),
      proj(wx + w, wy + d, wz + h),
      proj(wx + w, wy, wz + h),
    ];
    qfill(g, pts, rightColor, rightAlpha);
    qstroke(g, pts, 0, 0.6, 0.12);
  }
}

// ─── Hit-area helper ──────────────────────────────────────────────────────────

export function furnitureHitPolygon(
  type: string,
  wx: number,
  wy: number,
  wz: number,
  rotation: Rotation = 0,
): PIXI.Polygon {
  const fp = footprintFor(type, rotation);
  const pts = [
    proj(wx, wy, wz),
    proj(wx + fp.w, wy, wz),
    proj(wx + fp.w, wy + fp.d, wz),
    proj(wx, wy + fp.d, wz),
  ];
  return new PIXI.Polygon(pts.flatMap(([x, y]) => [x, y]));
}

// ─── Background (static room shell) ──────────────────────────────────────────

export const ROOM_TILES_X = 10;
export const ROOM_TILES_Y = 8;

export type RoomTheme = {
  skyTop: string;
  skyBot: string;
  wallTint: number;
  wallTintAlpha: number;
  floorTint: number;
  floorTintAlpha: number;
  /** Light cast through window onto floor/wall */
  windowGlow: number;
  windowGlowAlpha: number;
  wallpaperPattern: 'stars' | 'hearts' | 'sakura' | 'stripe' | 'maple';
  wallpaperColor1: number;
  wallpaperColor2: number;
};

export type RoomThemeKey = 'dawn' | 'morning' | 'afternoon' | 'dusk' | 'night';

const THEMES: Record<RoomThemeKey, RoomTheme> = {
  dawn: {
    skyTop: '#ffd1dc',
    skyBot: '#ffe4e1',
    wallTint: 0xffe4d0,
    wallTintAlpha: 0.12,
    floorTint: 0xffdab9,
    floorTintAlpha: 0.08,
    windowGlow: 0xffe4d0,
    windowGlowAlpha: 0.15,
    wallpaperPattern: 'hearts',
    wallpaperColor1: 0xffd1dc,
    wallpaperColor2: 0xffe4e9,
  },
  morning: {
    skyTop: '#e0f0ff',
    skyBot: '#f0f8ff',
    wallTint: 0xf8f4e8,
    wallTintAlpha: 0.08,
    floorTint: 0xfffff0,
    floorTintAlpha: 0.05,
    windowGlow: 0xffffff,
    windowGlowAlpha: 0.20,
    wallpaperPattern: 'sakura',
    wallpaperColor1: 0xffdde8,
    wallpaperColor2: 0xffe4e9,
  },
  afternoon: {
    skyTop: '#fff8e8',
    skyBot: '#fff0d0',
    wallTint: 0xfffaf0,
    wallTintAlpha: 0.04,
    floorTint: 0xfff8e0,
    floorTintAlpha: 0.03,
    windowGlow: 0xfffaf0,
    windowGlowAlpha: 0.12,
    wallpaperPattern: 'stripe',
    wallpaperColor1: 0xf5f0e8,
    wallpaperColor2: 0xfaf5f0,
  },
  dusk: {
    skyTop: '#ffb6c1',
    skyBot: '#ffa07a',
    wallTint: 0xffc8a0,
    wallTintAlpha: 0.18,
    floorTint: 0xffb899,
    floorTintAlpha: 0.12,
    windowGlow: 0xffcc88,
    windowGlowAlpha: 0.18,
    wallpaperPattern: 'maple',
    wallpaperColor1: 0xffccaa,
    wallpaperColor2: 0xffd4b8,
  },
  night: {
    skyTop: '#2a1a3e',
    skyBot: '#3a2a5a',
    wallTint: 0x3040a0,
    wallTintAlpha: 0.22,
    floorTint: 0x182038,
    floorTintAlpha: 0.15,
    windowGlow: 0xffdd88,
    windowGlowAlpha: 0.08,
    wallpaperPattern: 'stars',
    wallpaperColor1: 0x8888cc,
    wallpaperColor2: 0xffffcc,
  },
};

export function getTimeTheme(): RoomTheme {
  const h = new Date().getHours();
  if (h >= 5 && h < 7.5) return THEMES.dawn!;
  if (h >= 7.5 && h < 12) return THEMES.morning!;
  if (h >= 12 && h < 17) return THEMES.afternoon!;
  if (h >= 17 && h < 20) return THEMES.dusk!;
  return THEMES.night!;
}

/** Wallpaper presets selectable from the room settings panel. */
export const ROOM_THEME_KEYS: RoomThemeKey[] = ['dawn', 'morning', 'afternoon', 'dusk', 'night'];

/** Resolves a manual wallpaper key; 'auto' (or unknown) follows local time. */
export function resolveRoomTheme(key: string | undefined): RoomTheme {
  if (key && key !== 'auto' && (ROOM_THEME_KEYS as string[]).includes(key)) {
    return THEMES[key as RoomThemeKey];
  }
  return getTimeTheme();
}

export function drawBackground(
  g: PIXI.Graphics,
  cols = ROOM_TILES_X,
  rows = ROOM_TILES_Y,
  theme?: RoomTheme,
) {
  g.clear();

  const WAINSCOT_H = 1.8; // wainscoting height
  const sakuraPink = [0xffb7c5, 0xffc0cb, 0xffd1dc, 0xffe4e9];

  // ── Shadow ──────────────────────────────────────────────────────────────
  const [shadowX, shadowY] = proj(cols / 2, rows / 2, -0.01);
  g.beginFill(0x3a2020, 0.16)
    .drawEllipse(shadowX, shadowY + _S * 0.1, (cols + rows * 0.5) * _S * 0.55, rows * _S * 0.32)
    .endFill();
  g.beginFill(0x3a2020, 0.08)
    .drawEllipse(shadowX, shadowY + _S * 0.05, (cols + rows * 0.5) * _S * 0.38, rows * _S * 0.18)
    .endFill();

  // ── Floor — rich wood planks ────────────────────────────────────────────
  qfill(g, [proj(0, 0, 0), proj(cols, 0, 0), proj(cols, rows, 0), proj(0, rows, 0)], 0xc4956a);
  // Horizontal plank lines
  for (let j = 1; j < rows; j++) {
    const [ax, ay] = proj(0, j, 0),
      [bx, by] = proj(cols, j, 0);
    ln(g, ax, ay, bx, by, 0xb8885a, 1.5, 0.2);
    ln(g, ax + 1, ay + 1, bx + 1, by + 1, 0xd4a878, 1.0, 0.1);
  }
  // Vertical plank seams (staggered)
  for (let j = 0; j < rows; j++) {
    const offset = (j % 3) * 2;
    for (let i = 1 + offset; i < cols; i += 3) {
      const [ax, ay] = proj(i, j, 0),
        [bx, by] = proj(i, j + 1, 0);
      ln(g, ax, ay, bx, by, 0xa07848, 1.0, 0.15);
    }
  }

  // ── Floor edges + baseboard ─────────────────────────────────────────────
  qfill(
    g,
    [proj(0, 0, 0), proj(cols, 0, 0), proj(cols, 0, -0.28), proj(0, 0, -0.28)],
    0x9b6b3a,
    0.85,
  );
  qfill(
    g,
    [proj(cols, 0, 0), proj(cols, rows, 0), proj(cols, rows, -0.28), proj(cols, 0, -0.28)],
    0x8b5b2a,
    0.78,
  );
  qstroke(
    g,
    [proj(0, 0, 0.01), proj(cols, 0, 0.01), proj(cols, rows, 0.01), proj(0, rows, 0.01)],
    0x7a4a20,
    1.8,
    0.4,
  );

  // ── Back wall ────────────────────────────────────────────────────────────
  // Baseboard
  qfill(
    g,
    [proj(0, rows, 0), proj(cols, rows, 0), proj(cols, rows, 0.22), proj(0, rows, 0.22)],
    0xb07050,
  );
  qstroke(
    g,
    [proj(0, rows, 0.22), proj(cols, rows, 0.22), proj(cols, rows, 0.24), proj(0, rows, 0.24)],
    0xd49070,
    1.0,
    0.5,
  );
  // Wainscoting (lower wall — rose wood)
  qfill(
    g,
    [
      proj(0, rows, 0.22),
      proj(cols, rows, 0.22),
      proj(cols, rows, WAINSCOT_H),
      proj(0, rows, WAINSCOT_H),
    ],
    0xf0d8c8,
  );
  // Wainscoting panel lines
  for (let x = 1; x < cols; x += 2) {
    const [px1, py1] = proj(x, rows, 0.25),
      [px2, py2] = proj(x, rows, WAINSCOT_H);
    ln(g, px1, py1, px2, py2, 0xe0c0b0, 1.2, 0.25);
  }
  // Chair rail (transition between wainscoting and wallpaper)
  qfill(
    g,
    [
      proj(0, rows, WAINSCOT_H - 0.06),
      proj(cols, rows, WAINSCOT_H - 0.06),
      proj(cols, rows, WAINSCOT_H + 0.08),
      proj(0, rows, WAINSCOT_H + 0.08),
    ],
    0xd4a088,
  );
  qstroke(
    g,
    [proj(0, rows, WAINSCOT_H + 0.08), proj(cols, rows, WAINSCOT_H + 0.08)],
    0xe8b898,
    1.5,
    0.6,
  );
  // Wallpaper (upper wall — sakura with dot pattern)
  qfill(
    g,
    [
      proj(0, rows, WAINSCOT_H + 0.08),
      proj(cols, rows, WAINSCOT_H + 0.08),
      proj(cols, rows, 4.5),
      proj(0, rows, 4.5),
    ],
    0xfff5f8,
  );
  // Wallpaper dot pattern
  for (let x = 1; x < cols; x++) {
    for (let z = WAINSCOT_H + 0.4; z < 4.3; z += 0.7) {
      const [dx, dy] = proj(x + (Math.floor(z * 10) % 2) * 0.5, rows - 0.01, z);
      g.beginFill(0xffdde8, 0.4).drawCircle(dx, dy, 1.2).endFill();
    }
  }
  // Crown molding
  qfill(
    g,
    [proj(0, rows, 4.0), proj(cols, rows, 4.0), proj(cols, rows, 4.18), proj(0, rows, 4.18)],
    0xe8c0a8,
  );
  qfill(
    g,
    [proj(0, rows, 4.18), proj(cols, rows, 4.18), proj(cols, rows, 4.3), proj(0, rows, 4.3)],
    0xd4a080,
  );
  qfill(
    g,
    [proj(0, rows, 4.3), proj(cols, rows, 4.3), proj(cols, rows, 4.5), proj(0, rows, 4.5)],
    0xffb7c5,
  );

  // ── Wallpaper pattern (varies by theme) ──────────────────────────────────
  const wpPattern = theme?.wallpaperPattern ?? 'sakura';
  const wpC1 = theme?.wallpaperColor1 ?? 0xffdde8;
  const wpC2 = theme?.wallpaperColor2 ?? 0xffe4e9;
  const backDotCount = Math.max(3, Math.ceil((cols * 12) / ROOM_TILES_X));

  if (wpPattern === 'stars') {
    // Night — scattered stars and dots
    for (let fi = 0; fi < backDotCount + 4; fi++) {
      const fwx = 0.5 + (fi * cols) / (backDotCount + 3);
      const fwz = WAINSCOT_H + 0.5 + (fi % 4) * 0.7;
      const [fpx, fpy] = proj(fwx, rows - 0.01, fwz);
      // Small stars (4-point sparkles)
      const sz = 1.5 + (fi % 3) * 1.0;
      for (let p = 0; p < 4; p++) {
        const angle = (p / 4) * Math.PI * 2;
        g.beginFill(wpC2, 0.5 + (fi % 3) * 0.2);
        g.drawEllipse(fpx + Math.cos(angle) * 3, fpy + Math.sin(angle) * 2, sz, sz * 0.5);
        g.endFill();
      }
      g.beginFill(wpC1, 0.4).drawCircle(fpx, fpy, 1.0).endFill();
    }
  } else if (wpPattern === 'hearts') {
    // Dawn — scattered hearts
    for (let fi = 0; fi < backDotCount; fi++) {
      const fwx = 0.5 + (fi * cols) / (backDotCount + 1);
      const fwz = WAINSCOT_H + 0.5 + (fi % 3) * 0.8;
      const [fpx, fpy] = proj(fwx, rows - 0.01, fwz);
      const hc = [wpC1, wpC2, 0xffe4d0][fi % 3]!;
      // Simple heart: two circles + triangle
      g.beginFill(hc, 0.5);
      g.drawCircle(fpx - 2, fpy - 1, 2.5);
      g.drawCircle(fpx + 2, fpy - 1, 2.5);
      g.moveTo(fpx - 4, fpy + 1);
      g.lineTo(fpx, fpy + 4);
      g.lineTo(fpx + 4, fpy + 1);
      g.closePath();
      g.endFill();
    }
  } else if (wpPattern === 'stripe') {
    // Afternoon — subtle vertical stripes
    const stripeSpacing = cols / (backDotCount + 2);
    for (let fi = 0; fi <= backDotCount + 2; fi++) {
      const fwx = 0.3 + fi * stripeSpacing;
      const [px1, py1] = proj(fwx, rows - 0.01, WAINSCOT_H + 0.2);
      const [px2, py2] = proj(fwx, rows - 0.01, 3.9);
      ln(g, px1, py1, px2, py2, wpC1, 1.5, 0.15 + (fi % 3) * 0.05);
    }
  } else if (wpPattern === 'maple') {
    // Dusk — maple-like leaf dots
    for (let fi = 0; fi < backDotCount + 2; fi++) {
      const fwx = 1.0 + (fi * (cols - 2)) / (backDotCount + 1);
      const fwz = WAINSCOT_H + 0.5 + (fi % 3) * 0.8;
      const [fpx, fpy] = proj(fwx, rows - 0.01, fwz);
      const mc = [wpC1, wpC2, 0xffd4a0][fi % 3]!;
      for (let p = 0; p < 5; p++) {
        const angle = (p / 5) * Math.PI * 2;
        g.beginFill(mc, 0.5);
        g.drawEllipse(fpx + Math.cos(angle) * 3.5, fpy + Math.sin(angle) * 3, 3, 2);
        g.endFill();
      }
      g.beginFill(0xffe4b5, 0.6).drawCircle(fpx, fpy, 2).endFill();
    }
  } else {
    // Sakura (morning / default) — classic blossoms
    const backSpacing = cols / backDotCount;
    for (let fi = 0; fi < backDotCount; fi++) {
      const fwx = backSpacing * (fi + 0.5),
        fwz = WAINSCOT_H + 0.6 + (fi % 3) * 0.9;
      const [fpx, fpy] = proj(fwx, rows - 0.01, fwz);
      const fc = [wpC1, wpC2, 0xffd1dc, 0xffe4e9][fi % 4]!;
      for (let p = 0; p < 5; p++) {
        const angle = (p / 5) * Math.PI * 2 - Math.PI / 2;
        g.beginFill(fc, 0.7)
          .drawEllipse(fpx + Math.cos(angle) * 5, fpy + Math.sin(angle) * 4.5, 4, 2.5)
          .endFill();
      }
      g.beginFill(0xffe4b5, 0.85).drawCircle(fpx, fpy, 2.5).endFill();
    }
  }

  // ── Window on back wall ──────────────────────────────────────────────────
  // Arched window centered on back wall, with sky-colored glass and floor glow
  const winW = 2.8;                    // window width in world units
  const winH = 2.2;                    // window height
  const winX = (cols - winW) / 2;      // centered horizontally
  const winZ = WAINSCOT_H + 0.35;      // bottom of window above chair rail
  const winTopZ = winZ + winH;         // top of window arch
  const winWy = rows - 0.02;           // flush with back wall

  // Window frame — dark wood outer
  qfill(g, [
    proj(winX - 0.08, winWy, winZ - 0.06),
    proj(winX + winW + 0.08, winWy, winZ - 0.06),
    proj(winX + winW + 0.08, winWy, winTopZ + 0.08),
    proj(winX - 0.08, winWy, winTopZ + 0.08),
  ], 0x5a3a28);

  // Window glass — sky color from theme
  if (theme) {
    const skyHex = parseInt(theme.skyTop.replace('#', ''), 16);
    qfill(g, [
      proj(winX, winWy, winZ),
      proj(winX + winW, winWy, winZ),
      proj(winX + winW, winWy, winTopZ),
      proj(winX, winWy, winTopZ),
    ], skyHex, 0.65);
  } else {
    // No theme — neutral blue sky
    qfill(g, [
      proj(winX, winWy, winZ),
      proj(winX + winW, winWy, winZ),
      proj(winX + winW, winWy, winTopZ),
      proj(winX, winWy, winTopZ),
    ], 0xd0e8ff, 0.6);
  }

  // Window mullions (cross bars)
  const mullionColor = 0x4a2a18;
  // Vertical center bar
  const [vx1, vy1] = proj(winX + winW / 2, winWy, winZ);
  const [vx2, vy2] = proj(winX + winW / 2, winWy, winTopZ);
  ln(g, vx1, vy1, vx2, vy2, mullionColor, 2.2, 0.7);
  // Horizontal bar
  const midZ = winZ + winH * 0.55;
  const [hx1, hy1] = proj(winX, winWy, midZ);
  const [hx2, hy2] = proj(winX + winW, winWy, midZ);
  ln(g, hx1, hy1, hx2, hy2, mullionColor, 2.0, 0.6);

  // Inner frame trim
  qstroke(g, [
    proj(winX + 0.04, winWy, winZ + 0.04),
    proj(winX + winW - 0.04, winWy, winZ + 0.04),
    proj(winX + winW - 0.04, winWy, winTopZ - 0.04),
    proj(winX + 0.04, winWy, winTopZ - 0.04),
  ], 0x8b6b4a, 1.5, 0.5);

  // Window glow on floor (light cast from window)
  if (theme && theme.windowGlowAlpha > 0) {
    // Floor glow — trapezoid extending from window toward center of room
    const glowY = rows * 0.6;
    qfill(g, [
      proj(winX - 0.2, winWy, 0.01),
      proj(winX + winW + 0.2, winWy, 0.01),
      proj(winX + winW + 1.0, glowY, 0.01),
      proj(winX - 1.0, glowY, 0.01),
    ], theme.windowGlow, theme.windowGlowAlpha * 0.5);
    // Softer wider glow
    qfill(g, [
      proj(winX - 0.5, winWy, 0.01),
      proj(winX + winW + 0.5, winWy, 0.01),
      proj(winX + winW + 1.8, glowY, 0.01),
      proj(winX - 1.8, glowY, 0.01),
    ], theme.windowGlow, theme.windowGlowAlpha * 0.25);
  }

  // ── Left wall ────────────────────────────────────────────────────────────
  // Baseboard
  qfill(g, [proj(0, 0, 0), proj(0, rows, 0), proj(0, rows, 0.22), proj(0, 0, 0.22)], 0xb07050);
  // Wainscoting
  qfill(
    g,
    [proj(0, 0, 0.22), proj(0, rows, 0.22), proj(0, rows, WAINSCOT_H), proj(0, 0, WAINSCOT_H)],
    0xf5e0d0,
  );
  for (let y = 1; y < rows; y += 2) {
    const [px1, py1] = proj(0, y, 0.25),
      [px2, py2] = proj(0, y, WAINSCOT_H);
    ln(g, px1, py1, px2, py2, 0xe8d0c0, 1.0, 0.2);
  }
  // Chair rail
  qfill(
    g,
    [
      proj(0, 0, WAINSCOT_H - 0.06),
      proj(0, rows, WAINSCOT_H - 0.06),
      proj(0, rows, WAINSCOT_H + 0.08),
      proj(0, 0, WAINSCOT_H + 0.08),
    ],
    0xd4a088,
  );
  // Wallpaper
  qfill(
    g,
    [
      proj(0, 0, WAINSCOT_H + 0.08),
      proj(0, rows, WAINSCOT_H + 0.08),
      proj(0, rows, 4.5),
      proj(0, 0, 4.5),
    ],
    0xfff8fa,
  );
  // Crown molding
  qfill(g, [proj(0, 0, 4.0), proj(0, rows, 4.0), proj(0, rows, 4.18), proj(0, 0, 4.18)], 0xe8c0a8);
  qfill(g, [proj(0, 0, 4.18), proj(0, rows, 4.18), proj(0, rows, 4.5), proj(0, 0, 4.5)], 0xffb7c5);
  // 🌸 Sakura on left wall
  const leftFlowerCount = Math.max(1, Math.ceil((rows * 8) / ROOM_TILES_Y));
  const leftSpacing = rows / leftFlowerCount;
  for (let fi = 0; fi < leftFlowerCount; fi++) {
    const fwy = leftSpacing * (fi + 0.5),
      fwz = WAINSCOT_H + 0.5 + (fi % 3) * 1.0;
    const [fpx, fpy] = proj(0.01, fwy, fwz);
    const fc = sakuraPink[fi % sakuraPink.length]!;
    for (let p = 0; p < 5; p++) {
      const angle = (p / 5) * Math.PI * 2 - Math.PI / 2;
      g.beginFill(fc, 0.6)
        .drawEllipse(fpx + Math.cos(angle) * 4, fpy + Math.sin(angle) * 3.5, 3.5, 2)
        .endFill();
    }
    g.beginFill(0xffe4b5, 0.8).drawCircle(fpx, fpy, 2).endFill();
  }

  // ── Area rug — soft pastel pink ─────────────────────────────────────────
  qfill(
    g,
    [
      proj(1.0, 1.35, 0.005),
      proj(6.0, 1.35, 0.005),
      proj(6.0, 6.65, 0.005),
      proj(1.0, 6.65, 0.005),
    ],
    0xffe8e8,
    0.38,
  );
  qstroke(
    g,
    [
      proj(1.0, 1.35, 0.005),
      proj(6.0, 1.35, 0.005),
      proj(6.0, 6.65, 0.005),
      proj(1.0, 6.65, 0.005),
    ],
    0xffc0cb,
    2.2,
    0.48,
  );
  qstroke(
    g,
    [
      proj(1.18, 1.55, 0.005),
      proj(5.82, 1.55, 0.005),
      proj(5.82, 6.45, 0.005),
      proj(1.18, 6.45, 0.005),
    ],
    0xffd0d8,
    1.2,
    0.32,
  );
  // Heart decoration in rug center
  const [rugCX, rugCY] = proj(3.5, 4.0, 0.006);
  g.beginFill(0xffb7c5, 0.4)
    .drawEllipse(rugCX - 3, rugCY - 4, 7, 5)
    .endFill();
  g.beginFill(0xffb7c5, 0.4)
    .drawEllipse(rugCX + 3, rugCY - 4, 7, 5)
    .endFill();
  g.beginFill(0xffb7c5, 0.35)
    .drawPolygon([rugCX - 8, rugCY - 2, rugCX, rugCY - 12, rugCX + 8, rugCY - 2])
    .endFill();

  // ── Door + Window (left wall features) ───────────────────────────────────
  const featureMaxY = Math.max(0, rows - 1);
  const wallY = (wy: number) => Math.max(0, Math.min(featureMaxY, wy));
  const leftWallRect = (
    y1: number,
    y2: number,
    z1: number,
    z2: number,
    color: number,
    alpha = 1,
  ) => {
    const cy1 = wallY(y1),
      cy2 = wallY(y2);
    if (cy2 - cy1 <= 0.05) return false;
    qfill(
      g,
      [proj(0, cy1, z1), proj(0, cy2, z1), proj(0, cy2, z2), proj(0, cy1, z2)],
      color,
      alpha,
    );
    return true;
  };
  // Door
  if (leftWallRect(0.6, 2.2, 0, 3.0, 0xc07050)) {
    leftWallRect(0.68, 2.12, 0.04, 2.94, 0xe8a080);
    leftWallRect(0.72, 2.08, 1.8, 2.88, 0xfff0f5, 0.88);
    const [twx, twy] = proj(0, wallY(1.4), 2.3);
    g.beginFill(0x8b5c38, 0.75)
      .drawRect(twx - 1.5, twy, 3, 22)
      .endFill();
    for (let bi = 0; bi < 8; bi++) {
      const ang = (bi / 8) * Math.PI * 2;
      g.beginFill(0xffb7c5, 0.8)
        .drawCircle(twx + Math.cos(ang) * 9, twy - 5 + Math.sin(ang) * 5, 5)
        .endFill();
    }
    g.beginFill(0xff69b4, 0.65)
      .drawCircle(twx, twy - 8, 8)
      .endFill();
    leftWallRect(0.72, 2.08, 0.1, 1.72, 0xd08060, 0.85);
    const [dkx, dky] = proj(0, wallY(1.8), 1.2);
    g.beginFill(0xffd700, 1).drawCircle(dkx, dky, 3.5).endFill();
  }
  // Window
  if (leftWallRect(3.0, 5.4, 0.6, 3.6, 0xffe4e1, 0.6)) {
    const frameY1 = wallY(2.8),
      frameY2 = wallY(5.6);
    qstroke(
      g,
      [proj(0, frameY1, 0.4), proj(0, frameY2, 0.4), proj(0, frameY2, 3.8), proj(0, frameY1, 3.8)],
      0xd4a0a0,
      3.5,
      0.9,
    );
    const [wdx1, wdy1] = proj(0, wallY(4.2), 0.4),
      [wdx2, wdy2] = proj(0, wallY(4.2), 3.8);
    ln(g, wdx1, wdy1, wdx2, wdy2, 0xd4a0a0, 2.5, 0.8);
    const [whx1, why1] = proj(0, frameY1, 2.1),
      [whx2, why2] = proj(0, frameY2, 2.1);
    ln(g, whx1, why1, whx2, why2, 0xd4a0a0, 2.5, 0.8);
    leftWallRect(2.68, 3.08, 0.35, 3.85, 0xffb7c5, 0.75);
    leftWallRect(5.32, 5.72, 0.35, 3.85, 0xffb7c5, 0.75);
  }

  // ── Wall lamp — warm golden glow ─────────────────────────────────────────
  const [wlx, wly] = proj(0.01, 1.4, 3.6);
  g.beginFill(0xd4a060, 1)
    .drawRect(wlx - 4, wly - 22, 8, 10)
    .endFill();
  g.beginFill(0xffe8c0, 1)
    .drawPolygon([wlx - 12, wly - 12, wlx + 12, wly - 12, wlx + 8, wly, wlx - 8, wly])
    .endFill();
  g.beginFill(0xffdab9, 0.1)
    .drawCircle(wlx, wly - 8, 30)
    .endFill();

  // ── Floating petals ──────────────────────────────────────────────────────
  const airPetals = [
    [2.0, 2.5, 1.8],
    [5.0, 3.0, 2.2],
    [3.5, 5.0, 1.5],
    [7.0, 4.0, 2.0],
    [1.5, 6.0, 2.5],
    [8.0, 5.5, 1.6],
    [4.5, 1.5, 2.8],
    [6.5, 6.5, 1.2],
  ];
  for (const [px, py, pz] of airPetals) {
    const [apx, apy] = proj(px!, py!, pz!);
    const apc = sakuraPink[Math.floor((px! + py!) % sakuraPink.length)]!;
    g.beginFill(apc, 0.35).drawEllipse(apx, apy, 3, 1.5).endFill();
  }

  // ── Time theme tint ──────────────────────────────────────────────────────
  if (theme) {
    if (theme.floorTintAlpha > 0)
      qfill(
        g,
        [proj(0, 0, 0), proj(cols, 0, 0), proj(cols, rows, 0), proj(0, rows, 0)],
        theme.floorTint,
        theme.floorTintAlpha,
      );
    if (theme.wallTintAlpha > 0) {
      qfill(
        g,
        [proj(0, rows, 0), proj(cols, rows, 0), proj(cols, rows, 4.5), proj(0, rows, 4.5)],
        theme.wallTint,
        theme.wallTintAlpha,
      );
      qfill(
        g,
        [proj(0, 0, 0), proj(0, rows, 0), proj(0, rows, 4.5), proj(0, 0, 4.5)],
        theme.wallTint,
        theme.wallTintAlpha,
      );
    }
  }
}

// ─── Individual furniture draw functions ──────────────────────────────────────

export function drawBed(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  const W = 4.0,
    D = 5.0;
  qfill(
    g,
    [
      proj(wx, wy, 0.002),
      proj(wx + W, wy, 0.002),
      proj(wx + W, wy + D, 0.002),
      proj(wx, wy + D, 0.002),
    ],
    0x000000,
    0.1,
  );
  isoBox(g, wx, wy, wz, W, D, 0.38, 0x3e2010, 0x2e1808, 0x241208);
  isoBox(
    g,
    wx + 0.06,
    wy + 0.06,
    wz + 0.38,
    W - 0.12,
    D - 0.12,
    0.42,
    0xf0ecff,
    0xe8e4f5,
    0xe0dcee,
  );
  isoBox(g, wx + 0.12, wy + 1.88, wz + 0.8, W - 0.24, 2.95, 0.14, 0x4a7ab5, 0x3a6098, 0x2e5080);
  qfill(
    g,
    [
      proj(wx + 0.12, wy + 1.88, wz + 0.94),
      proj(wx + W - 0.12, wy + 1.88, wz + 0.94),
      proj(wx + W - 0.12, wy + 1.88, wz + 0.8),
      proj(wx + 0.12, wy + 1.88, wz + 0.8),
    ],
    0x5a8ac5,
  );
  isoBox(g, wx + 0.18, wy + 0.1, wz + 0.8, 1.48, 1.1, 0.28, 0xfafaff, 0xeeeaff, 0xe0d8f0);
  isoBox(g, wx + 2.28, wy + 0.1, wz + 0.8, 1.48, 1.1, 0.28, 0xfafaff, 0xeeeaff, 0xe0d8f0);
  isoBox(g, wx, wy, wz + 0.38, W, 0.18, 1.15, 0x5c3818, 0x4a2c10, 0x3c2208);
  isoBox(g, wx, wy + D - 0.32, wz + 0.38, W, 0.18, 0.58, 0x5c3818, 0x4a2c10, 0x3c2208);
  const [bfx, bfy] = proj(wx + W / 2, wy + 3.0, wz + 0.95);
  g.beginFill(0x8ab4e0, 0.45).drawCircle(bfx, bfy, 5).endFill();
  [
    [-9, 0],
    [9, 0],
    [0, -9],
    [0, 9],
  ].forEach(([dx, dy]) =>
    g
      .beginFill(0x8ab4e0, 0.32)
      .drawCircle(bfx + dx!, bfy + dy!, 3.5)
      .endFill(),
  );
}

export function drawNightstand(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  isoBox(g, wx, wy, wz, 1.0, 1.0, 0.6, 0x5c3818, 0x4a2c10, 0x3c2208);
  qfill(
    g,
    [
      proj(wx, wy, wz + 0.22),
      proj(wx + 1.0, wy, wz + 0.22),
      proj(wx + 1.0, wy, wz + 0.48),
      proj(wx, wy, wz + 0.48),
    ],
    0x000000,
    0.12,
  );
  const [nsx, nsy] = proj(wx + 0.5, wy, wz + 0.35);
  g.beginFill(0xd4af37, 1).drawCircle(nsx, nsy, 2).endFill();
  const [nlx, nly] = proj(wx + 0.3, wy + 0.2, wz + 0.62);
  g.beginFill(0x8b6914, 1)
    .drawRect(nlx - 9, nly - 24, 18, 24)
    .endFill();
  g.beginFill(0xfde68a, 0.88)
    .drawRect(nlx - 6, nly - 21, 12, 17)
    .endFill();
  g.beginFill(0x8b6914, 1)
    .drawPolygon([nlx - 7, nly - 24, nlx, nly - 31, nlx + 7, nly - 24])
    .endFill();
  g.beginFill(0xffd070, 0.13)
    .drawCircle(nlx, nly - 12, 30)
    .endFill();
}

export function drawTVStand(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  isoBox(g, wx, wy, wz, 4.0, 1.0, 0.85, 0x5c3818, 0x4a2c10, 0x3c2208);
  for (let di = 0; di < 2; di++) {
    const dwx = wx + 0.4 + di * 1.85;
    const [dhx, dhy] = proj(dwx + 0.6, wy, wz + 0.42);
    g.beginFill(0x2a1408, 0.5)
      .drawRect(dhx - 12, dhy - 4, 24, 8)
      .endFill();
    g.beginFill(0xd4af37, 1).drawCircle(dhx, dhy, 2.5).endFill();
  }
  const [gcx, gcy] = proj(wx + 3.1, wy, wz + 0.87);
  g.beginFill(0x1a1a2e, 0.85)
    .drawRect(gcx - 14, gcy - 7, 28, 14)
    .endFill();
  g.beginFill(0xe74c3c, 1)
    .drawCircle(gcx + 5, gcy - 1, 2.5)
    .endFill();
  g.beginFill(0x3498db, 1)
    .drawCircle(gcx + 9, gcy + 2, 2)
    .endFill();
  const [pfx, pfy] = proj(wx + 0.2, wy, wz + 0.87);
  g.beginFill(0x8b5c28, 1)
    .drawRect(pfx - 8, pfy - 12, 16, 16)
    .endFill();
  g.beginFill(0x4a7ab0, 1)
    .drawRect(pfx - 6, pfy - 10, 12, 12)
    .endFill();
}

export function drawTV(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  isoBox(g, wx + 1.1, wy + 0.1, wz, 1.8, 0.12, 0.12, 0x1a1a1a, 0x111111);
  isoBox(g, wx, wy, wz, 4.0, 0.12, 2.1, 0x141414, 0x1c1c1c, 0x101010);
  qfill(
    g,
    [
      proj(wx + 0.08, wy - 0.02, wz + 0.05),
      proj(wx + 3.92, wy - 0.02, wz + 0.05),
      proj(wx + 3.92, wy - 0.02, wz + 2.0),
      proj(wx + 0.08, wy - 0.02, wz + 2.0),
    ],
    0x1a3a70,
  );
  qfill(
    g,
    [
      proj(wx + 0.14, wy - 0.03, wz + 0.1),
      proj(wx + 3.86, wy - 0.03, wz + 0.1),
      proj(wx + 3.86, wy - 0.03, wz + 1.95),
      proj(wx + 0.14, wy - 0.03, wz + 1.95),
    ],
    0x2855a8,
    0.8,
  );
}

export function drawComputerDesk(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  qfill(
    g,
    [
      proj(wx, wy, 0.002),
      proj(wx + 3.0, wy, 0.002),
      proj(wx + 3.0, wy + 2.0, 0.002),
      proj(wx, wy + 2.0, 0.002),
    ],
    0x000000,
    0.12,
  );
  isoBox(g, wx, wy, wz, 3.0, 2.0, 0.72, 0x6a4122, 0x563019, 0x442413);
  isoBox(g, wx + 0.08, wy + 0.08, wz + 0.72, 2.84, 1.84, 0.08, 0x8b5a2b, 0x71431f, 0x5a3418);
  isoBox(g, wx + 0.18, wy + 0.18, wz, 0.16, 0.16, 0.72, 0x3c2208, 0x2a1608, 0x241208);
  isoBox(g, wx + 2.66, wy + 0.18, wz, 0.16, 0.16, 0.72, 0x3c2208, 0x2a1608, 0x241208);
  isoBox(g, wx + 0.18, wy + 1.62, wz, 0.16, 0.16, 0.72, 0x3c2208, 0x2a1608, 0x241208);
  isoBox(g, wx + 2.66, wy + 1.62, wz, 0.16, 0.16, 0.72, 0x3c2208, 0x2a1608, 0x241208);

  qfill(
    g,
    [
      proj(wx + 0.38, wy + 1.52, wz + 0.9),
      proj(wx + 1.72, wy + 1.52, wz + 0.9),
      proj(wx + 1.72, wy + 1.52, wz + 1.8),
      proj(wx + 0.38, wy + 1.52, wz + 1.8),
    ],
    0x172033,
  );
  qfill(
    g,
    [
      proj(wx + 0.45, wy + 1.5, wz + 0.98),
      proj(wx + 1.65, wy + 1.5, wz + 0.98),
      proj(wx + 1.65, wy + 1.5, wz + 1.7),
      proj(wx + 0.45, wy + 1.5, wz + 1.7),
    ],
    0x2f80ed,
    0.88,
  );
  qstroke(
    g,
    [
      proj(wx + 0.45, wy + 1.495, wz + 0.98),
      proj(wx + 1.65, wy + 1.495, wz + 0.98),
      proj(wx + 1.65, wy + 1.495, wz + 1.7),
      proj(wx + 0.45, wy + 1.495, wz + 1.7),
    ],
    0xbce7ff,
    1,
    0.5,
  );
  const [line1x, line1y] = proj(wx + 0.58, wy + 1.48, wz + 1.5);
  ln(g, line1x, line1y, line1x + 32, line1y - 4, 0x99ffcc, 2, 0.8);
  const [line2x, line2y] = proj(wx + 0.58, wy + 1.48, wz + 1.35);
  ln(g, line2x, line2y, line2x + 22, line2y - 3, 0xe7f0ff, 2, 0.65);
  isoBox(g, wx + 0.9, wy + 1.34, wz + 0.78, 0.26, 0.22, 0.22, 0x172033, 0x0f172a, 0x0b1020);

  qfill(
    g,
    [
      proj(wx + 0.34, wy + 0.42, wz + 0.83),
      proj(wx + 1.86, wy + 0.42, wz + 0.83),
      proj(wx + 1.86, wy + 0.76, wz + 0.83),
      proj(wx + 0.34, wy + 0.76, wz + 0.83),
    ],
    0x202a38,
    0.95,
  );
  for (let ki = 0; ki < 8; ki++) {
    const [kx, ky] = proj(wx + 0.5 + ki * 0.16, wy + 0.43, wz + 0.84);
    g.beginFill(0xd8e5f0, 0.58)
      .drawRect(kx - 3, ky - 2, 5, 3)
      .endFill();
  }
  qfill(
    g,
    [
      proj(wx + 1.98, wy + 0.42, wz + 0.84),
      proj(wx + 2.68, wy + 0.42, wz + 0.84),
      proj(wx + 2.68, wy + 1.05, wz + 0.84),
      proj(wx + 1.98, wy + 1.05, wz + 0.84),
    ],
    0xf6ead7,
    0.95,
  );
  qstroke(
    g,
    [
      proj(wx + 1.98, wy + 0.42, wz + 0.845),
      proj(wx + 2.68, wy + 0.42, wz + 0.845),
      proj(wx + 2.68, wy + 1.05, wz + 0.845),
      proj(wx + 1.98, wy + 1.05, wz + 0.845),
    ],
    0x4a5568,
    1,
    0.28,
  );
  const [mugX, mugY] = proj(wx + 2.7, wy + 1.24, wz + 0.86);
  g.beginFill(0x90cdf4, 1).drawCircle(mugX, mugY, 6).endFill();
  g.lineStyle(2, 0x90cdf4, 0.9).drawCircle(mugX + 6, mugY - 2, 3);
}

export function drawPrinter(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  qfill(
    g,
    [
      proj(wx, wy, 0.002),
      proj(wx + 1.0, wy, 0.002),
      proj(wx + 1.0, wy + 1.0, 0.002),
      proj(wx, wy + 1.0, 0.002),
    ],
    0x000000,
    0.1,
  );
  isoBox(g, wx, wy, wz, 1.0, 1.0, 0.64, 0xd8dee9, 0xaeb8c6, 0x94a3b8);
  isoBox(g, wx + 0.08, wy + 0.08, wz + 0.64, 0.84, 0.84, 0.25, 0xf8fafc, 0xcbd5e1, 0xb8c4d4);
  qfill(
    g,
    [
      proj(wx + 0.16, wy + 0.18, wz + 0.9),
      proj(wx + 0.78, wy + 0.18, wz + 0.9),
      proj(wx + 0.78, wy + 0.68, wz + 0.9),
      proj(wx + 0.16, wy + 0.68, wz + 0.9),
    ],
    0x334155,
    0.9,
  );
  qfill(
    g,
    [
      proj(wx + 0.14, wy, wz + 0.2),
      proj(wx + 0.86, wy, wz + 0.2),
      proj(wx + 0.86, wy, wz + 0.44),
      proj(wx + 0.14, wy, wz + 0.44),
    ],
    0x64748b,
    0.82,
  );
  qfill(
    g,
    [
      proj(wx + 0.2, wy - 0.02, wz + 0.08),
      proj(wx + 0.82, wy - 0.02, wz + 0.08),
      proj(wx + 0.82, wy - 0.02, wz + 0.28),
      proj(wx + 0.2, wy - 0.02, wz + 0.28),
    ],
    0xf8fafc,
    0.9,
  );
  const [ledX, ledY] = proj(wx + 0.82, wy + 0.02, wz + 0.55);
  g.beginFill(0x34d399, 1).drawCircle(ledX, ledY, 3).endFill();
}

export function drawDocumentBoard(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  qfill(
    g,
    [
      proj(wx, wy, wz),
      proj(wx + 3.0, wy, wz),
      proj(wx + 3.0, wy, wz + 1.6),
      proj(wx, wy, wz + 1.6),
    ],
    0x6b4020,
  );
  qfill(
    g,
    [
      proj(wx + 0.08, wy - 0.01, wz + 0.08),
      proj(wx + 2.92, wy - 0.01, wz + 0.08),
      proj(wx + 2.92, wy - 0.01, wz + 1.52),
      proj(wx + 0.08, wy - 0.01, wz + 1.52),
    ],
    0xf7edd0,
    0.96,
  );
  qstroke(
    g,
    [
      proj(wx + 0.08, wy - 0.015, wz + 0.08),
      proj(wx + 2.92, wy - 0.015, wz + 0.08),
      proj(wx + 2.92, wy - 0.015, wz + 1.52),
      proj(wx + 0.08, wy - 0.015, wz + 1.52),
    ],
    0x7a4518,
    1.3,
    0.75,
  );
  [wx + 1.0, wx + 2.0].forEach((lineX) => {
    const [aX, aY] = proj(lineX, wy - 0.02, wz + 0.18),
      [bX, bY] = proj(lineX, wy - 0.02, wz + 1.42);
    ln(g, aX, aY, bX, bY, 0x94a3b8, 1, 0.45);
  });
  [wz + 0.56, wz + 1.04].forEach((lineZ) => {
    const [aX, aY] = proj(wx + 0.18, wy - 0.02, lineZ),
      [bX, bY] = proj(wx + 2.82, wy - 0.02, lineZ);
    ln(g, aX, aY, bX, bY, 0x94a3b8, 1, 0.42);
  });
  const notes = [
    { x: 0.24, z: 0.24, w: 0.48, h: 0.34, c: 0xfde68a },
    { x: 1.08, z: 0.68, w: 0.55, h: 0.38, c: 0x93c5fd },
    { x: 1.98, z: 1.06, w: 0.5, h: 0.34, c: 0xfca5a5 },
    { x: 2.04, z: 0.28, w: 0.42, h: 0.32, c: 0x86efac },
  ];
  notes.forEach((note) => {
    qfill(
      g,
      [
        proj(wx + note.x, wy - 0.03, wz + note.z),
        proj(wx + note.x + note.w, wy - 0.03, wz + note.z),
        proj(wx + note.x + note.w, wy - 0.03, wz + note.z + note.h),
        proj(wx + note.x, wy - 0.03, wz + note.z + note.h),
      ],
      note.c,
      0.92,
    );
  });
  const [pinX, pinY] = proj(wx + 1.4, wy - 0.04, wz + 1.45);
  g.beginFill(0xef4444, 1).drawCircle(pinX, pinY, 4).endFill();
}

export function drawBookcase(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  isoBox(g, wx, wy, wz, 3.0, 1.0, 3.6, 0x5c3818, 0x4a2c10, 0x3c2208);
  [0.72, 1.62, 2.52, 3.42].forEach((sh) => {
    qfill(
      g,
      [
        proj(wx, wy, sh),
        proj(wx + 3.0, wy, sh),
        proj(wx + 3.0, wy + 1.0, sh),
        proj(wx, wy + 1.0, sh),
      ],
      0x3c2208,
    );
  });
  const bkPalette = [
    0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0xe67e22, 0x1abc9c, 0xe91e63,
  ];
  [0.72, 1.62, 2.52].forEach((sh, ri) => {
    let bx2 = wx + 0.06;
    for (let bi = 0; bi < 8; bi++) {
      const bw = 0.26 + Math.sin(ri * 5 + bi) * 0.06,
        bh = 0.52 + Math.cos(ri * 2 + bi * 3) * 0.1;
      const bc = bkPalette[(ri * 4 + bi) % bkPalette.length]!;
      qfill(
        g,
        [
          proj(bx2, wy, sh + 0.05),
          proj(bx2 + bw, wy, sh + 0.05),
          proj(bx2 + bw, wy, sh + 0.05 + bh),
          proj(bx2, wy, sh + 0.05 + bh),
        ],
        bc,
      );
      qfill(
        g,
        [
          proj(bx2 + bw, wy, sh + 0.05),
          proj(bx2 + bw, wy + 1.0, sh + 0.05),
          proj(bx2 + bw, wy + 1.0, sh + 0.05 + bh),
          proj(bx2 + bw, wy, sh + 0.05 + bh),
        ],
        0x000000,
        0.25,
      );
      bx2 += bw + 0.05;
      if (bx2 > wx + 2.88) break;
    }
  });
  const [bpsx, bpsy] = proj(wx + 1.3, wy + 0.08, 3.6);
  g.beginFill(0x8b4513, 1)
    .drawRect(bpsx - 8, bpsy - 8, 16, 10)
    .endFill();
  g.beginFill(0x22a43a, 0.9)
    .drawCircle(bpsx, bpsy - 12, 9)
    .endFill();
  g.beginFill(0x1a8a2e, 0.85)
    .drawCircle(bpsx - 8, bpsy - 10, 7)
    .endFill();
  g.beginFill(0x2ecc71, 0.8)
    .drawCircle(bpsx + 7, bpsy - 10, 7)
    .endFill();
}

export function drawHangingScroll(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  qfill(
    g,
    [
      proj(wx, wy, wz + 1.35),
      proj(wx + 2.0, wy, wz + 1.35),
      proj(wx + 2.0, wy, wz + 1.5),
      proj(wx, wy, wz + 1.5),
    ],
    0x7a4518,
  );
  qfill(
    g,
    [
      proj(wx + 0.02, wy, wz + 0.0),
      proj(wx + 1.98, wy, wz + 0.0),
      proj(wx + 1.98, wy, wz + 1.35),
      proj(wx + 0.02, wy, wz + 1.35),
    ],
    0xfff8e8,
  );
  qstroke(
    g,
    [
      proj(wx + 0.02, wy, wz + 0.0),
      proj(wx + 1.98, wy, wz + 0.0),
      proj(wx + 1.98, wy, wz + 1.35),
      proj(wx + 0.02, wy, wz + 1.35),
    ],
    0xc8a040,
    1.2,
    0.5,
  );
  qfill(
    g,
    [
      proj(wx + 0.1, wy, wz + 0.08),
      proj(wx + 1.8, wy, wz + 0.08),
      proj(wx + 1.8, wy, wz + 1.28),
      proj(wx + 0.1, wy, wz + 1.28),
    ],
    0xfce8c0,
    0.6,
  );
  const [artX, artY] = proj(wx + 1.0, wy - 0.01, wz + 0.72);
  g.beginFill(0xe8942a, 0.8).drawEllipse(artX, artY, 14, 10).endFill();
  g.beginFill(0xe8942a, 0.8)
    .drawCircle(artX + 2, artY - 14, 9)
    .endFill();
  g.beginFill(0xe8942a, 0.75)
    .drawPolygon([artX - 4, artY - 20, artX, artY - 28, artX + 4, artY - 20])
    .endFill();
  g.beginFill(0xe8942a, 0.75)
    .drawPolygon([artX + 8, artY - 20, artX + 12, artY - 27, artX + 15, artY - 20])
    .endFill();
  g.beginFill(0xe8942a, 0.7)
    .drawEllipse(artX - 16, artY + 2, 8, 5)
    .endFill();
  [
    [artX - 22, artY - 5],
    [artX + 22, artY - 8],
    [artX - 18, artY + 12],
    [artX + 18, artY + 10],
  ].forEach(([lx, ly], li) => {
    g.beginFill([0xe07830, 0xd44020, 0xe8a830][li % 3]!, 0.65)
      .drawEllipse(lx!, ly!, 5, 3)
      .endFill();
  });
  qfill(
    g,
    [
      proj(wx, wy, wz - 0.06),
      proj(wx + 2.0, wy, wz - 0.06),
      proj(wx + 2.0, wy, wz + 0.08),
      proj(wx, wy, wz + 0.08),
    ],
    0x7a4518,
  );
  const [ss1x, ss1y] = proj(wx + 0.2, wy, wz + 1.5),
    [ss2x, ss2y] = proj(wx + 0.2, wy, wz + 1.75);
  ln(g, ss1x, ss1y, ss2x, ss2y, 0x7a4518, 1.5);
  const [ss3x, ss3y] = proj(wx + 1.7, wy, wz + 1.5),
    [ss4x, ss4y] = proj(wx + 1.7, wy, wz + 1.75);
  ln(g, ss3x, ss3y, ss4x, ss4y, 0x7a4518, 1.5);
}

export function drawWallShelf(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  qfill(
    g,
    [
      proj(wx, wy, wz),
      proj(wx + 3.0, wy, wz),
      proj(wx + 3.0, wy, wz + 0.18),
      proj(wx, wy, wz + 0.18),
    ],
    0x6b4020,
  );
  qfill(
    g,
    [
      proj(wx, wy, wz - 0.4),
      proj(wx, wy, wz),
      proj(wx + 0.16, wy, wz),
      proj(wx + 0.16, wy, wz - 0.4),
    ],
    0x5a3418,
  );
  qfill(
    g,
    [
      proj(wx + 2.84, wy, wz - 0.4),
      proj(wx + 2.84, wy, wz),
      proj(wx + 3.0, wy, wz),
      proj(wx + 3.0, wy, wz - 0.4),
    ],
    0x5a3418,
  );
  const shelfBks = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6];
  let sbx = wx + 0.05;
  shelfBks.forEach((bc, bi) => {
    const bw = 0.36 + (bi % 2) * 0.08,
      bh = 0.62 + Math.sin(bi) * 0.12;
    qfill(
      g,
      [
        proj(sbx, wy, wz + 0.18),
        proj(sbx + bw, wy, wz + 0.18),
        proj(sbx + bw, wy, wz + 0.18 + bh),
        proj(sbx, wy, wz + 0.18 + bh),
      ],
      bc,
    );
    sbx += bw + 0.07;
  });
  const [lsx, lsy] = proj(wx + 2.6, wy - 0.01, wz + 0.18);
  g.beginFill(0x8b6914, 1)
    .drawRect(lsx - 10, lsy - 26, 20, 26)
    .endFill();
  g.beginFill(0xfde68a, 0.9)
    .drawRect(lsx - 7, lsy - 23, 14, 20)
    .endFill();
  g.beginFill(0xffd070, 0.14)
    .drawCircle(lsx, lsy - 13, 22)
    .endFill();
  g.beginFill(0x8b6914, 1)
    .drawPolygon([lsx - 6, lsy - 26, lsx, lsy - 32, lsx + 6, lsy - 26])
    .endFill();
}

export function drawPoolTable(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  qfill(
    g,
    [
      proj(wx, wy, 0.002),
      proj(wx + 4.0, wy, 0.002),
      proj(wx + 4.0, wy + 3.0, 0.002),
      proj(wx, wy + 3.0, 0.002),
    ],
    0x000000,
    0.12,
  );
  isoBox(g, wx + 0.05, wy + 0.05, wz, 3.9, 2.9, 0.72, 0x5a3012, 0x4a2608, 0x3c1e06);
  isoBox(g, wx, wy, wz + 0.72, 4.0, 3.0, 0.1, 0x1a6b2a, 0x145520, 0x0f4018);
  qfill(
    g,
    [
      proj(wx, wy, wz + 0.82),
      proj(wx + 4.0, wy, wz + 0.82),
      proj(wx + 4.0, wy, wz + 0.85),
      proj(wx, wy, wz + 0.85),
    ],
    0x0d4015,
  );
  [
    [wx, wy],
    [wx + 4.0, wy],
    [wx, wy + 3.0],
    [wx + 4.0, wy + 3.0],
    [wx + 2.0, wy],
    [wx + 2.0, wy + 3.0],
  ].forEach(([px, py]) => {
    const [hx, hy] = proj(px!, py!, wz + 0.83);
    g.beginFill(0x0a2010, 1).drawCircle(hx, hy, 4).endFill();
  });
  const ballColors = [
    0xffffff, 0xf5c518, 0x2255cc, 0xdd2222, 0x7722aa, 0xff7700, 0x116611, 0xaa1111,
  ];
  const rb = { wx: wx + 2.32, wy: wy + 1.05 };
  const rackPos: [[number, number]][] = [
    [[rb.wx, rb.wy]],
    [[rb.wx - 0.22, rb.wy + 0.22]],
    [[rb.wx + 0.22, rb.wy + 0.22]],
    [[rb.wx - 0.44, rb.wy + 0.44]],
    [[rb.wx, rb.wy + 0.44]],
    [[rb.wx + 0.44, rb.wy + 0.44]],
  ];
  rackPos.forEach(([[bwx, bwy]], i) => {
    const [bpx, bpy] = proj(bwx, bwy, wz + 0.84);
    g.beginFill(ballColors[i % ballColors.length]!, 1)
      .drawCircle(bpx, bpy, 4.5)
      .endFill();
    g.beginFill(0xffffff, 0.4)
      .drawCircle(bpx - 1.5, bpy - 1.5, 1.5)
      .endFill();
  });
  const [cbx, cby] = proj(wx + 1.0, wy + 1.85, wz + 0.84);
  g.beginFill(0xffffff, 1).drawCircle(cbx, cby, 4.5).endFill();
  const [c1x, c1y] = proj(wx + 0.35, wy + 2.55, wz + 0.84),
    [c2x, c2y] = proj(wx + 3.4, wy + 0.72, wz + 0.84);
  ln(g, c1x, c1y, c2x, c2y, 0xd4a054, 3);
}

export function drawLowTable(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  isoBox(g, wx, wy, wz, 3.0, 2.0, 0.28, 0x7a5030, 0x6a4228, 0x5a3420);
  isoBox(g, wx + 0.06, wy + 0.02, wz + 0.28, 2.88, 1.96, 0.05, 0x3a7a9a, 0x2e6080, 0x245070);
  const [tpx, tpy] = proj(wx + 1.4, wy + 1.0, wz + 0.35);
  g.beginFill(0x1a1a1a, 1).drawCircle(tpx, tpy, 11).endFill();
  g.beginFill(0x222222, 1)
    .drawCircle(tpx, tpy - 11, 5)
    .endFill();
  g.lineStyle(3.5, 0x1a1a1a, 1)
    .moveTo(tpx + 8, tpy - 2)
    .lineTo(tpx + 18, tpy - 8);
  g.lineStyle(2.5, 0x1a1a1a, 1)
    .moveTo(tpx - 8, tpy - 5)
    .lineTo(tpx - 16, tpy - 10)
    .lineTo(tpx - 16, tpy + 2);
  [
    [wx + 0.4, wy + 1.1],
    [wx + 0.8, wy + 0.6],
    [wx + 1.9, wy + 0.5],
  ].forEach(([cwx, cwy]) => {
    const [cx, cy] = proj(cwx!, cwy!, wz + 0.34);
    g.beginFill(0x4a7a8a, 1).drawCircle(cx, cy, 6).endFill();
    g.beginFill(0xa0c8d0, 0.5)
      .drawCircle(cx, cy + 1, 2.5)
      .endFill();
  });
}

/** Drawn in its unrotated 3x1 footprint; drawFurnitureObject applies any rotation. */
export function drawZabuton(g: PIXI.Graphics, wx: number, wy: number, wz: number, variant?: string) {
  const { top, front, side } = zabutonPalette(variant);
  isoBox(g, wx, wy, wz, 3.0, 1.0, 0.18, top, front, side);
}

export function drawPlant(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  isoBox(g, wx, wy, wz, 1.0, 1.0, 0.62, 0xc04a2a, 0xa03818, 0x882e10);
  const [psx, psy] = proj(wx + 0.5, wy + 0.5, wz + 0.62);
  for (let li = 0; li < 7; li++) {
    const ang = (li / 7) * Math.PI * 2 - 0.3;
    const ex = psx + Math.cos(ang) * 24,
      ey = psy + Math.sin(ang) * 11 - 28;
    ln(g, psx, psy - 5, ex, ey, 0x1a7030, 2.2);
    g.beginFill(0x22a43a, 0.88).drawEllipse(ex, ey, 11, 7).endFill();
  }
  g.beginFill(0x1e8a34, 0.6)
    .drawCircle(psx, psy - 18, 14)
    .endFill();
}

// ─── Dispatch by furniture type ───────────────────────────────────────────────

export function drawFurnitureByType(
  g: PIXI.Graphics,
  type: string,
  wx: number,
  wy: number,
  wz: number,
  variant?: string,
) {
  switch (type) {
    case 'bed':
      drawBed(g, wx, wy, wz);
      break;
    case 'nightstand':
      drawNightstand(g, wx, wy, wz);
      break;
    case 'computer_desk':
      drawComputerDesk(g, wx, wy, wz);
      break;
    case 'printer':
      drawPrinter(g, wx, wy, wz);
      break;
    case 'document_board':
      drawDocumentBoard(g, wx, wy, wz);
      break;
    case 'tv_stand':
      drawTVStand(g, wx, wy, wz);
      break;
    case 'tv':
      drawTV(g, wx, wy, wz);
      break;
    case 'bookcase':
      drawBookcase(g, wx, wy, wz);
      break;
    case 'pool_table':
      drawPoolTable(g, wx, wy, wz);
      break;
    case 'low_table':
      drawLowTable(g, wx, wy, wz);
      break;
    case 'zabuton':
      drawZabuton(g, wx, wy, wz, variant);
      break;
    case 'plant':
      drawPlant(g, wx, wy, wz);
      break;
    case 'hanging_scroll':
      drawHangingScroll(g, wx, wy, wz);
      break;
    case 'wall_shelf':
      drawWallShelf(g, wx, wy, wz);
      break;
  }
}

// ─── Furniture layer (all objects, depth-sorted) ──────────────────────────────

export function drawFurnitureLayer(g: PIXI.Graphics, objects: RoomObject[]) {
  const sorted = [...objects].sort((a, b) => {
    const [, ay] = proj(a.wx, a.wy, a.wz);
    const [, by] = proj(b.wx, b.wy, b.wz);
    return ay - by;
  });
  for (const obj of sorted) drawFurnitureObject(g, obj);
}

/** Draws one furniture body with its rotation applied; the shared projection is always restored. */
export function drawFurnitureObject(g: PIXI.Graphics, obj: RoomObject) {
  beginFurnitureRotation(obj.furnitureType, obj.wx, obj.wy, obj.rotation);
  try {
    drawFurnitureByType(g, obj.furnitureType, obj.wx, obj.wy, obj.wz, obj.variant);
  } finally {
    endFurnitureRotation();
  }
}

// ─── Selection highlight ──────────────────────────────────────────────────────

export function drawHighlight(g: PIXI.Graphics, obj: RoomObject) {
  g.clear();
  beginFurnitureRotation(obj.furnitureType, obj.wx, obj.wy, obj.rotation);
  try {
    const d = FURNITURE_DIMS[obj.furnitureType] ?? { w: 2, d: 2, h: 0 };
    const { wx, wy, wz } = obj;
    const top: [number, number][] = [
      proj(wx, wy, wz + d.h),
      proj(wx + d.w, wy, wz + d.h),
      proj(wx + d.w, wy + d.d, wz + d.h),
      proj(wx, wy + d.d, wz + d.h),
    ];
    qfill(g, top, 0xffffff, 0.18);
    qstroke(g, top, 0xffd060, 2.5, 0.9);
    top.forEach(([px, py]) => {
      g.beginFill(0xffd060, 0.85).drawCircle(px, py, 4).endFill();
    });
  } finally {
    endFurnitureRotation();
  }
}

/** Gold floor ring used to pulse the agent's active work station */
export function drawActiveStationHighlight(g: PIXI.Graphics, obj: RoomObject, alpha: number) {
  g.clear();
  beginFurnitureRotation(obj.furnitureType, obj.wx, obj.wy, obj.rotation);
  try {
    const fp = FURNITURE_TILES[obj.furnitureType] ?? { w: 1, d: 1 };
    const { wx, wy, wz } = obj;
    const floor: [number, number][] = [
      proj(wx, wy, wz),
      proj(wx + fp.w, wy, wz),
      proj(wx + fp.w, wy + fp.d, wz),
      proj(wx, wy + fp.d, wz),
    ];
    qfill(g, floor, 0xfacc15, 0.18 * alpha);
    qstroke(g, floor, 0xfacc15, 3, alpha);
    drawStationAmbient(g, obj, alpha);
  } finally {
    endFurnitureRotation();
  }
}

// ─── Per-station ambient body glow (drawn above the floor ring) ──────────────
//
// `AmbientShape` + `STATION_AMBIENTS` live in `./stationAmbients` (PIXI-free,
// unit-tested). Only the interpreter that draws each shape lives here.

/**
 * Build a PIXI-backed `AmbientDrawContext` and hand it to the pure interpreter
 * in `stationAmbients.ts`. Unknown furniture types contribute nothing.
 */
export function drawStationAmbient(g: PIXI.Graphics, obj: RoomObject, alpha: number) {
  const ctx: AmbientDrawContext = {
    proj,
    fillQuad: (points, color, a) => qfill(g, points, color, a),
    strokeQuad: (points, color, lineWidth, a) => qstroke(g, points, color, lineWidth, a),
    circle: (cx, cy, r, color, a) => {
      g.beginFill(color, a).drawCircle(cx, cy, r).endFill();
    },
    ellipse: (cx, cy, rx, ry, color, a) => {
      g.beginFill(color, a).drawEllipse(cx, cy, rx, ry).endFill();
    },
    dim: getStationDim(obj.furnitureType),
  };
  applyStationAmbient(ctx, obj, alpha);
}

/** Red collision highlight — drawn during drag when placement is invalid */
export function drawHighlightCollision(g: PIXI.Graphics, obj: RoomObject) {
  g.clear();
  const d = FURNITURE_DIMS[obj.furnitureType] ?? { w: 2, d: 2, h: 0 };
  beginFurnitureRotation(obj.furnitureType, obj.wx, obj.wy, obj.rotation);
  try {
    const { wx, wy, wz } = obj;
    // Floor footprint in red
    const floor: [number, number][] = [
      proj(wx, wy, wz),
      proj(wx + d.w, wy, wz),
      proj(wx + d.w, wy + d.d, wz),
      proj(wx, wy + d.d, wz),
    ];
    qfill(g, floor, 0xff2222, 0.28);
    qstroke(g, floor, 0xff2222, 2.5, 1.0);
    // Top face outline
    const top: [number, number][] = [
      proj(wx, wy, wz + d.h),
      proj(wx + d.w, wy, wz + d.h),
      proj(wx + d.w, wy + d.d, wz + d.h),
      proj(wx, wy + d.d, wz + d.h),
    ];
    qfill(g, top, 0xff2222, 0.18);
    qstroke(g, top, 0xff4444, 2.5, 0.9);
    top.forEach(([px, py]) => {
      g.beginFill(0xff3333, 0.9).drawCircle(px, py, 4).endFill();
    });
  } finally {
    endFurnitureRotation();
  }
}

// ─── Tile grid overlay (shown in edit/move mode) ─────────────────────────────

export function drawTileGrid(g: PIXI.Graphics, cols = ROOM_TILES_X, rows = ROOM_TILES_Y) {
  g.clear();
  // Isometric tile outlines for every cell
  for (let tx = 0; tx < cols; tx++) {
    for (let ty = 0; ty < rows; ty++) {
      const pts: [number, number][] = [
        proj(tx, ty, 0.002),
        proj(tx + 1, ty, 0.002),
        proj(tx + 1, ty + 1, 0.002),
        proj(tx, ty + 1, 0.002),
      ];
      const flatPts = pts.flatMap(([x, y]) => [x, y]);
      g.beginFill(0x88ccff, 0.08).drawPolygon(flatPts).endFill();
      g.lineStyle(1.5, 0x44aaff, 0.7).drawPolygon(flatPts);
    }
  }
  // Corner dots
  for (let tx = 0; tx <= cols; tx++) {
    for (let ty = 0; ty <= rows; ty++) {
      const [px, py] = proj(tx, ty, 0.003);
      g.beginFill(0x44aaff, 0.8).drawCircle(px, py, 2.5).endFill();
    }
  }
}

// ─── Legacy all-in-one (backward compat) ─────────────────────────────────────

const DEFAULT_OBJECTS: RoomObject[] = [
  {
    id: 1,
    furnitureType: 'document_board',
    label: 'Document Board',
    description: '',
    wx: 4,
    wy: 8,
    wz: 2.25,
    happiness: 7,
    draggable: false,
  },
  {
    id: 2,
    furnitureType: 'printer',
    label: 'Printer Station',
    description: '',
    wx: 9,
    wy: 5,
    wz: 0,
    happiness: 8,
    draggable: true,
  },
  {
    id: 3,
    furnitureType: 'bookcase',
    label: 'Bookcase',
    description: '',
    wx: 1,
    wy: 7,
    wz: 0,
    happiness: 10,
    draggable: true,
  },
  {
    id: 4,
    furnitureType: 'computer_desk',
    label: 'Computer Workstation',
    description: '',
    wx: 6,
    wy: 6,
    wz: 0,
    happiness: 14,
    draggable: true,
  },
  {
    id: 6,
    furnitureType: 'bed',
    label: 'Wooden Bed',
    description: '',
    wx: 5,
    wy: 0,
    wz: 0,
    happiness: 15,
    draggable: true,
  },
  {
    id: 7,
    furnitureType: 'nightstand',
    label: 'Bedside Cabinet',
    description: '',
    wx: 4,
    wy: 0,
    wz: 0,
    happiness: 5,
    draggable: true,
  },
  {
    id: 9,
    furnitureType: 'low_table',
    label: 'Meeting Table',
    description: '',
    wx: 2,
    wy: 3,
    wz: 0,
    happiness: 8,
    draggable: true,
  },
  {
    id: 10,
    furnitureType: 'zabuton',
    label: 'Meeting Cushion',
    description: '',
    wx: 2,
    wy: 2,
    wz: 0,
    happiness: 4,
    draggable: true,
  },
  {
    id: 11,
    furnitureType: 'zabuton',
    label: 'Meeting Cushion',
    description: '',
    wx: 2,
    wy: 5,
    wz: 0,
    happiness: 4,
    draggable: true,
  },
  {
    id: 12,
    furnitureType: 'zabuton',
    label: 'Reading Cushion',
    description: '',
    wx: 0,
    wy: 6,
    wz: 0,
    happiness: 4,
    draggable: true,
  },
  {
    id: 13,
    furnitureType: 'plant',
    label: 'Tropical Plant',
    description: '',
    wx: 9,
    wy: 6,
    wz: 0,
    happiness: 7,
    draggable: true,
  },
];

export function drawPixiRoom(g: PIXI.Graphics) {
  drawBackground(g);
  drawFurnitureLayer(g, DEFAULT_OBJECTS);
}

export { DEFAULT_OBJECTS };
