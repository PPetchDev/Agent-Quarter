import * as PIXI from "pixi.js";
import type { RoomObject } from "./roomDefs";
import { FURNITURE_DIMS, FURNITURE_TILES } from "./roomDefs";
import { STATION_AMBIENTS, type AmbientDrawContext } from "./stationAmbients";

export const CANVAS_W = 1080;
export const CANVAS_H = 620;

let _S = 56;
let _OX = 100;
let _OY = 560;

export function computeRoomProjection(cols: number, rows: number): { S: number; OX: number; OY: number } {
  const S = Math.floor(
    Math.min(
      (CANVAS_W - 60) / (cols + rows * 0.65),
      (CANVAS_H - 60) / (rows * 0.65 + 4.5),
    ),
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

export function proj(wx: number, wy: number, wz: number): [number, number] {
  return [_OX + wx * _S + wy * _S * 0.65, _OY - wy * _S * 0.65 - wz * _S];
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
  g.poly(P(pts)).fill({ color, alpha });
}

function qstroke(g: PIXI.Graphics, pts: [number, number][], color: number, width = 0.7, alpha = 0.18) {
  g.poly(P(pts)).stroke({ color, width, alpha });
}

function ln(g: PIXI.Graphics, x1: number, y1: number, x2: number, y2: number, color: number, width: number, alpha = 1) {
  g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color, width, alpha });
}

export function isoBox(
  g: PIXI.Graphics,
  wx: number, wy: number, wz: number,
  w: number, d: number, h: number,
  topColor?: number, frontColor?: number, rightColor?: number,
  topAlpha = 1, frontAlpha = 1, rightAlpha = 1,
) {
  if (topColor !== undefined) {
    const pts: [number, number][] = [proj(wx,wy,wz+h),proj(wx+w,wy,wz+h),proj(wx+w,wy+d,wz+h),proj(wx,wy+d,wz+h)];
    qfill(g, pts, topColor, topAlpha);
    qstroke(g, pts, 0, 0.6, 0.1);
  }
  if (frontColor !== undefined) {
    const pts: [number, number][] = [proj(wx,wy,wz),proj(wx+w,wy,wz),proj(wx+w,wy,wz+h),proj(wx,wy,wz+h)];
    qfill(g, pts, frontColor, frontAlpha);
    qstroke(g, pts, 0, 0.6, 0.1);
  }
  if (rightColor !== undefined) {
    const pts: [number, number][] = [proj(wx+w,wy,wz),proj(wx+w,wy+d,wz),proj(wx+w,wy+d,wz+h),proj(wx+w,wy,wz+h)];
    qfill(g, pts, rightColor, rightAlpha);
    qstroke(g, pts, 0, 0.6, 0.12);
  }
}

// ─── Hit-area helper ──────────────────────────────────────────────────────────

export function furnitureHitPolygon(type: string, wx: number, wy: number, wz: number): PIXI.Polygon {
  const fp = FURNITURE_TILES[type] ?? { w: 1, d: 1 };
  const pts = [
    proj(wx,        wy,        wz),
    proj(wx + fp.w, wy,        wz),
    proj(wx + fp.w, wy + fp.d, wz),
    proj(wx,        wy + fp.d, wz),
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
};

const THEMES: Record<string, RoomTheme> = {
  dawn:  { skyTop: "#7b5ea7", skyBot: "#f7a67c", wallTint: 0xf7c898, wallTintAlpha: 0.18, floorTint: 0xe89870, floorTintAlpha: 0.10 },
  day:   { skyTop: "#d4e8f5", skyBot: "#a0c4de", wallTint: 0xffffff, wallTintAlpha: 0.0,  floorTint: 0xffffff, floorTintAlpha: 0.0  },
  dusk:  { skyTop: "#e06030", skyBot: "#f0a858", wallTint: 0xff7830, wallTintAlpha: 0.22, floorTint: 0xe05818, floorTintAlpha: 0.14 },
  night: { skyTop: "#1a1a3e", skyBot: "#2a2a5a", wallTint: 0x3050a0, wallTintAlpha: 0.28, floorTint: 0x182038, floorTintAlpha: 0.18 },
};

export function getTimeTheme(): RoomTheme {
  const h = new Date().getHours();
  if (h >= 5 && h < 8)  return THEMES.dawn!;
  if (h >= 8 && h < 18) return THEMES.day!;
  if (h >= 18 && h < 21) return THEMES.dusk!;
  return THEMES.night!;
}

export function drawBackground(g: PIXI.Graphics, cols = ROOM_TILES_X, rows = ROOM_TILES_Y, theme?: RoomTheme) {
  g.clear();

  const [shadowX, shadowY] = proj(cols / 2, rows / 2, -0.01);
  g.ellipse(shadowX, shadowY + _S * 0.08, (cols + rows * 0.5) * _S * 0.52, rows * _S * 0.28)
    .fill({ color: 0x000000, alpha: 0.12 });

  // Floor
  qfill(g, [proj(0,0,0),proj(cols,0,0),proj(cols,rows,0),proj(0,rows,0)], 0xc4824a);
  for (let i = 1; i < cols; i++) {
    const [ax,ay]=proj(i,0,0),[bx,by]=proj(i,rows,0);
    ln(g,ax,ay,bx,by,0xffffff,0.8,0.07);
  }
  for (let j = 1; j < rows; j++) {
    const [ax,ay]=proj(0,j,0),[bx,by]=proj(cols,j,0);
    ln(g,ax,ay,bx,by,0xffffff,0.8,0.05);
  }

  // Low cutaway edges make the full room footprint read as intentional.
  qfill(g,[proj(0,0,0),proj(cols,0,0),proj(cols,0,-0.28),proj(0,0,-0.28)],0x7a4624,0.92);
  qfill(g,[proj(cols,0,0),proj(cols,rows,0),proj(cols,rows,-0.28),proj(cols,0,-0.28)],0x6f3e20,0.82);
  qstroke(g,[proj(0,0,0.01),proj(cols,0,0.01),proj(cols,rows,0.01),proj(0,rows,0.01)],0x5c3218,1.7,0.42);

  // Back wall
  qfill(g,[proj(0,rows,0),proj(cols,rows,0),proj(cols,rows,4.5),proj(0,rows,4.5)],0xf0e9da);
  qfill(g,[proj(0,rows,4.1),proj(cols,rows,4.1),proj(cols,rows,4.5),proj(0,rows,4.5)],0xb8723c);
  qfill(g,[proj(0,rows,0),proj(cols,rows,0),proj(cols,rows,0.18),proj(0,rows,0.18)],0xa86030);
  for (let x = 2; x < cols; x += 2) {
    const [px1,py1]=proj(x,rows,0.22),[px2,py2]=proj(x,rows,4.1);
    ln(g,px1,py1,px2,py2,0xb8a996,1.1,0.32);
  }
  const floralColors = [0xd4a0c0,0xb8c8e0,0xc8d4b0];
  const backFlowerCount = Math.max(1, Math.ceil(cols * 12 / ROOM_TILES_X));
  const backFlowerSpacing = cols / backFlowerCount;
  for (let fi = 0; fi < backFlowerCount; fi++) {
    const fwx = backFlowerSpacing * (fi + 0.5), fwz = 1.2 + (fi % 3) * 1.1;
    const [fpx,fpy] = proj(fwx,rows - 0.01,fwz);
    const fc = floralColors[fi % 3]!;
    g.circle(fpx,fpy,4.5).fill({color:fc,alpha:0.55});
    g.circle(fpx+7,fpy-3,3).fill({color:fc,alpha:0.35});
    g.circle(fpx-7,fpy-3,3).fill({color:fc,alpha:0.35});
    g.circle(fpx,fpy-8,3).fill({color:fc,alpha:0.35});
  }

  // Left wall
  qfill(g,[proj(0,0,0),proj(0,rows,0),proj(0,rows,4.5),proj(0,0,4.5)],0xf5efe3);
  qfill(g,[proj(0,0,4.1),proj(0,rows,4.1),proj(0,rows,4.5),proj(0,0,4.5)],0xb8723c);
  qfill(g,[proj(0,0,0),proj(0,rows,0),proj(0,rows,0.18),proj(0,0,0.18)],0xa86030);
  const leftFlowerCount = Math.max(1, Math.ceil(rows * 8 / ROOM_TILES_Y));
  const leftFlowerSpacing = rows / leftFlowerCount;
  for (let fi = 0; fi < leftFlowerCount; fi++) {
    const fwy = leftFlowerSpacing * (fi + 0.5), fwz = 1.0 + (fi % 3) * 1.2;
    const [fpx,fpy] = proj(0.01,fwy,fwz);
    const fc = floralColors[fi % 3]!;
    g.circle(fpx,fpy,3.5).fill({color:fc,alpha:0.45});
    g.circle(fpx+6,fpy-2,2.5).fill({color:fc,alpha:0.28});
    g.circle(fpx-6,fpy-2,2.5).fill({color:fc,alpha:0.28});
  }

  // Area rug
  qfill(g,[proj(1.0,1.35,0.005),proj(6.0,1.35,0.005),proj(6.0,6.65,0.005),proj(1.0,6.65,0.005)],0xc87848,0.32);
  qstroke(g,[proj(1.0,1.35,0.005),proj(6.0,1.35,0.005),proj(6.0,6.65,0.005),proj(1.0,6.65,0.005)],0x8b4820,1.5,0.38);
  qstroke(g,[proj(1.18,1.55,0.005),proj(5.82,1.55,0.005),proj(5.82,6.45,0.005),proj(1.18,6.45,0.005)],0x8b4820,0.8,0.28);

  // Door
  const featureMaxY = Math.max(0, rows - 1);
  const wallY = (wy: number) => Math.max(0, Math.min(featureMaxY, wy));
  const leftWallRect = (y1: number, y2: number, z1: number, z2: number, color: number, alpha = 1) => {
    const cy1 = wallY(y1), cy2 = wallY(y2);
    if (cy2 - cy1 <= 0.05) return false;
    qfill(g,[proj(0,cy1,z1),proj(0,cy2,z1),proj(0,cy2,z2),proj(0,cy1,z2)],color,alpha);
    return true;
  };
  if (leftWallRect(0.8,2.4,0,3.0,0x8b5c28)) {
    leftWallRect(0.88,2.32,0.04,2.94,0xd4904e);
    leftWallRect(0.92,2.28,1.8,2.88,0x87ceeb,0.85);
    const [twx,twy]=proj(0,wallY(1.6),2.3);
    g.rect(twx-1.5,twy,3,22).fill({color:0x6b3a2a,alpha:0.8});
    for(let bi=0;bi<8;bi++){const ang=(bi/8)*Math.PI*2;g.circle(twx+Math.cos(ang)*10,twy-5+Math.sin(ang)*6,6).fill({color:0xffb7c5,alpha:0.75});}
    g.circle(twx,twy-8,9).fill({color:0xffb7c5,alpha:0.7});
    leftWallRect(0.92,2.28,0.1,1.72,0xc07838,0.9);
    const [dkx,dky]=proj(0,wallY(2.0),1.2);
    g.circle(dkx,dky,3.5).fill(0xd4af37);
  }

  // Window
  if (leftWallRect(3.2,5.6,1.0,3.6,0x7ab5d8,0.7)) {
    const frameY1 = wallY(3.0), frameY2 = wallY(5.8);
    qstroke(g,[proj(0,frameY1,0.8),proj(0,frameY2,0.8),proj(0,frameY2,3.8),proj(0,frameY1,3.8)],0x8b5c28,3,0.9);
    const [wdx1,wdy1]=proj(0,wallY(4.4),0.8),[wdx2,wdy2]=proj(0,wallY(4.4),3.8);
    ln(g,wdx1,wdy1,wdx2,wdy2,0x8b5c28,2,0.8);
    const [whx1,why1]=proj(0,frameY1,2.2),[whx2,why2]=proj(0,frameY2,2.2);
    ln(g,whx1,why1,whx2,why2,0x8b5c28,2,0.8);
    leftWallRect(2.88,3.28,0.75,3.82,0xe8c88a,0.88);
    leftWallRect(5.52,5.92,0.75,3.82,0xe8c88a,0.88);
  }

  // Wall lamp
  const [wlx,wly]=proj(0.01,1.6,3.5);
  g.rect(wlx-3,wly-20,6,8).fill(0x8b6914);
  g.poly([wlx-10,wly-12,wlx+10,wly-12,wlx+7,wly,wlx-7,wly]).fill(0xfde68a);
  g.circle(wlx,wly-8,25).fill({color:0xffd070,alpha:0.1});

  // Time-based theme tint overlay
  if (theme) {
    if (theme.floorTintAlpha > 0)
      qfill(g,[proj(0,0,0),proj(cols,0,0),proj(cols,rows,0),proj(0,rows,0)],theme.floorTint,theme.floorTintAlpha);
    if (theme.wallTintAlpha > 0) {
      qfill(g,[proj(0,rows,0),proj(cols,rows,0),proj(cols,rows,4.5),proj(0,rows,4.5)],theme.wallTint,theme.wallTintAlpha);
      qfill(g,[proj(0,0,0),proj(0,rows,0),proj(0,rows,4.5),proj(0,0,4.5)],theme.wallTint,theme.wallTintAlpha);
    }
  }
}

// ─── Individual furniture draw functions ──────────────────────────────────────

export function drawBed(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  const W = 4.0, D = 5.0;
  qfill(g,[proj(wx,wy,0.002),proj(wx+W,wy,0.002),proj(wx+W,wy+D,0.002),proj(wx,wy+D,0.002)],0x000000,0.1);
  isoBox(g,wx,wy,wz,W,D,0.38,0x3e2010,0x2e1808,0x241208);
  isoBox(g,wx+0.06,wy+0.06,wz+0.38,W-0.12,D-0.12,0.42,0xf0ecff,0xe8e4f5,0xe0dcee);
  isoBox(g,wx+0.12,wy+1.88,wz+0.8,W-0.24,2.95,0.14,0x4a7ab5,0x3a6098,0x2e5080);
  qfill(g,[proj(wx+0.12,wy+1.88,wz+0.94),proj(wx+W-0.12,wy+1.88,wz+0.94),proj(wx+W-0.12,wy+1.88,wz+0.8),proj(wx+0.12,wy+1.88,wz+0.8)],0x5a8ac5);
  isoBox(g,wx+0.18,wy+0.1,wz+0.8,1.48,1.1,0.28,0xfafaff,0xeeeaff,0xe0d8f0);
  isoBox(g,wx+2.28,wy+0.1,wz+0.8,1.48,1.1,0.28,0xfafaff,0xeeeaff,0xe0d8f0);
  isoBox(g,wx,wy,wz+0.38,W,0.18,1.15,0x5c3818,0x4a2c10,0x3c2208);
  isoBox(g,wx,wy+D-0.32,wz+0.38,W,0.18,0.58,0x5c3818,0x4a2c10,0x3c2208);
  const [bfx,bfy]=proj(wx+W/2,wy+3.0,wz+0.95);
  g.circle(bfx,bfy,5).fill({color:0x8ab4e0,alpha:0.45});
  [[-9,0],[9,0],[0,-9],[0,9]].forEach(([dx,dy])=>g.circle(bfx+dx!,bfy+dy!,3.5).fill({color:0x8ab4e0,alpha:0.32}));
}

export function drawNightstand(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  isoBox(g,wx,wy,wz,1.0,1.0,0.6,0x5c3818,0x4a2c10,0x3c2208);
  qfill(g,[proj(wx,wy,wz+0.22),proj(wx+1.0,wy,wz+0.22),proj(wx+1.0,wy,wz+0.48),proj(wx,wy,wz+0.48)],0x000000,0.12);
  const [nsx,nsy]=proj(wx+0.5,wy,wz+0.35);
  g.circle(nsx,nsy,2).fill(0xd4af37);
  const [nlx,nly]=proj(wx+0.3,wy+0.2,wz+0.62);
  g.rect(nlx-9,nly-24,18,24).fill(0x8b6914);
  g.rect(nlx-6,nly-21,12,17).fill({color:0xfde68a,alpha:0.88});
  g.poly([nlx-7,nly-24,nlx,nly-31,nlx+7,nly-24]).fill(0x8b6914);
  g.circle(nlx,nly-12,30).fill({color:0xffd070,alpha:0.13});
}

export function drawTVStand(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  isoBox(g,wx,wy,wz,4.0,1.0,0.85,0x5c3818,0x4a2c10,0x3c2208);
  for(let di=0;di<2;di++){
    const dwx=wx+0.4+di*1.85;
    const [dhx,dhy]=proj(dwx+0.6,wy,wz+0.42);
    g.rect(dhx-12,dhy-4,24,8).fill({color:0x2a1408,alpha:0.5});
    g.circle(dhx,dhy,2.5).fill(0xd4af37);
  }
  const [gcx,gcy]=proj(wx+3.1,wy,wz+0.87);
  g.rect(gcx-14,gcy-7,28,14).fill({color:0x1a1a2e,alpha:0.85});
  g.circle(gcx+5,gcy-1,2.5).fill(0xe74c3c);
  g.circle(gcx+9,gcy+2,2).fill(0x3498db);
  const [pfx,pfy]=proj(wx+0.2,wy,wz+0.87);
  g.rect(pfx-8,pfy-12,16,16).fill(0x8b5c28);
  g.rect(pfx-6,pfy-10,12,12).fill(0x4a7ab0);
}

export function drawTV(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  isoBox(g,wx+1.1,wy+0.1,wz,1.8,0.12,0.12,0x1a1a1a,0x111111);
  isoBox(g,wx,wy,wz,4.0,0.12,2.1,0x141414,0x1c1c1c,0x101010);
  qfill(g,[proj(wx+0.08,wy-0.02,wz+0.05),proj(wx+3.92,wy-0.02,wz+0.05),proj(wx+3.92,wy-0.02,wz+2.0),proj(wx+0.08,wy-0.02,wz+2.0)],0x1a3a70);
  qfill(g,[proj(wx+0.14,wy-0.03,wz+0.1),proj(wx+3.86,wy-0.03,wz+0.1),proj(wx+3.86,wy-0.03,wz+1.95),proj(wx+0.14,wy-0.03,wz+1.95)],0x2855a8,0.8);
}

export function drawComputerDesk(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  qfill(g,[proj(wx,wy,0.002),proj(wx+3.0,wy,0.002),proj(wx+3.0,wy+2.0,0.002),proj(wx,wy+2.0,0.002)],0x000000,0.12);
  isoBox(g,wx,wy,wz,3.0,2.0,0.72,0x6a4122,0x563019,0x442413);
  isoBox(g,wx+0.08,wy+0.08,wz+0.72,2.84,1.84,0.08,0x8b5a2b,0x71431f,0x5a3418);
  isoBox(g,wx+0.18,wy+0.18,wz,0.16,0.16,0.72,0x3c2208,0x2a1608,0x241208);
  isoBox(g,wx+2.66,wy+0.18,wz,0.16,0.16,0.72,0x3c2208,0x2a1608,0x241208);
  isoBox(g,wx+0.18,wy+1.62,wz,0.16,0.16,0.72,0x3c2208,0x2a1608,0x241208);
  isoBox(g,wx+2.66,wy+1.62,wz,0.16,0.16,0.72,0x3c2208,0x2a1608,0x241208);

  qfill(g,[proj(wx+0.38,wy+1.52,wz+0.9),proj(wx+1.72,wy+1.52,wz+0.9),proj(wx+1.72,wy+1.52,wz+1.8),proj(wx+0.38,wy+1.52,wz+1.8)],0x172033);
  qfill(g,[proj(wx+0.45,wy+1.5,wz+0.98),proj(wx+1.65,wy+1.5,wz+0.98),proj(wx+1.65,wy+1.5,wz+1.7),proj(wx+0.45,wy+1.5,wz+1.7)],0x2f80ed,0.88);
  qstroke(g,[proj(wx+0.45,wy+1.495,wz+0.98),proj(wx+1.65,wy+1.495,wz+0.98),proj(wx+1.65,wy+1.495,wz+1.7),proj(wx+0.45,wy+1.495,wz+1.7)],0xbce7ff,1,0.5);
  const [line1x,line1y]=proj(wx+0.58,wy+1.48,wz+1.5);
  ln(g,line1x,line1y,line1x+32,line1y-4,0x99ffcc,2,0.8);
  const [line2x,line2y]=proj(wx+0.58,wy+1.48,wz+1.35);
  ln(g,line2x,line2y,line2x+22,line2y-3,0xe7f0ff,2,0.65);
  isoBox(g,wx+0.9,wy+1.34,wz+0.78,0.26,0.22,0.22,0x172033,0x0f172a,0x0b1020);

  qfill(g,[proj(wx+0.34,wy+0.42,wz+0.83),proj(wx+1.86,wy+0.42,wz+0.83),proj(wx+1.86,wy+0.76,wz+0.83),proj(wx+0.34,wy+0.76,wz+0.83)],0x202a38,0.95);
  for(let ki=0;ki<8;ki++){
    const [kx,ky]=proj(wx+0.5+ki*0.16,wy+0.43,wz+0.84);
    g.rect(kx-3,ky-2,5,3).fill({color:0xd8e5f0,alpha:0.58});
  }
  qfill(g,[proj(wx+1.98,wy+0.42,wz+0.84),proj(wx+2.68,wy+0.42,wz+0.84),proj(wx+2.68,wy+1.05,wz+0.84),proj(wx+1.98,wy+1.05,wz+0.84)],0xf6ead7,0.95);
  qstroke(g,[proj(wx+1.98,wy+0.42,wz+0.845),proj(wx+2.68,wy+0.42,wz+0.845),proj(wx+2.68,wy+1.05,wz+0.845),proj(wx+1.98,wy+1.05,wz+0.845)],0x4a5568,1,0.28);
  const [mugX,mugY]=proj(wx+2.7,wy+1.24,wz+0.86);
  g.circle(mugX,mugY,6).fill(0x90cdf4);
  g.circle(mugX+6,mugY-2,3).stroke({color:0x90cdf4,width:2,alpha:0.9});
}

export function drawPrinter(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  qfill(g,[proj(wx,wy,0.002),proj(wx+1.0,wy,0.002),proj(wx+1.0,wy+1.0,0.002),proj(wx,wy+1.0,0.002)],0x000000,0.1);
  isoBox(g,wx,wy,wz,1.0,1.0,0.64,0xd8dee9,0xaeb8c6,0x94a3b8);
  isoBox(g,wx+0.08,wy+0.08,wz+0.64,0.84,0.84,0.25,0xf8fafc,0xcbd5e1,0xb8c4d4);
  qfill(g,[proj(wx+0.16,wy+0.18,wz+0.9),proj(wx+0.78,wy+0.18,wz+0.9),proj(wx+0.78,wy+0.68,wz+0.9),proj(wx+0.16,wy+0.68,wz+0.9)],0x334155,0.9);
  qfill(g,[proj(wx+0.14,wy,wz+0.2),proj(wx+0.86,wy,wz+0.2),proj(wx+0.86,wy,wz+0.44),proj(wx+0.14,wy,wz+0.44)],0x64748b,0.82);
  qfill(g,[proj(wx+0.2,wy-0.02,wz+0.08),proj(wx+0.82,wy-0.02,wz+0.08),proj(wx+0.82,wy-0.02,wz+0.28),proj(wx+0.2,wy-0.02,wz+0.28)],0xf8fafc,0.9);
  const [ledX,ledY]=proj(wx+0.82,wy+0.02,wz+0.55);
  g.circle(ledX,ledY,3).fill(0x34d399);
}

export function drawDocumentBoard(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  qfill(g,[proj(wx,wy,wz),proj(wx+3.0,wy,wz),proj(wx+3.0,wy,wz+1.6),proj(wx,wy,wz+1.6)],0x6b4020);
  qfill(g,[proj(wx+0.08,wy-0.01,wz+0.08),proj(wx+2.92,wy-0.01,wz+0.08),proj(wx+2.92,wy-0.01,wz+1.52),proj(wx+0.08,wy-0.01,wz+1.52)],0xf7edd0,0.96);
  qstroke(g,[proj(wx+0.08,wy-0.015,wz+0.08),proj(wx+2.92,wy-0.015,wz+0.08),proj(wx+2.92,wy-0.015,wz+1.52),proj(wx+0.08,wy-0.015,wz+1.52)],0x7a4518,1.3,0.75);
  [wx+1.0, wx+2.0].forEach((lineX) => {
    const [aX,aY]=proj(lineX,wy-0.02,wz+0.18), [bX,bY]=proj(lineX,wy-0.02,wz+1.42);
    ln(g,aX,aY,bX,bY,0x94a3b8,1,0.45);
  });
  [wz+0.56, wz+1.04].forEach((lineZ) => {
    const [aX,aY]=proj(wx+0.18,wy-0.02,lineZ), [bX,bY]=proj(wx+2.82,wy-0.02,lineZ);
    ln(g,aX,aY,bX,bY,0x94a3b8,1,0.42);
  });
  const notes = [
    { x: 0.24, z: 0.24, w: 0.48, h: 0.34, c: 0xfde68a },
    { x: 1.08, z: 0.68, w: 0.55, h: 0.38, c: 0x93c5fd },
    { x: 1.98, z: 1.06, w: 0.5,  h: 0.34, c: 0xfca5a5 },
    { x: 2.04, z: 0.28, w: 0.42, h: 0.32, c: 0x86efac },
  ];
  notes.forEach((note) => {
    qfill(g,[proj(wx+note.x,wy-0.03,wz+note.z),proj(wx+note.x+note.w,wy-0.03,wz+note.z),proj(wx+note.x+note.w,wy-0.03,wz+note.z+note.h),proj(wx+note.x,wy-0.03,wz+note.z+note.h)],note.c,0.92);
  });
  const [pinX,pinY]=proj(wx+1.4,wy-0.04,wz+1.45);
  g.circle(pinX,pinY,4).fill(0xef4444);
}

export function drawBookcase(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  isoBox(g,wx,wy,wz,3.0,1.0,3.6,0x5c3818,0x4a2c10,0x3c2208);
  [0.72,1.62,2.52,3.42].forEach(sh=>{
    qfill(g,[proj(wx,wy,sh),proj(wx+3.0,wy,sh),proj(wx+3.0,wy+1.0,sh),proj(wx,wy+1.0,sh)],0x3c2208);
  });
  const bkPalette=[0xe74c3c,0x3498db,0x2ecc71,0xf39c12,0x9b59b6,0xe67e22,0x1abc9c,0xe91e63];
  [0.72,1.62,2.52].forEach((sh,ri)=>{
    let bx2=wx+0.06;
    for(let bi=0;bi<8;bi++){
      const bw=0.26+Math.sin(ri*5+bi)*0.06, bh=0.52+Math.cos(ri*2+bi*3)*0.1;
      const bc=bkPalette[(ri*4+bi)%bkPalette.length]!;
      qfill(g,[proj(bx2,wy,sh+0.05),proj(bx2+bw,wy,sh+0.05),proj(bx2+bw,wy,sh+0.05+bh),proj(bx2,wy,sh+0.05+bh)],bc);
      qfill(g,[proj(bx2+bw,wy,sh+0.05),proj(bx2+bw,wy+1.0,sh+0.05),proj(bx2+bw,wy+1.0,sh+0.05+bh),proj(bx2+bw,wy,sh+0.05+bh)],0x000000,0.25);
      bx2+=bw+0.05; if(bx2>wx+2.88) break;
    }
  });
  const [bpsx,bpsy]=proj(wx+1.3,wy+0.08,3.6);
  g.rect(bpsx-8,bpsy-8,16,10).fill(0x8b4513);
  g.circle(bpsx,bpsy-12,9).fill({color:0x22a43a,alpha:0.9});
  g.circle(bpsx-8,bpsy-10,7).fill({color:0x1a8a2e,alpha:0.85});
  g.circle(bpsx+7,bpsy-10,7).fill({color:0x2ecc71,alpha:0.8});
}

export function drawHangingScroll(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  qfill(g,[proj(wx,wy,wz+1.35),proj(wx+2.0,wy,wz+1.35),proj(wx+2.0,wy,wz+1.5),proj(wx,wy,wz+1.5)],0x7a4518);
  qfill(g,[proj(wx+0.02,wy,wz+0.0),proj(wx+1.98,wy,wz+0.0),proj(wx+1.98,wy,wz+1.35),proj(wx+0.02,wy,wz+1.35)],0xfff8e8);
  qstroke(g,[proj(wx+0.02,wy,wz+0.0),proj(wx+1.98,wy,wz+0.0),proj(wx+1.98,wy,wz+1.35),proj(wx+0.02,wy,wz+1.35)],0xc8a040,1.2,0.5);
  qfill(g,[proj(wx+0.1,wy,wz+0.08),proj(wx+1.8,wy,wz+0.08),proj(wx+1.8,wy,wz+1.28),proj(wx+0.1,wy,wz+1.28)],0xfce8c0,0.6);
  const [artX,artY]=proj(wx+1.0,wy-0.01,wz+0.72);
  g.ellipse(artX,artY,14,10).fill({color:0xe8942a,alpha:0.8});
  g.circle(artX+2,artY-14,9).fill({color:0xe8942a,alpha:0.8});
  g.poly([artX-4,artY-20,artX,artY-28,artX+4,artY-20]).fill({color:0xe8942a,alpha:0.75});
  g.poly([artX+8,artY-20,artX+12,artY-27,artX+15,artY-20]).fill({color:0xe8942a,alpha:0.75});
  g.ellipse(artX-16,artY+2,8,5).fill({color:0xe8942a,alpha:0.7});
  [[artX-22,artY-5],[artX+22,artY-8],[artX-18,artY+12],[artX+18,artY+10]].forEach(([lx,ly],li)=>{
    g.ellipse(lx!,ly!,5,3).fill({color:[0xe07830,0xd44020,0xe8a830][li%3]!,alpha:0.65});
  });
  qfill(g,[proj(wx,wy,wz-0.06),proj(wx+2.0,wy,wz-0.06),proj(wx+2.0,wy,wz+0.08),proj(wx,wy,wz+0.08)],0x7a4518);
  const [ss1x,ss1y]=proj(wx+0.2,wy,wz+1.5), [ss2x,ss2y]=proj(wx+0.2,wy,wz+1.75);
  ln(g,ss1x,ss1y,ss2x,ss2y,0x7a4518,1.5);
  const [ss3x,ss3y]=proj(wx+1.7,wy,wz+1.5), [ss4x,ss4y]=proj(wx+1.7,wy,wz+1.75);
  ln(g,ss3x,ss3y,ss4x,ss4y,0x7a4518,1.5);
}

export function drawWallShelf(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  qfill(g,[proj(wx,wy,wz),proj(wx+3.0,wy,wz),proj(wx+3.0,wy,wz+0.18),proj(wx,wy,wz+0.18)],0x6b4020);
  qfill(g,[proj(wx,wy,wz-0.4),proj(wx,wy,wz),proj(wx+0.16,wy,wz),proj(wx+0.16,wy,wz-0.4)],0x5a3418);
  qfill(g,[proj(wx+2.84,wy,wz-0.4),proj(wx+2.84,wy,wz),proj(wx+3.0,wy,wz),proj(wx+3.0,wy,wz-0.4)],0x5a3418);
  const shelfBks=[0xe74c3c,0x3498db,0x2ecc71,0xf39c12,0x9b59b6];
  let sbx=wx+0.05;
  shelfBks.forEach((bc,bi)=>{
    const bw=0.36+(bi%2)*0.08, bh=0.62+Math.sin(bi)*0.12;
    qfill(g,[proj(sbx,wy,wz+0.18),proj(sbx+bw,wy,wz+0.18),proj(sbx+bw,wy,wz+0.18+bh),proj(sbx,wy,wz+0.18+bh)],bc);
    sbx+=bw+0.07;
  });
  const [lsx,lsy]=proj(wx+2.6,wy-0.01,wz+0.18);
  g.rect(lsx-10,lsy-26,20,26).fill(0x8b6914);
  g.rect(lsx-7,lsy-23,14,20).fill({color:0xfde68a,alpha:0.9});
  g.circle(lsx,lsy-13,22).fill({color:0xffd070,alpha:0.14});
  g.poly([lsx-6,lsy-26,lsx,lsy-32,lsx+6,lsy-26]).fill(0x8b6914);
}

export function drawPoolTable(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  qfill(g,[proj(wx,wy,0.002),proj(wx+4.0,wy,0.002),proj(wx+4.0,wy+3.0,0.002),proj(wx,wy+3.0,0.002)],0x000000,0.12);
  isoBox(g,wx+0.05,wy+0.05,wz,3.9,2.9,0.72,0x5a3012,0x4a2608,0x3c1e06);
  isoBox(g,wx,wy,wz+0.72,4.0,3.0,0.1,0x1a6b2a,0x145520,0x0f4018);
  qfill(g,[proj(wx,wy,wz+0.82),proj(wx+4.0,wy,wz+0.82),proj(wx+4.0,wy,wz+0.85),proj(wx,wy,wz+0.85)],0x0d4015);
  [[wx,wy],[wx+4.0,wy],[wx,wy+3.0],[wx+4.0,wy+3.0],[wx+2.0,wy],[wx+2.0,wy+3.0]].forEach(([px,py])=>{
    const [hx,hy]=proj(px!,py!,wz+0.83);
    g.circle(hx,hy,4).fill(0x0a2010);
  });
  const ballColors=[0xffffff,0xf5c518,0x2255cc,0xdd2222,0x7722aa,0xff7700,0x116611,0xaa1111];
  const rb={wx:wx+2.32,wy:wy+1.05};
  const rackPos:[[number,number]][]=[[[rb.wx,rb.wy]],[[rb.wx-0.22,rb.wy+0.22]],[[rb.wx+0.22,rb.wy+0.22]],[[rb.wx-0.44,rb.wy+0.44]],[[rb.wx,rb.wy+0.44]],[[rb.wx+0.44,rb.wy+0.44]]];
  rackPos.forEach(([[bwx,bwy]],i)=>{
    const [bpx,bpy]=proj(bwx,bwy,wz+0.84);
    g.circle(bpx,bpy,4.5).fill(ballColors[i%ballColors.length]!);
    g.circle(bpx-1.5,bpy-1.5,1.5).fill({color:0xffffff,alpha:0.4});
  });
  const [cbx,cby]=proj(wx+1.0,wy+1.85,wz+0.84);
  g.circle(cbx,cby,4.5).fill(0xffffff);
  const [c1x,c1y]=proj(wx+0.35,wy+2.55,wz+0.84), [c2x,c2y]=proj(wx+3.4,wy+0.72,wz+0.84);
  ln(g,c1x,c1y,c2x,c2y,0xd4a054,3);
}

export function drawLowTable(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  isoBox(g,wx,wy,wz,3.0,2.0,0.28,0x7a5030,0x6a4228,0x5a3420);
  isoBox(g,wx+0.06,wy+0.02,wz+0.28,2.88,1.96,0.05,0x3a7a9a,0x2e6080,0x245070);
  const [tpx,tpy]=proj(wx+1.4,wy+1.0,wz+0.35);
  g.circle(tpx,tpy,11).fill(0x1a1a1a);
  g.circle(tpx,tpy-11,5).fill(0x222222);
  g.moveTo(tpx+8,tpy-2).lineTo(tpx+18,tpy-8).stroke({color:0x1a1a1a,width:3.5});
  g.moveTo(tpx-8,tpy-5).lineTo(tpx-16,tpy-10).lineTo(tpx-16,tpy+2).stroke({color:0x1a1a1a,width:2.5});
  [[wx+0.4,wy+1.1],[wx+0.8,wy+0.6],[wx+1.9,wy+0.5]].forEach(([cwx,cwy])=>{
    const [cx,cy]=proj(cwx!,cwy!,wz+0.34);
    g.circle(cx,cy,6).fill(0x4a7a8a);
    g.circle(cx,cy+1,2.5).fill({color:0xa0c8d0,alpha:0.5});
  });
}

export function drawZabuton(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  isoBox(g,wx,wy,wz,3.0,1.0,0.18,0x4a5830,0x3a4828,0x2e3c20);
}

export function drawPlant(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  isoBox(g,wx,wy,wz,1.0,1.0,0.62,0xc04a2a,0xa03818,0x882e10);
  const [psx,psy]=proj(wx+0.5,wy+0.5,wz+0.62);
  for(let li=0;li<7;li++){
    const ang=(li/7)*Math.PI*2-0.3;
    const ex=psx+Math.cos(ang)*24, ey=psy+Math.sin(ang)*11-28;
    ln(g,psx,psy-5,ex,ey,0x1a7030,2.2);
    g.ellipse(ex,ey,11,7).fill({color:0x22a43a,alpha:0.88});
  }
  g.circle(psx,psy-18,14).fill({color:0x1e8a34,alpha:0.6});
}

// ─── Dispatch by furniture type ───────────────────────────────────────────────

export function drawFurnitureByType(g: PIXI.Graphics, type: string, wx: number, wy: number, wz: number) {
  switch (type) {
    case "bed":            drawBed(g, wx, wy, wz); break;
    case "nightstand":     drawNightstand(g, wx, wy, wz); break;
    case "computer_desk":  drawComputerDesk(g, wx, wy, wz); break;
    case "printer":        drawPrinter(g, wx, wy, wz); break;
    case "document_board": drawDocumentBoard(g, wx, wy, wz); break;
    case "tv_stand":       drawTVStand(g, wx, wy, wz); break;
    case "tv":             drawTV(g, wx, wy, wz); break;
    case "bookcase":       drawBookcase(g, wx, wy, wz); break;
    case "pool_table":     drawPoolTable(g, wx, wy, wz); break;
    case "low_table":      drawLowTable(g, wx, wy, wz); break;
    case "zabuton":        drawZabuton(g, wx, wy, wz); break;
    case "plant":          drawPlant(g, wx, wy, wz); break;
    case "hanging_scroll": drawHangingScroll(g, wx, wy, wz); break;
    case "wall_shelf":     drawWallShelf(g, wx, wy, wz); break;
  }
}

// ─── Furniture layer (all objects, depth-sorted) ──────────────────────────────

export function drawFurnitureLayer(g: PIXI.Graphics, objects: RoomObject[]) {
  const sorted = [...objects].sort((a, b) => {
    const [, ay] = proj(a.wx, a.wy, a.wz);
    const [, by] = proj(b.wx, b.wy, b.wz);
    return ay - by;
  });
  for (const obj of sorted) {
    drawFurnitureByType(g, obj.furnitureType, obj.wx, obj.wy, obj.wz);
  }
}

// ─── Selection highlight ──────────────────────────────────────────────────────

export function drawHighlight(g: PIXI.Graphics, obj: RoomObject) {
  g.clear();
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
    g.circle(px, py, 4).fill({ color: 0xffd060, alpha: 0.85 });
  });
}

/** Gold floor ring used to pulse the agent's active work station */
export function drawActiveStationHighlight(
  g: PIXI.Graphics,
  obj: RoomObject,
  alpha: number,
) {
  g.clear();
  const fp = FURNITURE_TILES[obj.furnitureType] ?? { w: 1, d: 1 };
  const { wx, wy, wz } = obj;
  const floor: [number, number][] = [
    proj(wx,        wy,        wz),
    proj(wx + fp.w, wy,        wz),
    proj(wx + fp.w, wy + fp.d, wz),
    proj(wx,        wy + fp.d, wz),
  ];
  qfill(g, floor, 0xfacc15, 0.18 * alpha);
  qstroke(g, floor, 0xfacc15, 3, alpha);
  drawStationAmbient(g, obj, alpha);
}

// ─── Per-station ambient body glow (drawn above the floor ring) ──────────────
//
// `AmbientShape` + `STATION_AMBIENTS` live in `./stationAmbients` (PIXI-free,
// unit-tested). Only the interpreter that draws each shape lives here.

/**
 * Walk the per-type ambient shape table and draw each shape at the given alpha.
 * Unknown furniture types contribute nothing.
 */
export function drawStationAmbient(
  g: PIXI.Graphics, obj: RoomObject, alpha: number,
) {
  const shapes = STATION_AMBIENTS[obj.furnitureType];
  if (!shapes) return;
  const dim = FURNITURE_DIMS[obj.furnitureType] ?? { w: 1, d: 1, h: 1 };
  const { wx, wy, wz } = obj;

  for (const shape of shapes) {
    switch (shape.kind) {
      case "face": {
        const x0 = wx + shape.fx0 * dim.w;
        const x1 = wx + shape.fx1 * dim.w;
        const z0 = wz + shape.fz0 * dim.h;
        const z1 = wz + shape.fz1 * dim.h;
        const y  = wy + shape.yOff;
        qfill(
          g,
          [proj(x0, y, z0), proj(x1, y, z0), proj(x1, y, z1), proj(x0, y, z1)],
          shape.color, shape.alpha * alpha,
        );
        break;
      }
      case "halo": {
        const [cx, cy] = proj(
          wx + shape.fx * dim.w,
          wy + shape.yOff,
          wz + shape.fz * dim.h,
        );
        g.ellipse(cx, cy, shape.rx, shape.ry)
          .fill({ color: shape.color, alpha: shape.alpha * alpha });
        break;
      }
      case "point": {
        const [cx, cy] = proj(
          wx + shape.fx * dim.w,
          wy + shape.yOff,
          wz + shape.fz * dim.h,
        );
        g.circle(cx, cy, shape.r)
          .fill({ color: shape.color, alpha: shape.alpha * alpha });
        break;
      }
      case "topOutline": {
        const top: [number, number][] = [
          proj(wx,            wy,            wz + dim.h),
          proj(wx + dim.w,    wy,            wz + dim.h),
          proj(wx + dim.w,    wy + dim.d,    wz + dim.h),
          proj(wx,            wy + dim.d,    wz + dim.h),
        ];
        qstroke(g, top, shape.color, shape.lineWidth, shape.alpha * alpha);
        qfill(g, top, shape.color, shape.fillAlpha * alpha);
        break;
      }
      case "custom": {
        const ctx: AmbientDrawContext = {
          proj,
          fillQuad:   (points, color, a) => qfill(g, points, color, a),
          strokeQuad: (points, color, lineWidth, a) => qstroke(g, points, color, lineWidth, a),
          circle:     (cx, cy, r, color, a) => { g.circle(cx, cy, r).fill({ color, alpha: a }); },
          ellipse:    (cx, cy, rx, ry, color, a) => { g.ellipse(cx, cy, rx, ry).fill({ color, alpha: a }); },
          dim,
        };
        shape.draw(ctx, obj, alpha);
        break;
      }
    }
  }
}

/** Red collision highlight — drawn during drag when placement is invalid */
export function drawHighlightCollision(g: PIXI.Graphics, obj: RoomObject) {
  g.clear();
  const d = FURNITURE_DIMS[obj.furnitureType] ?? { w: 2, d: 2, h: 0 };
  const { wx, wy, wz } = obj;
  // Floor footprint in red
  const floor: [number, number][] = [
    proj(wx,       wy,       wz),
    proj(wx + d.w, wy,       wz),
    proj(wx + d.w, wy + d.d, wz),
    proj(wx,       wy + d.d, wz),
  ];
  qfill(g, floor, 0xff2222, 0.28);
  qstroke(g, floor, 0xff2222, 2.5, 1.0);
  // Top face outline
  const top: [number, number][] = [
    proj(wx,       wy,       wz + d.h),
    proj(wx + d.w, wy,       wz + d.h),
    proj(wx + d.w, wy + d.d, wz + d.h),
    proj(wx,       wy + d.d, wz + d.h),
  ];
  qfill(g, top, 0xff2222, 0.18);
  qstroke(g, top, 0xff4444, 2.5, 0.9);
  top.forEach(([px, py]) => {
    g.circle(px, py, 4).fill({ color: 0xff3333, alpha: 0.9 });
  });
}

// ─── Tile grid overlay (shown in edit/move mode) ─────────────────────────────

export function drawTileGrid(g: PIXI.Graphics, cols = ROOM_TILES_X, rows = ROOM_TILES_Y) {
  g.clear();
  // Isometric tile outlines for every cell
  for (let tx = 0; tx < cols; tx++) {
    for (let ty = 0; ty < rows; ty++) {
      const pts: [number, number][] = [
        proj(tx,     ty,     0.002),
        proj(tx + 1, ty,     0.002),
        proj(tx + 1, ty + 1, 0.002),
        proj(tx,     ty + 1, 0.002),
      ];
      g.poly(pts.flatMap(([x, y]) => [x, y]))
        .fill({ color: 0x88ccff, alpha: 0.08 })
        .stroke({ color: 0x44aaff, width: 1.5, alpha: 0.7 });
    }
  }
  // Corner dots
  for (let tx = 0; tx <= cols; tx++) {
    for (let ty = 0; ty <= rows; ty++) {
      const [px, py] = proj(tx, ty, 0.003);
      g.circle(px, py, 2.5).fill({ color: 0x44aaff, alpha: 0.8 });
    }
  }
}

// ─── Legacy all-in-one (backward compat) ─────────────────────────────────────

const DEFAULT_OBJECTS: RoomObject[] = [
  { id:1,  furnitureType:"document_board", label:"Document Board",       description:"",  wx:4,  wy:8,  wz:2.25,happiness:7,  draggable:false },
  { id:2,  furnitureType:"printer",        label:"Printer Station",      description:"",  wx:9,  wy:5,  wz:0,   happiness:8,  draggable:true  },
  { id:3,  furnitureType:"bookcase",       label:"Bookcase",          description:"",  wx:1,  wy:7,  wz:0,   happiness:10, draggable:true  },
  { id:4,  furnitureType:"computer_desk",  label:"Computer Workstation", description:"",  wx:6,  wy:6,  wz:0,   happiness:14, draggable:true  },
  { id:6,  furnitureType:"bed",            label:"Wooden Bed",        description:"",  wx:6,  wy:0,  wz:0,   happiness:15, draggable:true  },
  { id:7,  furnitureType:"nightstand",     label:"Bedside Cabinet",   description:"",  wx:5,  wy:0,  wz:0,   happiness:5,  draggable:true  },
  { id:9,  furnitureType:"low_table",      label:"Meeting Table",     description:"",  wx:2,  wy:3,  wz:0,   happiness:8,  draggable:true  },
  { id:10, furnitureType:"zabuton",        label:"Meeting Cushion",   description:"",  wx:2,  wy:2,  wz:0,   happiness:4,  draggable:true  },
  { id:11, furnitureType:"zabuton",        label:"Meeting Cushion",   description:"",  wx:2,  wy:5,  wz:0,   happiness:4,  draggable:true  },
  { id:12, furnitureType:"zabuton",        label:"Reading Cushion",   description:"",  wx:0,  wy:6,  wz:0,   happiness:4,  draggable:true  },
  { id:13, furnitureType:"plant",          label:"Tropical Plant",    description:"",  wx:9,  wy:6,  wz:0,   happiness:7,  draggable:true  },
];

export function drawPixiRoom(g: PIXI.Graphics) {
  drawBackground(g);
  drawFurnitureLayer(g, DEFAULT_OBJECTS);
}

export { DEFAULT_OBJECTS };
