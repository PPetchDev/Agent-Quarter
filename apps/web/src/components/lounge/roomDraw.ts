// roomDraw.ts — kept for reference only; all rendering is now in pixiRoom.ts
import type { RoomTheme } from './themes';

const S = 40, OX = 190, OY = 446;
type DrawLayout = 'studio' | 'focus' | 'sleepover';

type DrawRoomOptions = {
  layout?: DrawLayout;
};

export function proj(wx: number, wy: number, wz: number): [number, number] {
  return [OX + wx * S + wy * S * 0.5, OY - wy * S * 0.5 - wz * S];
}

export function worldDeltaFromScreen(dx: number, dy: number): [number, number] {
  const dwy = (-2 * dy) / S;
  const dwx = dx / S + dy / S;
  return [dwx, dwy];
}

function Q(ctx: CanvasRenderingContext2D, pts: [number,number][], fill?: string | CanvasGradient, stroke?: string, lw = 0.6) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill)   { ctx.fillStyle = fill;    ctx.fill();  }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function LG(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

function RG(ctx: CanvasRenderingContext2D, x0: number, y0: number, r0: number, x1: number, y1: number, r1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

function BOX(ctx: CanvasRenderingContext2D, wx: number, wy: number, wz: number, w: number, d: number, h: number, cT?: string | CanvasGradient, cF?: string | CanvasGradient, cR?: string | CanvasGradient) {
  const st = 'rgba(0,0,0,0.1)';
  if (cT) Q(ctx, [proj(wx,wy,wz+h), proj(wx+w,wy,wz+h), proj(wx+w,wy+d,wz+h), proj(wx,wy+d,wz+h)], cT, st);
  if (cF) Q(ctx, [proj(wx,wy,wz),   proj(wx+w,wy,wz),   proj(wx+w,wy,wz+h),   proj(wx,wy,wz+h)],   cF, st);
  if (cR) Q(ctx, [proj(wx+w,wy,wz), proj(wx+w,wy+d,wz), proj(wx+w,wy+d,wz+h), proj(wx+w,wy,wz+h)], cR, st);
}

function SHD(ctx: CanvasRenderingContext2D, wx: number, wy: number, w: number, d: number, a = 0.15) {
  ctx.save(); ctx.globalAlpha = a;
  Q(ctx, [proj(wx,wy,0), proj(wx+w,wy,0), proj(wx+w,wy+d,0), proj(wx,wy+d,0)], 'rgba(40,20,80,0.55)');
  ctx.restore();
}

export function drawRoom(ctx: CanvasRenderingContext2D, T: RoomTheme, themeName: string, options: DrawRoomOptions = {}) {
  // Clear to transparent — parent div provides the sky gradient background seamlessly
  ctx.clearRect(0, 0, 860, 500);
  const layout = options.layout ?? 'studio';
  const setups: Record<DrawLayout, { shelfX: number; tableX: number; tableY: number; chairAx: number; chairAy: number; chairBx: number; chairBy: number; deskDx: number; deskDy: number; blanket: string }> = {
    studio: { shelfX: 2.62, tableX: 3.42, tableY: 2.62, chairAx: 2.32, chairAy: 1.72, chairBx: 4.88, chairBy: 3.12, deskDx: 0, deskDy: 0, blanket: T.blanket },
    focus: { shelfX: 2.4, tableX: 3.78, tableY: 2.82, chairAx: 2.68, chairAy: 1.9, chairBx: 5.2, chairBy: 3.38, deskDx: 0.3, deskDy: 0.2, blanket: '#7ea8f0' },
    sleepover: { shelfX: 2.82, tableX: 3.52, tableY: 2.88, chairAx: 2.42, chairAy: 1.96, chairBx: 5.0, chairBy: 3.5, deskDx: 0.18, deskDy: 0.28, blanket: '#ef9ab8' },
  };
  const setup = setups[layout];

  // Distant stars
  ctx.fillStyle = 'rgba(255,244,170,0.86)';
  [[24,18],[112,36],[176,22],[268,44],[352,30],[430,15],[498,42],[576,20],[652,38],[726,25],[792,14],[846,34]].forEach(([sx, sy]) => {
    ctx.fillRect(sx, sy, 1.7, 1.7);
  });

  // Stars
  if (themeName === 'night' || themeName === 'dawn') {
    [[60,26],[115,12],[185,34],[275,16],[365,24],[455,7],[545,19],[642,11],[712,28],[792,7],[835,21]].forEach(([sx,sy]) => {
      ctx.beginPath(); ctx.arc(sx, sy, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.fill();
    });
  }

  // Moon
  if (T.hasMoon) {
    const [mx, my] = [696, 38];
    ctx.beginPath(); ctx.arc(mx, my, 21, 0, Math.PI * 2);
    ctx.fillStyle = RG(ctx, mx-5, my-4, 2, mx, my, 21, [[0,'#fff8e0'],[0.6,'#fde68a'],[1,'#f4a020']]);
    ctx.fill();
    ctx.beginPath(); ctx.arc(mx+7, my-3, 11, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,3,26,0.84)'; ctx.fill();
    ctx.fillStyle = RG(ctx, mx, my, 19, mx, my, 52, [[0,'rgba(253,230,138,0.18)'],[1,'transparent']]);
    ctx.beginPath(); ctx.arc(mx, my, 52, 0, Math.PI * 2); ctx.fill();
  }

  // Sun
  if (T.hasSun) {
    const sx2 = 700, sy2 = Math.round(T.sunY * 210 + 15);
    ctx.fillStyle = RG(ctx, sx2, sy2, 7, sx2, sy2, 80, [[0, T.sunGlow],[1,'transparent']]);
    ctx.beginPath(); ctx.arc(sx2, sy2, 80, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx2, sy2, 18, 0, Math.PI * 2);
    ctx.fillStyle = RG(ctx, sx2-4, sy2-4, 2, sx2, sy2, 18, [[0,'#fffde8'],[0.5, T.sunCol],[1, T.sunCol+'aa']]);
    ctx.fill();
  }

  // Back wall
  Q(ctx, [proj(0,7,0),proj(9,7,0),proj(9,7,4.5),proj(0,7,4.5)],
    LG(ctx, proj(0,7,4.5)[0],proj(0,7,4.5)[1],proj(0,7,0)[0],proj(0,7,0)[1],[[0,'#f0f2f7'],[0.55,'#e4e8f0'],[1,'#d5d9e3']]),
    'rgba(0,0,0,0.07)');
  Q(ctx, [proj(0,7,0),proj(9,7,0),proj(9,7,0.13),proj(0,7,0.13)], 'rgba(0,0,0,0.12)');

  // Left wall
  Q(ctx, [proj(0,0,0),proj(0,7,0),proj(0,7,4.5),proj(0,0,4.5)],
    LG(ctx, proj(0,0,4.5)[0],proj(0,0,4.5)[1],proj(0,7,0)[0],proj(0,7,0)[1],[[0,'#f8fbff'],[0.5,'#f1f4fb'],[1,'#e8edf8']]),
    'rgba(0,0,0,0.05)');
  Q(ctx, [proj(0,0,0),proj(0,7,0),proj(0,7,0.13),proj(0,0,0.13)], 'rgba(0,0,0,0.1)');

  // Floor
  Q(ctx, [proj(0,0,0),proj(9,0,0),proj(9,7,0),proj(0,7,0)],
    LG(ctx, proj(0,0,0)[0],proj(0,0,0)[1],proj(9,7,0)[0],proj(9,7,0)[1],[[0,'#d6945e'],[0.55,'#c9864f'],[1,'#b77743']]),
    'rgba(0,0,0,0.05)');
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 0.7;
  for (let i=1;i<9;i++){const a=proj(i,0,0),b=proj(i,7,0);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}
  for (let j=1;j<7;j++){const a=proj(0,j,0),b=proj(9,j,0);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}

  // Exterior building facade under the floor to mimic rooftop cutaway dorm view
  Q(
    ctx,
    [proj(0,0,0), proj(9,0,0), proj(9,0,-2.2), proj(0,0,-2.2)],
    LG(ctx, proj(0,0,0)[0], proj(0,0,0)[1], proj(9,0,-2.2)[0], proj(9,0,-2.2)[1], [[0, '#9d88aa'], [1, '#7f6c8d']]),
    'rgba(0,0,0,0.18)',
    1.1,
  );
  Q(
    ctx,
    [proj(9,0,0), proj(9,7,0), proj(9,7,-2.2), proj(9,0,-2.2)],
    LG(ctx, proj(9,0,0)[0], proj(9,0,0)[1], proj(9,7,-2.2)[0], proj(9,7,-2.2)[1], [[0, '#8f7a9d'], [1, '#6e5e7d']]),
    'rgba(0,0,0,0.2)',
    1.1,
  );
  [[1.2,0,-1.55,1.1,.7],[3.0,0,-1.5,1.1,.7],[4.8,0,-1.45,1.1,.7],[6.6,0,-1.4,1.1,.7]].forEach(([x, y, z, w, h]) => {
    Q(ctx, [proj(x,y,z),proj(x+w,y,z),proj(x+w,y,z+h),proj(x,y,z+h)], 'rgba(255,226,156,0.72)');
  });
  [[9,1.2,-1.5,.7,1.0],[9,3.0,-1.45,.7,1.0],[9,4.8,-1.4,.7,1.0]].forEach(([x, y, z, d, h]) => {
    Q(ctx, [proj(x,y,z),proj(x,y+d,z),proj(x,y+d,z+h),proj(x,y,z+h)], 'rgba(255,226,156,0.68)');
  });

  // Partition walls to match dorm/office split
  BOX(ctx, 2.02, 2.9, 0, 4.2, .12, 1.45, '#f5f7fb', '#d7dce6', '#ccd2de');
  BOX(ctx, 2.86, 2.92, 0, .12, 2.0, 1.45, '#f5f7fb', '#d7dce6', '#ccd2de');
  BOX(ctx, 4.95, 2.92, 0, .12, 1.9, 1.45, '#f5f7fb', '#d7dce6', '#ccd2de');

  // Rug
  ctx.save(); ctx.globalAlpha = 0.4;
  Q(ctx, [proj(2.3,1.7,0),proj(6.9,1.7,0),proj(6.9,6.3,0),proj(2.3,6.3,0)], 'rgba(146,95,182,0.16)');
  ctx.restore();
  Q(ctx, [proj(2.3,1.7,0),proj(6.9,1.7,0),proj(6.9,6.3,0),proj(2.3,6.3,0)], undefined, 'rgba(146,95,182,0.34)', 1.2);

  // Ambient
  ctx.fillStyle = RG(ctx, 430, 350, 10, 430, 350, 380, [[0, T.amb],[1,'transparent']]);
  ctx.fillRect(0, 0, 860, 500);

  // Window frame
  Q(ctx, [proj(0,.95,.72),proj(0,5.75,.72),proj(0,5.75,4.02),proj(0,.95,4.02)], T.lwA, 'rgba(0,0,0,0.07)', 3);
  // Window sky
  const wC = T.winSky;
  const wA=proj(0,1.1,.88), wB=proj(0,5.6,.88), wD=proj(0,5.6,3.88), wE=proj(0,1.1,3.88);
  Q(ctx, [wA,wB,wD,wE], LG(ctx, wE[0],wE[1],wA[0],wA[1], wC.map((c,i):[number,string]=>[i/(wC.length-1),c])));
  // Buildings
  [[1.3,3.2,1.1],[1.65,3.55,1.5],[2.05,3.8,1.2],[2.5,3.95,1.7],[2.95,3.7,1.1],[3.35,4.1,1.65],[3.8,3.6,1.0],[4.2,4.15,1.4],[4.65,3.75,1.1],[5.05,3.95,.9]].forEach(([by2,,bh]) => {
    const bc = themeName==='night'?'rgba(10,4,38,0.9)':(themeName==='dawn'||themeName==='evening')?'rgba(15,5,40,0.65)':'rgba(20,30,60,0.4)';
    Q(ctx, [proj(0,by2,.88),proj(0,by2+.28,.88),proj(0,by2+.28,.88+bh*.55),proj(0,by2,.88+bh*.55)], bc);
    if (themeName==='night'||themeName==='dawn') {
      ctx.fillStyle = 'rgba(253,230,138,0.48)';
      [.2,.45,.65].forEach(tz => {
        if (Math.random() > .5) { const lp=proj(0,by2+.07,.88+bh*tz*.55); ctx.fillRect(lp[0]+.5,lp[1]-2,3,2); }
      });
    }
  });
  if (T.hasMoon) {
    const wm=proj(0,3.5,3.05);
    ctx.beginPath(); ctx.arc(wm[0]+.5,wm[1],8,0,Math.PI*2);
    ctx.fillStyle=RG(ctx,wm[0]-1,wm[1]-1,1,wm[0]+.5,wm[1],8,[[0,'#fff8e0'],[.7,'#fde68a'],[1,'rgba(253,210,50,0.2)']]);
    ctx.fill();
  }
  if (T.hasSun) {
    const sunWy=1.15+T.sunY*(5.6-1.1);
    const sunWz=Math.max(.95, T.sunY<.5?3.85-T.sunY*2:3.85-T.sunY*1.5);
    const sw=proj(0,sunWy,sunWz);
    ctx.fillStyle=RG(ctx,sw[0]+.5,sw[1],8,sw[0]+.5,sw[1],28,[[0,T.sunGlow],[1,'transparent']]);
    ctx.beginPath(); ctx.arc(sw[0]+.5,sw[1],28,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sw[0]+.5,sw[1],10,0,Math.PI*2);
    ctx.fillStyle=RG(ctx,sw[0]-2,sw[1]-2,1,sw[0]+.5,sw[1],10,[[0,'#fffde8'],[.5,T.sunCol],[1,T.sunCol+'88']]);
    ctx.fill();
  }
  // Window dividers
  ctx.strokeStyle=T.lwA; ctx.lineWidth=4;
  const wd1=proj(0,3.35,.82),wd2=proj(0,3.35,4.02); ctx.beginPath();ctx.moveTo(wd1[0],wd1[1]);ctx.lineTo(wd2[0],wd2[1]);ctx.stroke();
  const wh1=proj(0,.95,2.38),wh2=proj(0,5.75,2.38); ctx.beginPath();ctx.moveTo(wh1[0],wh1[1]);ctx.lineTo(wh2[0],wh2[1]);ctx.stroke();
  // Curtains
  Q(ctx,[proj(0,.76,.68),proj(0,1.24,.68),proj(0,1.2,4.04),proj(0,.76,4.04)],T.curtain,'rgba(200,190,220,0.3)',.8);
  Q(ctx,[proj(0,5.36,.68),proj(0,5.84,.68),proj(0,5.84,4.04),proj(0,5.4,4.04)],T.curtain,'rgba(200,190,220,0.3)',.8);

  // Minimal wall accent (avoid noisy decorative props)
  Q(ctx,[proj(.9,7,2.24),proj(2.26,7,2.24),proj(2.26,7,3.62),proj(.9,7,3.62)],'#f5f7fb','rgba(0,0,0,0.12)',1.5);
  Q(ctx,[proj(1.08,7,2.44),proj(2.08,7,2.44),proj(2.08,7,3.42),proj(1.08,7,3.42)],
    LG(ctx,proj(1.08,7,3.42)[0],proj(1.08,7,3.42)[1],proj(1.08,7,2.44)[0],proj(1.08,7,2.44)[1],[[0,'#c4d6ff'],[1,'#88aceb']]));

  // Bookshelf
  SHD(ctx,setup.shelfX,6.52,3.76,.48,.22);
  Q(ctx,[proj(setup.shelfX,7,0),proj(setup.shelfX+3.76,7,0),proj(setup.shelfX+3.76,7,4.18),proj(setup.shelfX,7,4.18)],'#5c3818');
  BOX(ctx,setup.shelfX,6.52,0,3.76,.48,4.18,T.woodT,'#6b4820','#5a3818');
  [.7,1.42,2.16,2.92].forEach(sz=>Q(ctx,[proj(2.64,6.52,sz),proj(6.36,6.52,sz),proj(6.36,7,sz),proj(2.64,7,sz)],'#7a5828','rgba(0,0,0,0.2)',.5));
  const bkC=['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6','#e11d48'];
  [0,.7,1.42,2.16].forEach((sz,ri) => {
    let bx=setup.shelfX + 0.05;
    for(let bi=0;bi<11;bi++){
      const bw=.24+Math.sin(ri*4+bi+1)*.07, bh=.54+Math.cos(ri*2+bi)*.1, bc=bkC[(ri*5+bi)%bkC.length]!;
      Q(ctx,[proj(bx,6.52,sz+.06),proj(bx+bw,6.52,sz+.06),proj(bx+bw,6.52,sz+.06+bh),proj(bx,6.52,sz+.06+bh)],bc);
      Q(ctx,[proj(bx+bw,6.52,sz+.06),proj(bx+bw,7,sz+.06),proj(bx+bw,7,sz+.06+bh),proj(bx+bw,6.52,sz+.06+bh)],'rgba(0,0,0,0.28)');
      const r=parseInt(bc.slice(1,3),16),g2=parseInt(bc.slice(3,5),16),b2=parseInt(bc.slice(5,7),16);
      Q(ctx,[proj(bx,6.52,sz+.06+bh),proj(bx+bw,6.52,sz+.06+bh),proj(bx+bw,7,sz+.06+bh),proj(bx,7,sz+.06+bh)],
        `rgb(${Math.min(255,r+45)},${Math.min(255,g2+45)},${Math.min(255,b2+45)})`);
      bx+=bw+.04; if(bx>setup.shelfX + 3.63) break;
    }
  });
  BOX(ctx,setup.shelfX + 0.06,6.62,4.18,.35,.26,.58,'#4ade80','#22c55e','#15803d');
  BOX(ctx,setup.shelfX + 3.18,6.62,4.18,.35,.26,.66,'#f0abfc','#d880e8','#a060c0');

  // Bed
  SHD(ctx,5.58,.36,3.24,4.84,.19);
  BOX(ctx,5.58,.36,0,3.24,.14,1.3,LG(ctx,proj(5.58,.36,0)[0],proj(5.58,.36,0)[1],proj(8.82,.36,0)[0],proj(8.82,.36,0)[1],[[0,T.woodT],[1,T.woodF]]),T.woodS);
  BOX(ctx,5.58,.5,0,3.24,4.84,.3,T.woodF,T.woodS);
  BOX(ctx,5.58,5.08,0,3.24,.14,.72,LG(ctx,proj(5.58,5.08,0)[0],proj(5.58,5.08,0)[1],proj(8.82,5.08,0)[0],proj(8.82,5.08,0)[1],[[0,T.woodT],[1,T.woodF]]),T.woodS);
  BOX(ctx,5.61,.52,.3,3.18,4.56,.37,T.bedTop,T.bedS,T.bedS+'aa');
  BOX(ctx,5.62,2.38,.67,3.16,2.62,.15,setup.blanket,setup.blanket+'aa',setup.blanket+'88');
  Q(ctx,[proj(5.62,2.38,.82),proj(8.78,2.38,.82),proj(8.78,2.38,.67),proj(5.62,2.38,.67)],setup.blanket+'cc');
  [[5.64,.54,.67,1.14,1.0],[6.9,.54,.67,1.12,1.0]].forEach(([bx2,by2,bz2,w2,d2]) =>
    BOX(ctx,bx2,by2,bz2,w2,d2,.22,'#fafaff','#eeeaff','#e0daf5'));
  SHD(ctx,5.44,.36,.97,.62,.18);
  BOX(ctx,5.44,.36,0,.97,.62,.72,T.woodT,T.woodF,T.woodS);
  const lb=proj(5.74,.5,.72);
  ctx.strokeStyle='#9a7828'; ctx.lineWidth=2.3;
  ctx.beginPath();ctx.moveTo(lb[0]+1,lb[1]-3);ctx.lineTo(lb[0]+2,lb[1]-22);ctx.stroke();
  ctx.fillStyle='#fde68a';
  ctx.beginPath();ctx.moveTo(lb[0]-7,lb[1]-22);ctx.lineTo(lb[0]+11,lb[1]-22);ctx.lineTo(lb[0]+8,lb[1]-33);ctx.lineTo(lb[0]-4,lb[1]-33);ctx.closePath();ctx.fill();
  if(T.lampOn){
    ctx.fillStyle=RG(ctx,lb[0]+2,lb[1]-20,1,lb[0]+2,lb[1]-20,46,[[0,'rgba(255,210,80,0.17)'],[1,'transparent']]);
    ctx.beginPath();ctx.arc(lb[0]+2,lb[1]-20,46,0,Math.PI*2);ctx.fill();
  }

  // Chairs
  function chair(wx: number, wy: number) {
    SHD(ctx,wx,wy,1.78,1.88,.22);
    [[.14,.14],[1.5,.14],[.14,1.6],[1.5,1.6]].forEach(([lx,ly]) => BOX(ctx,wx+lx,wy+ly,0,.09,.09,.3,'#8b3020','#6b2010'));
    BOX(ctx,wx,wy,.3,1.78,1.88,.33,LG(ctx,proj(wx,wy,.3)[0],proj(wx,wy,.3)[1],proj(wx+1.78,wy+1.88,.3)[0],proj(wx+1.78,wy+1.88,.3)[1],[[0,T.chairT],[1,T.chairF]]),T.chairF,T.chairS);
    BOX(ctx,wx,wy,.63,1.78,.28,.98,T.chairT,T.chairF,T.chairS);
    BOX(ctx,wx,wy,.63,.2,1.88,.35,T.chairF,T.chairS);
    BOX(ctx,wx+1.58,wy,.63,.2,1.88,.35,T.chairF,T.chairS);
  }
  chair(setup.chairAx, setup.chairAy); chair(setup.chairBx, setup.chairBy);

  // Coffee table
  SHD(ctx,setup.tableX,setup.tableY,2.06,1.58,.19);
  BOX(ctx,setup.tableX,setup.tableY,.06,2.06,1.58,.46,LG(ctx,proj(setup.tableX,setup.tableY,.52)[0],proj(setup.tableX,setup.tableY,.52)[1],proj(setup.tableX+2.06,setup.tableY+1.58,.52)[0],proj(setup.tableX+2.06,setup.tableY+1.58,.52)[1],[[0,T.woodT],[1,T.woodF]]),T.woodF,T.woodS);
  BOX(ctx,setup.tableX + 0.26,setup.tableY + 0.23,.52,.24,.24,.29,'#f0abfc','rgba(200,150,230,0.7)');
  BOX(ctx,setup.tableX + 1.2,setup.tableY + 0.7,.52,.24,.24,.29,'#a5f3fc','rgba(120,200,220,0.7)');
  BOX(ctx,setup.tableX + 0.66,setup.tableY + 0.46,.52,.3,.22,.07,'#a0522d','#7a3a18');
  BOX(ctx,setup.tableX + 0.67,setup.tableY + 0.47,.58,.16,.16,.3,'#22c55e','#15803d');

  // Desk
  const ddx = setup.deskDx;
  const ddy = setup.deskDy;
  SHD(ctx,.26+ddx,.26+ddy,3.54,3.28,.22);
  BOX(ctx,.26+ddx,.26+ddy,0,3.54,3.28,1.14,LG(ctx,proj(.26+ddx,.26+ddy,1.14)[0],proj(.26+ddx,.26+ddy,1.14)[1],proj(3.8+ddx,3.54+ddy,1.14)[0],proj(3.8+ddx,3.54+ddy,1.14)[1],[[0,T.woodT],[.5,T.woodF+'cc'],[1,T.woodF]]),T.woodF,T.woodS);
  ctx.strokeStyle='rgba(0,0,0,0.12)'; ctx.lineWidth=.6;
  const dp1=proj(.26+ddx,.26+ddy,.57),dp2=proj(3.8+ddx,.26+ddy,.57); ctx.beginPath();ctx.moveTo(dp1[0],dp1[1]);ctx.lineTo(dp2[0],dp2[1]);ctx.stroke();
  // Monitor stand
  BOX(ctx,.98+ddx,2.06+ddy,1.14,.74,.15,.06,'#1e293b','#141f30');
  BOX(ctx,.7+ddx,2.0+ddy,1.55,1.7,.13,1.38,'#141d2e','#0e1522','#0a1018');
  Q(ctx,[proj(.72+ddx,2.0+ddy,1.57),proj(2.38+ddx,2.0+ddy,1.57),proj(2.38+ddx,2.0+ddy,2.91),proj(.72+ddx,2.0+ddy,2.91)],
    LG(ctx,proj(.72+ddx,2.0+ddy,2.91)[0],proj(.72+ddx,2.0+ddy,2.91)[1],proj(.72+ddx,2.0+ddy,1.57)[0],proj(.72+ddx,2.0+ddy,1.57)[1],[[0,'#1a3060'],[.3,'#1e2858'],[.7,'#14204a'],[1,'#0c1430']]),
    'rgba(96,165,250,0.2)',.5);
  // Keyboard
  BOX(ctx,.46+ddx,1.14+ddy,1.14,1.88,.7,.08,LG(ctx,proj(.46+ddx,1.14+ddy,1.22)[0],proj(.46+ddx,1.14+ddy,1.22)[1],proj(2.34+ddx,1.84+ddy,1.22)[0],proj(2.34+ddx,1.84+ddy,1.22)[1],[[0,'#1e2d42'],[1,'#141f30']]),'#0f1820','#0a1018');
  // Desk lamp
  const dlb=proj(2.9+ddx,.52+ddy,1.14);
  ctx.strokeStyle='#9a7828'; ctx.lineWidth=2.4;
  ctx.beginPath();ctx.moveTo(dlb[0]+2,dlb[1]-3);ctx.lineTo(dlb[0]+5,dlb[1]-22);ctx.lineTo(dlb[0]-4,dlb[1]-34);ctx.stroke();
  ctx.fillStyle='#f5c042';
  ctx.beginPath();ctx.moveTo(dlb[0]-13,dlb[1]-30);ctx.lineTo(dlb[0]+7,dlb[1]-30);ctx.lineTo(dlb[0]+3,dlb[1]-42);ctx.lineTo(dlb[0]-9,dlb[1]-42);ctx.closePath();ctx.fill();
  if(T.lampOn){
    ctx.fillStyle=RG(ctx,dlb[0]-4,dlb[1]-24,2,dlb[0]-4,dlb[1]-24,58,[[0,'rgba(255,220,80,0.17)'],[1,'transparent']]);
    ctx.beginPath();ctx.arc(dlb[0]-4,dlb[1]-24,58,0,Math.PI*2);ctx.fill();
  }
  // Mug
  BOX(ctx,2.5+ddx,.5+ddy,1.14,.27,.27,.3,'#f0abfc','rgba(200,150,230,0.7)');
  // Papers
  BOX(ctx,.44+ddx,.35+ddy,1.14,.9,.6,.06,'#fafaff','#f0eeff');
  BOX(ctx,.46+ddx,.37+ddy,1.2,.8,.52,.04,'#fffaf4','#fdf0e8');

  // Plant
  SHD(ctx,.07,.08,.78,.68,.18);
  BOX(ctx,.07,.08,0,.78,.68,.64,LG(ctx,proj(.07,.08,0)[0],proj(.07,.08,0)[1],proj(.85,.76,0)[0],proj(.85,.76,0)[1],[[0,'#b05828'],[1,'#8a4018']]),'#7a3818','#6a3010');
  Q(ctx,[proj(.07,.08,.64),proj(.85,.08,.64),proj(.85,.76,.64),proj(.07,.76,.64)],'#2a1408');
  const stm=proj(.46,.42,.64);
  ctx.strokeStyle='#15803d'; ctx.lineWidth=2.5;
  ctx.beginPath();ctx.moveTo(stm[0],stm[1]);ctx.lineTo(stm[0]-2,stm[1]-36);ctx.stroke();
  function leaf(lx: number, ly: number, ang: number, sz: number, col: string) {
    ctx.save(); ctx.translate(lx,ly); ctx.rotate(ang);
    ctx.fillStyle=col; ctx.beginPath(); ctx.ellipse(0,-sz*.5,sz*.3,sz*.62,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  leaf(stm[0]-2,stm[1]-36,-.42,20,'#22c55e');
  leaf(stm[0]-2,stm[1]-36,.52,17,'#16a34a');
  leaf(stm[0]-2,stm[1]-26,-.65,15,'#4ade80');
  leaf(stm[0]-2,stm[1]-26,.78,13,'#22c55e');
  leaf(stm[0]-2,stm[1]-44,.18,16,'#15803d');

  // Keep upper edges clean for closer dorm composition
}
