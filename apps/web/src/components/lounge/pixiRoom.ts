import * as PIXI from "pixi.js";

export const S = 40;
export const OX = 190;
export const OY = 446;

export function proj(wx: number, wy: number, wz: number): [number, number] {
  return [OX + wx * S + wy * S * 0.5, OY - wy * S * 0.5 - wz * S];
}

export function worldDeltaFromScreen(dx: number, dy: number): [number, number] {
  const dwy = (-2 * dy) / S;
  const dwx = dx / S + dy / S;
  return [dwx, dwy];
}

function P(pts: [number, number][]): number[] {
  return pts.flatMap(([x, y]) => [x, y]);
}

function qfill(
  g: PIXI.Graphics,
  pts: [number, number][],
  color: number,
  alpha = 1,
) {
  g.poly(P(pts)).fill({ color, alpha });
}

function qstroke(
  g: PIXI.Graphics,
  pts: [number, number][],
  color: number,
  width = 0.7,
  alpha = 0.18,
) {
  g.poly(P(pts)).stroke({ color, width, alpha });
}

function line(
  g: PIXI.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number,
  width: number,
  alpha = 1,
) {
  g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color, width, alpha });
}

function isoBox(
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
  const outline = 0x000000;
  if (topColor !== undefined) {
    const pts: [number, number][] = [
      proj(wx, wy, wz + h),
      proj(wx + w, wy, wz + h),
      proj(wx + w, wy + d, wz + h),
      proj(wx, wy + d, wz + h),
    ];
    qfill(g, pts, topColor, topAlpha);
    qstroke(g, pts, outline, 0.6, 0.1);
  }
  if (frontColor !== undefined) {
    const pts: [number, number][] = [
      proj(wx, wy, wz),
      proj(wx + w, wy, wz),
      proj(wx + w, wy, wz + h),
      proj(wx, wy, wz + h),
    ];
    qfill(g, pts, frontColor, frontAlpha);
    qstroke(g, pts, outline, 0.6, 0.1);
  }
  if (rightColor !== undefined) {
    const pts: [number, number][] = [
      proj(wx + w, wy, wz),
      proj(wx + w, wy + d, wz),
      proj(wx + w, wy + d, wz + h),
      proj(wx + w, wy, wz + h),
    ];
    qfill(g, pts, rightColor, rightAlpha);
    qstroke(g, pts, outline, 0.6, 0.12);
  }
}

export function drawPixiRoom(g: PIXI.Graphics) {
  g.clear();

  // ── FLOOR ──────────────────────────────────────────────────────────────────
  qfill(
    g,
    [proj(0, 0, 0), proj(9, 0, 0), proj(9, 7, 0), proj(0, 7, 0)],
    0xc4824a,
  );
  // Plank lines
  for (let i = 1; i < 9; i++) {
    const [ax, ay] = proj(i, 0, 0),
      [bx, by] = proj(i, 7, 0);
    line(g, ax, ay, bx, by, 0xffffff, 0.8, 0.07);
  }
  for (let j = 1; j < 7; j++) {
    const [ax, ay] = proj(0, j, 0),
      [bx, by] = proj(9, j, 0);
    line(g, ax, ay, bx, by, 0xffffff, 0.8, 0.05);
  }

  // ── BACK WALL ──────────────────────────────────────────────────────────────
  qfill(
    g,
    [proj(0, 7, 0), proj(9, 7, 0), proj(9, 7, 4.5), proj(0, 7, 4.5)],
    0xf0e9da,
  );
  // Top border (wood trim)
  qfill(
    g,
    [proj(0, 7, 4.1), proj(9, 7, 4.1), proj(9, 7, 4.5), proj(0, 7, 4.5)],
    0xb8723c,
  );
  // Baseboard
  qfill(
    g,
    [proj(0, 7, 0), proj(9, 7, 0), proj(9, 7, 0.18), proj(0, 7, 0.18)],
    0xa86030,
  );
  // Floral pattern dots on back wall
  const floralColors = [0xd4a0c0, 0xb8c8e0, 0xc8d4b0];
  for (let fi = 0; fi < 12; fi++) {
    const fwx = 0.6 + fi * 0.72;
    const fwz = 1.2 + (fi % 3) * 1.1;
    const [fpx, fpy] = proj(fwx, 6.99, fwz);
    const fc = floralColors[fi % 3]!;
    g.circle(fpx, fpy, 4.5).fill({ color: fc, alpha: 0.55 });
    g.circle(fpx + 7, fpy - 3, 3).fill({ color: fc, alpha: 0.35 });
    g.circle(fpx - 7, fpy - 3, 3).fill({ color: fc, alpha: 0.35 });
    g.circle(fpx, fpy - 8, 3).fill({ color: fc, alpha: 0.35 });
    g.circle(fpx, fpy + 8, 3).fill({ color: fc, alpha: 0.28 });
  }

  // ── LEFT WALL ──────────────────────────────────────────────────────────────
  qfill(
    g,
    [proj(0, 0, 0), proj(0, 7, 0), proj(0, 7, 4.5), proj(0, 0, 4.5)],
    0xf5efe3,
  );
  qfill(
    g,
    [proj(0, 0, 4.1), proj(0, 7, 4.1), proj(0, 7, 4.5), proj(0, 0, 4.5)],
    0xb8723c,
  );
  qfill(
    g,
    [proj(0, 0, 0), proj(0, 7, 0), proj(0, 7, 0.18), proj(0, 0, 0.18)],
    0xa86030,
  );
  // Left wall floral
  for (let fi = 0; fi < 8; fi++) {
    const fwy = 0.8 + fi * 0.8;
    const fwz = 1.0 + (fi % 3) * 1.2;
    const [fpx, fpy] = proj(0.01, fwy, fwz);
    const fc = floralColors[fi % 3]!;
    g.circle(fpx, fpy, 3.5).fill({ color: fc, alpha: 0.45 });
    g.circle(fpx + 6, fpy - 2, 2.5).fill({ color: fc, alpha: 0.28 });
    g.circle(fpx - 6, fpy - 2, 2.5).fill({ color: fc, alpha: 0.28 });
    g.circle(fpx, fpy - 7, 2.5).fill({ color: fc, alpha: 0.28 });
  }

  // ── AREA RUG ───────────────────────────────────────────────────────────────
  qfill(
    g,
    [
      proj(1.0, 1.6, 0.005),
      proj(5.2, 1.6, 0.005),
      proj(5.2, 5.4, 0.005),
      proj(1.0, 5.4, 0.005),
    ],
    0xc87848,
    0.32,
  );
  qstroke(
    g,
    [
      proj(1.0, 1.6, 0.005),
      proj(5.2, 1.6, 0.005),
      proj(5.2, 5.4, 0.005),
      proj(1.0, 5.4, 0.005),
    ],
    0x8b4820,
    1.5,
    0.38,
  );
  // Rug inner border
  qstroke(
    g,
    [
      proj(1.15, 1.75, 0.005),
      proj(5.05, 1.75, 0.005),
      proj(5.05, 5.25, 0.005),
      proj(1.15, 5.25, 0.005),
    ],
    0x8b4820,
    0.8,
    0.28,
  );

  // ── DOOR (left wall) ───────────────────────────────────────────────────────
  qfill(
    g,
    [proj(0, 0.8, 0), proj(0, 2.4, 0), proj(0, 2.4, 3.0), proj(0, 0.8, 3.0)],
    0x8b5c28,
  );
  qfill(
    g,
    [
      proj(0, 0.88, 0.04),
      proj(0, 2.32, 0.04),
      proj(0, 2.32, 2.94),
      proj(0, 0.88, 2.94),
    ],
    0xd4904e,
  );
  // Door top panel (cherry blossom window)
  qfill(
    g,
    [
      proj(0, 0.92, 1.8),
      proj(0, 2.28, 1.8),
      proj(0, 2.28, 2.88),
      proj(0, 0.92, 2.88),
    ],
    0x87ceeb,
    0.85,
  );
  // Cherry blossom tree silhouette in window
  const [twx, twy] = proj(0, 1.6, 2.3);
  g.rect(twx - 1.5, twy, 3, 22).fill({ color: 0x6b3a2a, alpha: 0.8 });
  for (let bi = 0; bi < 8; bi++) {
    const ang = (bi / 8) * Math.PI * 2;
    const bx = twx + Math.cos(ang) * 10;
    const by2 = twy - 5 + Math.sin(ang) * 6;
    g.circle(bx, by2, 6).fill({ color: 0xffb7c5, alpha: 0.75 });
  }
  g.circle(twx, twy - 8, 9).fill({ color: 0xffb7c5, alpha: 0.7 });
  // Door lower panel
  qfill(
    g,
    [
      proj(0, 0.92, 0.1),
      proj(0, 2.28, 0.1),
      proj(0, 2.28, 1.72),
      proj(0, 0.92, 1.72),
    ],
    0xc07838,
    0.9,
  );
  // Door knob
  const [dkx, dky] = proj(0, 2.0, 1.2);
  g.circle(dkx, dky, 3.5).fill(0xd4af37);
  g.circle(dkx, dky, 2).fill(0xf0c84a);

  // ── WINDOW (left wall, right of door) ────────────────────────────────────
  qfill(
    g,
    [
      proj(0, 3.2, 1.0),
      proj(0, 5.6, 1.0),
      proj(0, 5.6, 3.6),
      proj(0, 3.2, 3.6),
    ],
    0x7ab5d8,
    0.7,
  );
  // Window frame
  qstroke(
    g,
    [
      proj(0, 3.0, 0.8),
      proj(0, 5.8, 0.8),
      proj(0, 5.8, 3.8),
      proj(0, 3.0, 3.8),
    ],
    0x8b5c28,
    3,
    0.9,
  );
  // Window dividers
  const [wdx1, wdy1] = proj(0, 4.4, 0.8);
  const [wdx2, wdy2] = proj(0, 4.4, 3.8);
  line(g, wdx1, wdy1, wdx2, wdy2, 0x8b5c28, 2, 0.8);
  const [whx1, why1] = proj(0, 3.0, 2.2);
  const [whx2, why2] = proj(0, 5.8, 2.2);
  line(g, whx1, why1, whx2, why2, 0x8b5c28, 2, 0.8);
  // Curtains
  qfill(
    g,
    [
      proj(0, 2.88, 0.75),
      proj(0, 3.28, 0.75),
      proj(0, 3.28, 3.82),
      proj(0, 2.88, 3.82),
    ],
    0xe8c88a,
    0.88,
  );
  qfill(
    g,
    [
      proj(0, 5.52, 0.75),
      proj(0, 5.92, 0.75),
      proj(0, 5.92, 3.82),
      proj(0, 5.52, 3.82),
    ],
    0xe8c88a,
    0.88,
  );

  // ── TV STAND ──────────────────────────────────────────────────────────────
  isoBox(g, 0.3, 6.0, 0, 3.9, 0.8, 0.85, 0x5c3818, 0x4a2c10, 0x3c2208);
  // TV stand top surface detail
  const [tst1x, tst1y] = proj(0.35, 6.0, 0.85);
  const [tst2x, tst2y] = proj(4.15, 6.0, 0.85);
  line(g, tst1x, tst1y, tst2x, tst2y, 0x8b5c28, 0.8, 0.3);
  // Drawer handles
  for (let di = 0; di < 2; di++) {
    const dwx = 0.7 + di * 1.85;
    const [dhx, dhy] = proj(dwx + 0.6, 6.0, 0.42);
    g.rect(dhx - 12, dhy - 4, 24, 8).fill({ color: 0x2a1408, alpha: 0.5 });
    g.rect(dhx - 12, dhy - 4, 24, 8).stroke({
      color: 0x8b5c28,
      width: 0.7,
      alpha: 0.5,
    });
    g.circle(dhx, dhy, 2.5).fill(0xd4af37);
  }
  // Game controller on stand
  const [gcx, gcy] = proj(3.4, 6.0, 0.87);
  g.rect(gcx - 14, gcy - 7, 28, 14).fill({ color: 0x1a1a2e, alpha: 0.85 });
  g.rect(gcx - 14, gcy - 7, 28, 14).stroke({
    color: 0x4a4a6e,
    width: 0.6,
    alpha: 0.5,
  });
  g.circle(gcx + 5, gcy - 1, 2.5).fill(0xe74c3c);
  g.circle(gcx + 9, gcy + 2, 2).fill(0x3498db);
  // Small photo frame
  const [pfx, pfy] = proj(0.5, 6.0, 0.87);
  g.rect(pfx - 8, pfy - 12, 16, 16).fill(0x8b5c28);
  g.rect(pfx - 6, pfy - 10, 12, 12).fill(0x4a7ab0);

  // ── FLAT SCREEN TV ────────────────────────────────────────────────────────
  // TV stand/mount
  isoBox(g, 1.2, 5.95, 0.85, 1.8, 0.1, 0.12, 0x1a1a1a, 0x111111);
  // TV body
  isoBox(g, 0.4, 5.9, 0.97, 3.5, 0.12, 2.1, 0x141414, 0x1c1c1c, 0x101010);
  // Screen (slightly inset)
  qfill(
    g,
    [
      proj(0.45, 5.88, 1.02),
      proj(3.85, 5.88, 1.02),
      proj(3.85, 5.88, 2.98),
      proj(0.45, 5.88, 2.98),
    ],
    0x1a3a70,
  );
  // Screen glow/content
  qfill(
    g,
    [
      proj(0.5, 5.87, 1.07),
      proj(3.8, 5.87, 1.07),
      proj(3.8, 5.87, 2.93),
      proj(0.5, 5.87, 2.93),
    ],
    0x2855a8,
    0.8,
  );
  // Screen reflection
  qfill(
    g,
    [
      proj(0.52, 5.87, 2.4),
      proj(1.8, 5.87, 2.4),
      proj(1.8, 5.87, 2.88),
      proj(0.52, 5.87, 2.88),
    ],
    0xffffff,
    0.06,
  );

  // ── BOOKCASE ──────────────────────────────────────────────────────────────
  isoBox(g, 4.3, 6.0, 0, 2.3, 0.7, 3.6, 0x5c3818, 0x4a2c10, 0x3c2208);
  // Shelf boards
  const shelfHeights = [0.72, 1.62, 2.52, 3.42];
  shelfHeights.forEach((sh) => {
    qfill(
      g,
      [
        proj(4.3, 6.0, sh),
        proj(6.6, 6.0, sh),
        proj(6.6, 6.7, sh),
        proj(4.3, 6.7, sh),
      ],
      0x3c2208,
    );
  });
  // Books
  const bkPalette = [
    0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0xe67e22, 0x1abc9c,
    0xe91e63,
  ];
  shelfHeights.slice(0, 3).forEach((sh, ri) => {
    let bx2 = 4.34;
    for (let bi = 0; bi < 6; bi++) {
      const bw = 0.26 + Math.sin(ri * 5 + bi) * 0.06;
      const bh = 0.52 + Math.cos(ri * 2 + bi * 3) * 0.1;
      const bc = bkPalette[(ri * 4 + bi) % bkPalette.length]!;
      qfill(
        g,
        [
          proj(bx2, 6.0, sh + 0.05),
          proj(bx2 + bw, 6.0, sh + 0.05),
          proj(bx2 + bw, 6.0, sh + 0.05 + bh),
          proj(bx2, 6.0, sh + 0.05 + bh),
        ],
        bc,
      );
      // Book side
      qfill(
        g,
        [
          proj(bx2 + bw, 6.0, sh + 0.05),
          proj(bx2 + bw, 6.7, sh + 0.05),
          proj(bx2 + bw, 6.7, sh + 0.05 + bh),
          proj(bx2 + bw, 6.0, sh + 0.05 + bh),
        ],
        0x000000,
        0.25,
      );
      bx2 += bw + 0.04;
      if (bx2 > 6.5) break;
    }
  });
  // Decorative plant on top of bookcase
  const [bpsx, bpsy] = proj(5.2, 6.05, 3.6);
  g.rect(bpsx - 8, bpsy - 8, 16, 10).fill(0x8b4513);
  g.circle(bpsx, bpsy - 12, 9).fill({ color: 0x22a43a, alpha: 0.9 });
  g.circle(bpsx - 8, bpsy - 10, 7).fill({ color: 0x1a8a2e, alpha: 0.85 });
  g.circle(bpsx + 7, bpsy - 10, 7).fill({ color: 0x2ecc71, alpha: 0.8 });

  // ── HANGING SCROLL (back wall) ────────────────────────────────────────────
  // Top rod
  qfill(
    g,
    [
      proj(6.8, 7, 3.85),
      proj(8.7, 7, 3.85),
      proj(8.7, 7, 4.0),
      proj(6.8, 7, 4.0),
    ],
    0x7a4518,
  );
  // Scroll paper
  qfill(
    g,
    [
      proj(6.82, 7, 2.5),
      proj(8.68, 7, 2.5),
      proj(8.68, 7, 3.85),
      proj(6.82, 7, 3.85),
    ],
    0xfff8e8,
  );
  // Paper border/frame
  qstroke(
    g,
    [
      proj(6.82, 7, 2.5),
      proj(8.68, 7, 2.5),
      proj(8.68, 7, 3.85),
      proj(6.82, 7, 3.85),
    ],
    0xc8a040,
    1.2,
    0.5,
  );
  // Art content - autumn fox/cat silhouette
  qfill(
    g,
    [
      proj(6.9, 7, 2.58),
      proj(8.6, 7, 2.58),
      proj(8.6, 7, 3.78),
      proj(6.9, 7, 3.78),
    ],
    0xfce8c0,
    0.6,
  );
  const [artX, artY] = proj(7.75, 6.99, 3.1);
  // Fox body
  g.ellipse(artX, artY, 14, 10).fill({ color: 0xe8942a, alpha: 0.8 });
  // Fox head
  g.circle(artX + 2, artY - 14, 9).fill({ color: 0xe8942a, alpha: 0.8 });
  // Ears
  g.poly([
    artX - 4,
    artY - 20,
    artX,
    artY - 28,
    artX + 4,
    artY - 20,
  ]).fill({ color: 0xe8942a, alpha: 0.75 });
  g.poly([
    artX + 8,
    artY - 20,
    artX + 12,
    artY - 27,
    artX + 15,
    artY - 20,
  ]).fill({ color: 0xe8942a, alpha: 0.75 });
  // Tail
  g.ellipse(artX - 16, artY + 2, 8, 5).fill({
    color: 0xe8942a,
    alpha: 0.7,
  });
  // Autumn leaves around fox
  const leafColors = [0xe07830, 0xd44020, 0xe8a830];
  [
    [artX - 22, artY - 5],
    [artX + 22, artY - 8],
    [artX - 18, artY + 12],
    [artX + 18, artY + 10],
  ].forEach(([lx, ly], li) => {
    g.ellipse(lx!, ly!, 5, 3).fill({
      color: leafColors[li % 3]!,
      alpha: 0.65,
    });
  });
  // Bottom rod
  qfill(
    g,
    [
      proj(6.8, 7, 2.44),
      proj(8.7, 7, 2.44),
      proj(8.7, 7, 2.58),
      proj(6.8, 7, 2.58),
    ],
    0x7a4518,
  );
  // Hanging strings
  const [ss1x, ss1y] = proj(7.0, 7, 4.0);
  const [ss2x, ss2y] = proj(7.0, 7, 4.25);
  line(g, ss1x, ss1y, ss2x, ss2y, 0x7a4518, 1.5);
  const [ss3x, ss3y] = proj(8.5, 7, 4.0);
  const [ss4x, ss4y] = proj(8.5, 7, 4.25);
  line(g, ss3x, ss3y, ss4x, ss4y, 0x7a4518, 1.5);

  // ── WALL SHELF (back wall right) ─────────────────────────────────────────
  qfill(
    g,
    [
      proj(6.4, 7, 2.1),
      proj(8.9, 7, 2.1),
      proj(8.9, 7, 2.28),
      proj(6.4, 7, 2.28),
    ],
    0x6b4020,
  );
  // Brackets
  qfill(
    g,
    [
      proj(6.4, 7, 1.7),
      proj(6.4, 7, 2.1),
      proj(6.56, 7, 2.1),
      proj(6.56, 7, 1.7),
    ],
    0x5a3418,
  );
  qfill(
    g,
    [
      proj(8.74, 7, 1.7),
      proj(8.74, 7, 2.1),
      proj(8.9, 7, 2.1),
      proj(8.9, 7, 1.7),
    ],
    0x5a3418,
  );
  // Books on shelf
  let sbx = 6.45;
  const shelfBks = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6];
  shelfBks.forEach((bc, bi) => {
    const bw = 0.36 + (bi % 2) * 0.08;
    const bh = 0.62 + Math.sin(bi) * 0.12;
    qfill(
      g,
      [
        proj(sbx, 7, 2.28),
        proj(sbx + bw, 7, 2.28),
        proj(sbx + bw, 7, 2.28 + bh),
        proj(sbx, 7, 2.28 + bh),
      ],
      bc,
    );
    sbx += bw + 0.07;
  });
  // Lantern on shelf
  const [lsx, lsy] = proj(8.55, 6.99, 2.28);
  g.rect(lsx - 10, lsy - 26, 20, 26).fill(0x8b6914);
  g.rect(lsx - 7, lsy - 23, 14, 20).fill({ color: 0xfde68a, alpha: 0.9 });
  g.circle(lsx, lsy - 13, 22).fill({ color: 0xffd070, alpha: 0.14 });
  // Lantern top
  g.poly([lsx - 6, lsy - 26, lsx, lsy - 32, lsx + 6, lsy - 26]).fill(
    0x8b6914,
  );

  // ── POOL TABLE ────────────────────────────────────────────────────────────
  // Shadow
  qfill(
    g,
    [
      proj(1.1, 1.6, 0.002),
      proj(4.9, 1.6, 0.002),
      proj(4.9, 5.5, 0.002),
      proj(1.1, 5.5, 0.002),
    ],
    0x000000,
    0.12,
  );
  // Table frame / legs
  isoBox(g, 1.2, 1.7, 0, 3.5, 2.2, 0.75, 0x5a3012, 0x4a2608, 0x3c1e06);
  // Green felt top face
  isoBox(
    g,
    1.15,
    1.65,
    0.75,
    3.6,
    2.3,
    0.1,
    0x1a6b2a,
    0x145520,
    0x0f4018,
  );
  // Table rails (border on felt)
  qfill(
    g,
    [
      proj(1.15, 1.65, 0.85),
      proj(4.75, 1.65, 0.85),
      proj(4.75, 1.65, 0.88),
      proj(1.15, 1.65, 0.88),
    ],
    0x0d4015,
  );
  // Pocket holes (dark circles at corners)
  [
    [1.15, 1.65],
    [4.75, 1.65],
    [1.15, 3.95],
    [4.75, 3.95],
    [2.95, 1.65],
    [2.95, 3.95],
  ].forEach(([px, py]) => {
    const [hx, hy] = proj(px!, py!, 0.87);
    g.circle(hx, hy, 4).fill(0x0a2010);
  });
  // Billiard balls
  const ballColors = [
    0xffffff, 0xf5c518, 0x2255cc, 0xdd2222, 0x7722aa, 0xff7700, 0x116611,
    0xaa1111,
  ];
  // Triangle rack formation
  const rackBase = { wx: 3.1, wy: 2.5 };
  const rackPositions: [number, number][] = [
    [rackBase.wx, rackBase.wy],
    [rackBase.wx - 0.22, rackBase.wy + 0.22],
    [rackBase.wx + 0.22, rackBase.wy + 0.22],
    [rackBase.wx - 0.44, rackBase.wy + 0.44],
    [rackBase.wx, rackBase.wy + 0.44],
    [rackBase.wx + 0.44, rackBase.wy + 0.44],
  ];
  rackPositions.forEach(([bwx, bwy], i) => {
    const [bpx, bpy] = proj(bwx, bwy, 0.87);
    g.circle(bpx, bpy, 4.5).fill(ballColors[i % ballColors.length]!);
    g.circle(bpx - 1.5, bpy - 1.5, 1.5).fill({ color: 0xffffff, alpha: 0.4 });
  });
  // Cue ball
  const [cbx, cby] = proj(2.0, 3.6, 0.87);
  g.circle(cbx, cby, 4.5).fill(0xffffff);
  g.circle(cbx - 1.5, cby - 1.5, 1.5).fill({ color: 0xffffff, alpha: 0.5 });
  // Pool cue
  const [cuex1, cuey1] = proj(1.5, 4.1, 0.87);
  const [cuex2, cuey2] = proj(4.2, 1.55, 0.87);
  line(g, cuex1, cuey1, cuex2, cuey2, 0xd4a054, 3);
  line(g, cuex2, cuey2, cuex2 + 2, cuey2 - 1, 0xf0c888, 1.5, 0.5);

  // ── BED ───────────────────────────────────────────────────────────────────
  // Shadow
  qfill(
    g,
    [
      proj(5.4, 0.3, 0.002),
      proj(9.0, 0.3, 0.002),
      proj(9.0, 5.3, 0.002),
      proj(5.4, 5.3, 0.002),
    ],
    0x000000,
    0.1,
  );
  // Bed frame base
  isoBox(g, 5.4, 0.38, 0, 3.4, 5.0, 0.38, 0x3e2010, 0x2e1808, 0x241208);
  // Mattress
  isoBox(
    g,
    5.45,
    0.43,
    0.38,
    3.3,
    4.9,
    0.42,
    0xf0ecff,
    0xe8e4f5,
    0xe0dcee,
  );
  // Blue bedding (bottom half)
  isoBox(
    g,
    5.5,
    2.3,
    0.8,
    3.2,
    2.8,
    0.14,
    0x4a7ab5,
    0x3a6098,
    0x2e5080,
  );
  // Bedding fold line
  qfill(
    g,
    [
      proj(5.5, 2.3, 0.94),
      proj(8.7, 2.3, 0.94),
      proj(8.7, 2.3, 0.8),
      proj(5.5, 2.3, 0.8),
    ],
    0x5a8ac5,
  );
  // Pillows (two)
  isoBox(
    g,
    5.52,
    0.45,
    0.8,
    1.28,
    1.05,
    0.28,
    0xfafaff,
    0xeeeaff,
    0xe0d8f0,
  );
  isoBox(
    g,
    7.0,
    0.45,
    0.8,
    1.28,
    1.05,
    0.28,
    0xfafaff,
    0xeeeaff,
    0xe0d8f0,
  );
  // Headboard
  isoBox(
    g,
    5.4,
    0.32,
    0.38,
    3.4,
    0.16,
    1.15,
    0x5c3818,
    0x4a2c10,
    0x3c2208,
  );
  // Headboard panel detail
  qfill(
    g,
    [
      proj(5.55, 0.32, 0.5),
      proj(8.65, 0.32, 0.5),
      proj(8.65, 0.32, 1.4),
      proj(5.55, 0.32, 1.4),
    ],
    0x000000,
    0.08,
  );
  // Footboard
  isoBox(
    g,
    5.4,
    5.08,
    0.38,
    3.4,
    0.16,
    0.58,
    0x5c3818,
    0x4a2c10,
    0x3c2208,
  );
  // Flower pattern on bedding
  const [bfx, bfy] = proj(7.1, 3.5, 0.95);
  g.circle(bfx, bfy, 5).fill({ color: 0x8ab4e0, alpha: 0.45 });
  g.circle(bfx + 9, bfy, 3.5).fill({ color: 0x8ab4e0, alpha: 0.32 });
  g.circle(bfx - 9, bfy, 3.5).fill({ color: 0x8ab4e0, alpha: 0.32 });
  g.circle(bfx, bfy - 9, 3.5).fill({ color: 0x8ab4e0, alpha: 0.32 });
  g.circle(bfx, bfy + 9, 3.5).fill({ color: 0x8ab4e0, alpha: 0.32 });

  // ── NIGHTSTAND ────────────────────────────────────────────────────────────
  isoBox(g, 8.85, 0.42, 0, 1.0, 1.0, 0.6, 0x5c3818, 0x4a2c10, 0x3c2208);
  // Nightstand drawer
  qfill(
    g,
    [
      proj(8.85, 0.42, 0.22),
      proj(9.85, 0.42, 0.22),
      proj(9.85, 0.42, 0.48),
      proj(8.85, 0.42, 0.48),
    ],
    0x000000,
    0.12,
  );
  const [nshx, nshy] = proj(9.35, 0.42, 0.35);
  g.circle(nshx, nshy, 2).fill(0xd4af37);
  // Lantern on nightstand
  const [nlx, nly] = proj(9.15, 0.62, 0.62);
  g.rect(nlx - 9, nly - 24, 18, 24).fill(0x8b6914);
  g.rect(nlx - 6, nly - 21, 12, 17).fill({ color: 0xfde68a, alpha: 0.88 });
  g.circle(nlx - 6, nly - 21, 3).fill(0x8b6914);
  g.circle(nlx + 6, nly - 21, 3).fill(0x8b6914);
  g.poly([nlx - 7, nly - 24, nlx, nly - 31, nlx + 7, nly - 24]).fill(
    0x8b6914,
  );
  // Lantern glow
  g.circle(nlx, nly - 12, 30).fill({ color: 0xffd070, alpha: 0.13 });

  // ── LOW TABLE (chabudai) ──────────────────────────────────────────────────
  isoBox(g, 2.7, 3.8, 0, 3.0, 2.0, 0.28, 0x7a5030, 0x6a4228, 0x5a3420);
  // Table top mat (blue)
  isoBox(
    g,
    2.76,
    3.82,
    0.28,
    2.88,
    1.96,
    0.05,
    0x3a7a9a,
    0x2e6080,
    0x245070,
  );
  // Teapot
  const [tpx, tpy] = proj(4.1, 4.5, 0.35);
  g.circle(tpx, tpy, 11).fill(0x1a1a1a);
  g.circle(tpx, tpy - 11, 5).fill(0x222222);
  g.circle(tpx, tpy - 14, 2.5).fill(0x1a1a1a);
  // Spout
  g.moveTo(tpx + 8, tpy - 2)
    .lineTo(tpx + 18, tpy - 8)
    .stroke({ color: 0x1a1a1a, width: 3.5 });
  // Handle
  g.moveTo(tpx - 8, tpy - 5)
    .lineTo(tpx - 16, tpy - 10)
    .lineTo(tpx - 16, tpy + 2)
    .stroke({ color: 0x1a1a1a, width: 2.5 });
  // Tea cups
  const cupPositions: [number, number, number][] = [
    [3.1, 4.6, 0.34],
    [3.5, 4.1, 0.34],
    [4.6, 4.0, 0.34],
  ];
  cupPositions.forEach(([cwx, cwy, cwz]) => {
    const [cx, cy] = proj(cwx, cwy, cwz);
    g.circle(cx, cy, 6).fill(0x4a7a8a);
    g.circle(cx, cy, 4).fill(0x5a8a9a);
    g.circle(cx, cy + 1, 2.5).fill({ color: 0xa0c8d0, alpha: 0.5 });
  });

  // ── ZABUTON CUSHIONS (floor cushions) ─────────────────────────────────────
  // Front cushion
  isoBox(g, 2.7, 5.85, 0, 2.8, 0.85, 0.18, 0x4a5830, 0x3a4828, 0x2e3c20);
  // Left cushion
  isoBox(g, 1.35, 3.8, 0, 0.85, 1.45, 0.18, 0x4a5830, 0x3a4828, 0x2e3c20);
  // Right cushion
  isoBox(g, 5.6, 3.8, 0, 0.85, 1.45, 0.18, 0x4a5830, 0x3a4828, 0x2e3c20);

  // ── PLANT (right back corner) ─────────────────────────────────────────────
  isoBox(g, 8.2, 5.7, 0, 0.9, 0.8, 0.62, 0xc04a2a, 0xa03818, 0x882e10);
  const [psx, psy] = proj(8.65, 6.1, 0.62);
  for (let li = 0; li < 7; li++) {
    const ang = (li / 7) * Math.PI * 2 - 0.3;
    const ex = psx + Math.cos(ang) * 24;
    const ey = psy + Math.sin(ang) * 11 - 28;
    g.moveTo(psx, psy - 5)
      .lineTo(ex, ey)
      .stroke({ color: 0x1a7030, width: 2.2 });
    g.ellipse(ex, ey, 11, 7).fill({ color: 0x22a43a, alpha: 0.88 });
  }
  g.circle(psx, psy - 18, 14).fill({ color: 0x1e8a34, alpha: 0.6 });

  // ── WALL LAMP (left wall, above door) ────────────────────────────────────
  const [wlx, wly] = proj(0.01, 1.6, 3.5);
  g.rect(wlx - 3, wly - 20, 6, 8).fill(0x8b6914);
  g.poly([wlx - 10, wly - 12, wlx + 10, wly - 12, wlx + 7, wly, wlx - 7, wly]).fill(
    0xfde68a,
  );
  g.circle(wlx, wly - 8, 25).fill({ color: 0xffd070, alpha: 0.1 });
}
