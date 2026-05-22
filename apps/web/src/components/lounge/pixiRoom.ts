import * as PIXI from "pixi.js";
import type { RoomObject } from "./roomDefs";
import { FURNITURE_DIMS } from "./roomDefs";

export const S = 56;
export const OX = 100;
export const OY = 560;
export const CANVAS_W = 1080;
export const CANVAS_H = 620;

export function proj(wx: number, wy: number, wz: number): [number, number] {
  return [OX + wx * S + wy * S * 0.5, OY - wy * S * 0.5 - wz * S];
}

export function worldDeltaFromScreen(dx: number, dy: number): [number, number] {
  const dwy = (-2 * dy) / S;
  const dwx = dx / S + dy / S;
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

export function furnitureHitRect(type: string, wx: number, wy: number, wz: number): PIXI.Rectangle {
  const d = FURNITURE_DIMS[type] ?? { w: 2, d: 2, h: 1 };
  const allPts = [
    proj(wx, wy, wz),        proj(wx+d.w, wy, wz),
    proj(wx, wy+d.d, wz),    proj(wx+d.w, wy+d.d, wz),
    proj(wx, wy, wz+d.h),    proj(wx+d.w, wy, wz+d.h),
    proj(wx, wy+d.d, wz+d.h),proj(wx+d.w, wy+d.d, wz+d.h),
  ];
  const xs = allPts.map(([x]) => x);
  const ys = allPts.map(([, y]) => y);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const maxX = Math.max(...xs), maxY = Math.max(...ys);
  return new PIXI.Rectangle(minX - 4, minY - 4, maxX - minX + 8, maxY - minY + 8);
}

// ─── Background (static room shell) ──────────────────────────────────────────

export function drawBackground(g: PIXI.Graphics) {
  g.clear();

  // Floor
  qfill(g, [proj(0,0,0),proj(9,0,0),proj(9,7,0),proj(0,7,0)], 0xc4824a);
  for (let i = 1; i < 9; i++) {
    const [ax,ay]=proj(i,0,0),[bx,by]=proj(i,7,0);
    ln(g,ax,ay,bx,by,0xffffff,0.8,0.07);
  }
  for (let j = 1; j < 7; j++) {
    const [ax,ay]=proj(0,j,0),[bx,by]=proj(9,j,0);
    ln(g,ax,ay,bx,by,0xffffff,0.8,0.05);
  }

  // Back wall
  qfill(g,[proj(0,7,0),proj(9,7,0),proj(9,7,4.5),proj(0,7,4.5)],0xf0e9da);
  qfill(g,[proj(0,7,4.1),proj(9,7,4.1),proj(9,7,4.5),proj(0,7,4.5)],0xb8723c);
  qfill(g,[proj(0,7,0),proj(9,7,0),proj(9,7,0.18),proj(0,7,0.18)],0xa86030);
  const floralColors = [0xd4a0c0,0xb8c8e0,0xc8d4b0];
  for (let fi = 0; fi < 12; fi++) {
    const fwx = 0.6 + fi * 0.72, fwz = 1.2 + (fi % 3) * 1.1;
    const [fpx,fpy] = proj(fwx,6.99,fwz);
    const fc = floralColors[fi % 3]!;
    g.circle(fpx,fpy,4.5).fill({color:fc,alpha:0.55});
    g.circle(fpx+7,fpy-3,3).fill({color:fc,alpha:0.35});
    g.circle(fpx-7,fpy-3,3).fill({color:fc,alpha:0.35});
    g.circle(fpx,fpy-8,3).fill({color:fc,alpha:0.35});
  }

  // Left wall
  qfill(g,[proj(0,0,0),proj(0,7,0),proj(0,7,4.5),proj(0,0,4.5)],0xf5efe3);
  qfill(g,[proj(0,0,4.1),proj(0,7,4.1),proj(0,7,4.5),proj(0,0,4.5)],0xb8723c);
  qfill(g,[proj(0,0,0),proj(0,7,0),proj(0,7,0.18),proj(0,0,0.18)],0xa86030);
  for (let fi = 0; fi < 8; fi++) {
    const fwy = 0.8 + fi * 0.8, fwz = 1.0 + (fi % 3) * 1.2;
    const [fpx,fpy] = proj(0.01,fwy,fwz);
    const fc = floralColors[fi % 3]!;
    g.circle(fpx,fpy,3.5).fill({color:fc,alpha:0.45});
    g.circle(fpx+6,fpy-2,2.5).fill({color:fc,alpha:0.28});
    g.circle(fpx-6,fpy-2,2.5).fill({color:fc,alpha:0.28});
  }

  // Area rug
  qfill(g,[proj(1.0,1.6,0.005),proj(5.2,1.6,0.005),proj(5.2,5.4,0.005),proj(1.0,5.4,0.005)],0xc87848,0.32);
  qstroke(g,[proj(1.0,1.6,0.005),proj(5.2,1.6,0.005),proj(5.2,5.4,0.005),proj(1.0,5.4,0.005)],0x8b4820,1.5,0.38);
  qstroke(g,[proj(1.15,1.75,0.005),proj(5.05,1.75,0.005),proj(5.05,5.25,0.005),proj(1.15,5.25,0.005)],0x8b4820,0.8,0.28);

  // Door
  qfill(g,[proj(0,0.8,0),proj(0,2.4,0),proj(0,2.4,3.0),proj(0,0.8,3.0)],0x8b5c28);
  qfill(g,[proj(0,0.88,0.04),proj(0,2.32,0.04),proj(0,2.32,2.94),proj(0,0.88,2.94)],0xd4904e);
  qfill(g,[proj(0,0.92,1.8),proj(0,2.28,1.8),proj(0,2.28,2.88),proj(0,0.92,2.88)],0x87ceeb,0.85);
  const [twx,twy]=proj(0,1.6,2.3);
  g.rect(twx-1.5,twy,3,22).fill({color:0x6b3a2a,alpha:0.8});
  for(let bi=0;bi<8;bi++){const ang=(bi/8)*Math.PI*2;g.circle(twx+Math.cos(ang)*10,twy-5+Math.sin(ang)*6,6).fill({color:0xffb7c5,alpha:0.75});}
  g.circle(twx,twy-8,9).fill({color:0xffb7c5,alpha:0.7});
  qfill(g,[proj(0,0.92,0.1),proj(0,2.28,0.1),proj(0,2.28,1.72),proj(0,0.92,1.72)],0xc07838,0.9);
  const [dkx,dky]=proj(0,2.0,1.2);
  g.circle(dkx,dky,3.5).fill(0xd4af37);

  // Window
  qfill(g,[proj(0,3.2,1.0),proj(0,5.6,1.0),proj(0,5.6,3.6),proj(0,3.2,3.6)],0x7ab5d8,0.7);
  qstroke(g,[proj(0,3.0,0.8),proj(0,5.8,0.8),proj(0,5.8,3.8),proj(0,3.0,3.8)],0x8b5c28,3,0.9);
  const [wdx1,wdy1]=proj(0,4.4,0.8),[wdx2,wdy2]=proj(0,4.4,3.8);
  ln(g,wdx1,wdy1,wdx2,wdy2,0x8b5c28,2,0.8);
  const [whx1,why1]=proj(0,3.0,2.2),[whx2,why2]=proj(0,5.8,2.2);
  ln(g,whx1,why1,whx2,why2,0x8b5c28,2,0.8);
  qfill(g,[proj(0,2.88,0.75),proj(0,3.28,0.75),proj(0,3.28,3.82),proj(0,2.88,3.82)],0xe8c88a,0.88);
  qfill(g,[proj(0,5.52,0.75),proj(0,5.92,0.75),proj(0,5.92,3.82),proj(0,5.52,3.82)],0xe8c88a,0.88);

  // Wall lamp
  const [wlx,wly]=proj(0.01,1.6,3.5);
  g.rect(wlx-3,wly-20,6,8).fill(0x8b6914);
  g.poly([wlx-10,wly-12,wlx+10,wly-12,wlx+7,wly,wlx-7,wly]).fill(0xfde68a);
  g.circle(wlx,wly-8,25).fill({color:0xffd070,alpha:0.1});
}

// ─── Individual furniture draw functions ──────────────────────────────────────

export function drawBed(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  qfill(g,[proj(wx,wy,0.002),proj(wx+3.4,wy,0.002),proj(wx+3.4,wy+5.0,0.002),proj(wx,wy+5.0,0.002)],0x000000,0.1);
  isoBox(g,wx,wy,wz,3.4,5.0,0.38,0x3e2010,0x2e1808,0x241208);
  isoBox(g,wx+0.05,wy+0.05,wz+0.38,3.3,4.9,0.42,0xf0ecff,0xe8e4f5,0xe0dcee);
  isoBox(g,wx+0.1,wy+1.9,wz+0.8,3.2,2.8,0.14,0x4a7ab5,0x3a6098,0x2e5080);
  qfill(g,[proj(wx+0.1,wy+1.9,wz+0.94),proj(wx+3.3,wy+1.9,wz+0.94),proj(wx+3.3,wy+1.9,wz+0.8),proj(wx+0.1,wy+1.9,wz+0.8)],0x5a8ac5);
  isoBox(g,wx+0.12,wy+0.07,wz+0.8,1.28,1.05,0.28,0xfafaff,0xeeeaff,0xe0d8f0);
  isoBox(g,wx+1.6,wy+0.07,wz+0.8,1.28,1.05,0.28,0xfafaff,0xeeeaff,0xe0d8f0);
  isoBox(g,wx,wy,wz+0.38,3.4,0.16,1.15,0x5c3818,0x4a2c10,0x3c2208);
  isoBox(g,wx,wy+4.7,wz+0.38,3.4,0.16,0.58,0x5c3818,0x4a2c10,0x3c2208);
  const [bfx,bfy]=proj(wx+1.7,wy+2.9,wz+0.95);
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
  isoBox(g,wx,wy,wz,3.9,0.8,0.85,0x5c3818,0x4a2c10,0x3c2208);
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
  isoBox(g,wx+0.9,wy+0.1,wz,1.8,0.12,0.12,0x1a1a1a,0x111111);
  isoBox(g,wx,wy,wz,3.5,0.12,2.1,0x141414,0x1c1c1c,0x101010);
  qfill(g,[proj(wx+0.05,wy-0.02,wz+0.05),proj(wx+3.45,wy-0.02,wz+0.05),proj(wx+3.45,wy-0.02,wz+2.0),proj(wx+0.05,wy-0.02,wz+2.0)],0x1a3a70);
  qfill(g,[proj(wx+0.1,wy-0.03,wz+0.1),proj(wx+3.4,wy-0.03,wz+0.1),proj(wx+3.4,wy-0.03,wz+1.95),proj(wx+0.1,wy-0.03,wz+1.95)],0x2855a8,0.8);
}

export function drawBookcase(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  isoBox(g,wx,wy,wz,2.3,0.7,3.6,0x5c3818,0x4a2c10,0x3c2208);
  [0.72,1.62,2.52,3.42].forEach(sh=>{
    qfill(g,[proj(wx,wy,sh),proj(wx+2.3,wy,sh),proj(wx+2.3,wy+0.7,sh),proj(wx,wy+0.7,sh)],0x3c2208);
  });
  const bkPalette=[0xe74c3c,0x3498db,0x2ecc71,0xf39c12,0x9b59b6,0xe67e22,0x1abc9c,0xe91e63];
  [0.72,1.62,2.52].forEach((sh,ri)=>{
    let bx2=wx+0.04;
    for(let bi=0;bi<6;bi++){
      const bw=0.26+Math.sin(ri*5+bi)*0.06, bh=0.52+Math.cos(ri*2+bi*3)*0.1;
      const bc=bkPalette[(ri*4+bi)%bkPalette.length]!;
      qfill(g,[proj(bx2,wy,sh+0.05),proj(bx2+bw,wy,sh+0.05),proj(bx2+bw,wy,sh+0.05+bh),proj(bx2,wy,sh+0.05+bh)],bc);
      qfill(g,[proj(bx2+bw,wy,sh+0.05),proj(bx2+bw,wy+0.7,sh+0.05),proj(bx2+bw,wy+0.7,sh+0.05+bh),proj(bx2+bw,wy,sh+0.05+bh)],0x000000,0.25);
      bx2+=bw+0.04; if(bx2>wx+2.2) break;
    }
  });
  const [bpsx,bpsy]=proj(wx+0.9,wy+0.05,3.6);
  g.rect(bpsx-8,bpsy-8,16,10).fill(0x8b4513);
  g.circle(bpsx,bpsy-12,9).fill({color:0x22a43a,alpha:0.9});
  g.circle(bpsx-8,bpsy-10,7).fill({color:0x1a8a2e,alpha:0.85});
  g.circle(bpsx+7,bpsy-10,7).fill({color:0x2ecc71,alpha:0.8});
}

export function drawHangingScroll(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  qfill(g,[proj(wx,wy,wz+1.35),proj(wx+1.9,wy,wz+1.35),proj(wx+1.9,wy,wz+1.5),proj(wx,wy,wz+1.5)],0x7a4518);
  qfill(g,[proj(wx+0.02,wy,wz+0.0),proj(wx+1.88,wy,wz+0.0),proj(wx+1.88,wy,wz+1.35),proj(wx+0.02,wy,wz+1.35)],0xfff8e8);
  qstroke(g,[proj(wx+0.02,wy,wz+0.0),proj(wx+1.88,wy,wz+0.0),proj(wx+1.88,wy,wz+1.35),proj(wx+0.02,wy,wz+1.35)],0xc8a040,1.2,0.5);
  qfill(g,[proj(wx+0.1,wy,wz+0.08),proj(wx+1.8,wy,wz+0.08),proj(wx+1.8,wy,wz+1.28),proj(wx+0.1,wy,wz+1.28)],0xfce8c0,0.6);
  const [artX,artY]=proj(wx+0.95,wy-0.01,wz+0.72);
  g.ellipse(artX,artY,14,10).fill({color:0xe8942a,alpha:0.8});
  g.circle(artX+2,artY-14,9).fill({color:0xe8942a,alpha:0.8});
  g.poly([artX-4,artY-20,artX,artY-28,artX+4,artY-20]).fill({color:0xe8942a,alpha:0.75});
  g.poly([artX+8,artY-20,artX+12,artY-27,artX+15,artY-20]).fill({color:0xe8942a,alpha:0.75});
  g.ellipse(artX-16,artY+2,8,5).fill({color:0xe8942a,alpha:0.7});
  [[artX-22,artY-5],[artX+22,artY-8],[artX-18,artY+12],[artX+18,artY+10]].forEach(([lx,ly],li)=>{
    g.ellipse(lx!,ly!,5,3).fill({color:[0xe07830,0xd44020,0xe8a830][li%3]!,alpha:0.65});
  });
  qfill(g,[proj(wx,wy,wz-0.06),proj(wx+1.9,wy,wz-0.06),proj(wx+1.9,wy,wz+0.08),proj(wx,wy,wz+0.08)],0x7a4518);
  const [ss1x,ss1y]=proj(wx+0.2,wy,wz+1.5), [ss2x,ss2y]=proj(wx+0.2,wy,wz+1.75);
  ln(g,ss1x,ss1y,ss2x,ss2y,0x7a4518,1.5);
  const [ss3x,ss3y]=proj(wx+1.7,wy,wz+1.5), [ss4x,ss4y]=proj(wx+1.7,wy,wz+1.75);
  ln(g,ss3x,ss3y,ss4x,ss4y,0x7a4518,1.5);
}

export function drawWallShelf(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  qfill(g,[proj(wx,wy,wz),proj(wx+2.5,wy,wz),proj(wx+2.5,wy,wz+0.18),proj(wx,wy,wz+0.18)],0x6b4020);
  qfill(g,[proj(wx,wy,wz-0.4),proj(wx,wy,wz),proj(wx+0.16,wy,wz),proj(wx+0.16,wy,wz-0.4)],0x5a3418);
  qfill(g,[proj(wx+2.34,wy,wz-0.4),proj(wx+2.34,wy,wz),proj(wx+2.5,wy,wz),proj(wx+2.5,wy,wz-0.4)],0x5a3418);
  const shelfBks=[0xe74c3c,0x3498db,0x2ecc71,0xf39c12,0x9b59b6];
  let sbx=wx+0.05;
  shelfBks.forEach((bc,bi)=>{
    const bw=0.36+(bi%2)*0.08, bh=0.62+Math.sin(bi)*0.12;
    qfill(g,[proj(sbx,wy,wz+0.18),proj(sbx+bw,wy,wz+0.18),proj(sbx+bw,wy,wz+0.18+bh),proj(sbx,wy,wz+0.18+bh)],bc);
    sbx+=bw+0.07;
  });
  const [lsx,lsy]=proj(wx+2.15,wy-0.01,wz+0.18);
  g.rect(lsx-10,lsy-26,20,26).fill(0x8b6914);
  g.rect(lsx-7,lsy-23,14,20).fill({color:0xfde68a,alpha:0.9});
  g.circle(lsx,lsy-13,22).fill({color:0xffd070,alpha:0.14});
  g.poly([lsx-6,lsy-26,lsx,lsy-32,lsx+6,lsy-26]).fill(0x8b6914);
}

export function drawPoolTable(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  qfill(g,[proj(wx,wy,0.002),proj(wx+3.6,wy,0.002),proj(wx+3.6,wy+2.3,0.002),proj(wx,wy+2.3,0.002)],0x000000,0.12);
  isoBox(g,wx+0.05,wy+0.05,wz,3.5,2.2,0.72,0x5a3012,0x4a2608,0x3c1e06);
  isoBox(g,wx,wy,wz+0.72,3.6,2.3,0.1,0x1a6b2a,0x145520,0x0f4018);
  qfill(g,[proj(wx,wy,wz+0.82),proj(wx+3.6,wy,wz+0.82),proj(wx+3.6,wy,wz+0.85),proj(wx,wy,wz+0.85)],0x0d4015);
  [[wx,wy],[wx+3.6,wy],[wx,wy+2.3],[wx+3.6,wy+2.3],[wx+1.8,wy],[wx+1.8,wy+2.3]].forEach(([px,py])=>{
    const [hx,hy]=proj(px!,py!,wz+0.83);
    g.circle(hx,hy,4).fill(0x0a2010);
  });
  const ballColors=[0xffffff,0xf5c518,0x2255cc,0xdd2222,0x7722aa,0xff7700,0x116611,0xaa1111];
  const rb={wx:wx+2.1,wy:wy+0.8};
  const rackPos:[[number,number]][]=[[[rb.wx,rb.wy]],[[rb.wx-0.22,rb.wy+0.22]],[[rb.wx+0.22,rb.wy+0.22]],[[rb.wx-0.44,rb.wy+0.44]],[[rb.wx,rb.wy+0.44]],[[rb.wx+0.44,rb.wy+0.44]]];
  rackPos.forEach(([[bwx,bwy]],i)=>{
    const [bpx,bpy]=proj(bwx,bwy,wz+0.84);
    g.circle(bpx,bpy,4.5).fill(ballColors[i%ballColors.length]!);
    g.circle(bpx-1.5,bpy-1.5,1.5).fill({color:0xffffff,alpha:0.4});
  });
  const [cbx,cby]=proj(wx+1.0,wy+1.5,wz+0.84);
  g.circle(cbx,cby,4.5).fill(0xffffff);
  const [c1x,c1y]=proj(wx+0.3,wy+2.1,wz+0.84), [c2x,c2y]=proj(wx+3.0,wy+0.55,wz+0.84);
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
  isoBox(g,wx,wy,wz,2.8,0.85,0.18,0x4a5830,0x3a4828,0x2e3c20);
}

export function drawPlant(g: PIXI.Graphics, wx: number, wy: number, wz: number) {
  isoBox(g,wx,wy,wz,0.9,0.8,0.62,0xc04a2a,0xa03818,0x882e10);
  const [psx,psy]=proj(wx+0.45,wy+0.4,wz+0.62);
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
  // Glow pulse dots at corners
  top.forEach(([px, py]) => {
    g.circle(px, py, 4).fill({ color: 0xffd060, alpha: 0.85 });
  });
}

// ─── Legacy all-in-one (backward compat) ─────────────────────────────────────

const DEFAULT_OBJECTS: RoomObject[] = [
  { id:1,  furnitureType:"hanging_scroll", label:"Autumn Fox Scroll", description:"",  wx:7.0,  wy:6.9,  wz:2.5, happiness:6,  draggable:false },
  { id:2,  furnitureType:"wall_shelf",     label:"Wall Shelf",        description:"",  wx:6.4,  wy:6.9,  wz:2.1, happiness:5,  draggable:false },
  { id:3,  furnitureType:"bookcase",       label:"Bookcase",          description:"",  wx:4.3,  wy:6.0,  wz:0,   happiness:10, draggable:true  },
  { id:4,  furnitureType:"tv_stand",       label:"TV Stand",          description:"",  wx:0.3,  wy:6.0,  wz:0,   happiness:8,  draggable:true  },
  { id:5,  furnitureType:"tv",             label:"Flat Screen TV",    description:"",  wx:0.4,  wy:5.9,  wz:0.97,happiness:12, draggable:false },
  { id:6,  furnitureType:"bed",            label:"Wooden Bed",        description:"",  wx:5.4,  wy:0.38, wz:0,   happiness:15, draggable:true  },
  { id:7,  furnitureType:"nightstand",     label:"Nightstand",        description:"",  wx:8.85, wy:0.42, wz:0,   happiness:5,  draggable:true  },
  { id:8,  furnitureType:"pool_table",     label:"Pool Table",        description:"",  wx:1.2,  wy:1.7,  wz:0,   happiness:20, draggable:true  },
  { id:9,  furnitureType:"low_table",      label:"Tea Table",         description:"",  wx:2.7,  wy:3.8,  wz:0,   happiness:8,  draggable:true  },
  { id:10, furnitureType:"zabuton",        label:"Floor Cushion",     description:"",  wx:2.7,  wy:5.85, wz:0,   happiness:4,  draggable:true  },
  { id:11, furnitureType:"zabuton",        label:"Floor Cushion",     description:"",  wx:1.35, wy:3.8,  wz:0,   happiness:4,  draggable:true  },
  { id:12, furnitureType:"zabuton",        label:"Floor Cushion",     description:"",  wx:5.6,  wy:3.8,  wz:0,   happiness:4,  draggable:true  },
  { id:13, furnitureType:"plant",          label:"Tropical Plant",    description:"",  wx:8.2,  wy:5.7,  wz:0,   happiness:7,  draggable:true  },
];

export function drawPixiRoom(g: PIXI.Graphics) {
  drawBackground(g);
  drawFurnitureLayer(g, DEFAULT_OBJECTS);
}

export { DEFAULT_OBJECTS };
