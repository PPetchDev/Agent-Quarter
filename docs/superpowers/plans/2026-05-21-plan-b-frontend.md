# Anime Agent Squad — Plan B: Frontend + Animation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้าง Next.js frontend ประกอบด้วย Lounge page (isometric room + time-based theme), Stages page (character sidebar + chat + emotion animations), และ shared layout ทั้งหมดพร้อมใช้งาน

**Architecture:** Next.js 15 App Router — Lounge page ใช้ HTML Canvas + vanilla JS สำหรับ isometric room, Stages page ใช้ Socket.io client subscribe character events, anime.js สำหรับทุก emotion transition

**Tech Stack:** Next.js 15 · Tailwind CSS 3 · anime.js 4 · socket.io-client 4 · @squad/core (workspace)

**Prerequisite:** Plan A ต้อง complete ก่อน — API running บน `localhost:3001`

---

## File Map

```
apps/web/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── public/
│   └── characters/         # copy จาก /characters/ root folder
├── src/
│   ├── app/
│   │   ├── layout.tsx              # root layout + TopBar
│   │   ├── globals.css
│   │   ├── page.tsx                # redirect → /lounge
│   │   ├── lounge/
│   │   │   └── page.tsx            # Lounge page
│   │   └── stages/
│   │       └── page.tsx            # Stages page
│   ├── components/
│   │   ├── TopBar.tsx
│   │   ├── lounge/
│   │   │   ├── LoungeCanvas.tsx    # Canvas rendering + characters overlay
│   │   │   ├── useTimeTheme.ts     # time → theme object
│   │   │   ├── roomDraw.ts         # all canvas drawing functions
│   │   │   ├── themes.ts           # 5 theme definitions
│   │   │   └── CharacterSpot.tsx   # HTML character overlay
│   │   └── stages/
│   │       ├── CharacterSidebar.tsx
│   │       ├── ChatPanel.tsx
│   │       ├── MessageBubble.tsx
│   │       ├── CharacterAvatar.tsx
│   │       └── useAnimeEmotion.ts  # anime.js emotion controller
│   ├── hooks/
│   │   ├── useSocket.ts            # Socket.io connection singleton
│   │   └── useStageSocket.ts      # per-character stage event subscription
│   └── lib/
│       └── api.ts                  # fetch wrappers for REST endpoints
```

---

## Task 1: Next.js App Scaffold

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.js`

- [ ] **Step 1: สร้าง apps/web/package.json**

```json
{
  "name": "@squad/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start",
    "test": "vitest run"
  },
  "dependencies": {
    "@squad/core": "workspace:*",
    "animejs": "^4.0.0",
    "next": "15.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "socket.io-client": "^4.7.5"
  },
  "devDependencies": {
    "@testing-library/react": "^16.2.0",
    "@types/node": "^20.14.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: สร้าง apps/web/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: สร้าง apps/web/next.config.ts**

```typescript
import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@squad/core'],
};
export default config;
```

- [ ] **Step 4: สร้าง apps/web/tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        squad: {
          bg: '#07041a',
          panel: 'rgba(7,4,26,0.96)',
          accent: '#f0abfc',
          accent2: '#c8a8e8',
          border: 'rgba(255,255,255,0.08)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 5: สร้าง apps/web/postcss.config.js**

```javascript
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 6: Copy character images**

```bash
cp -r /Users/titiwat/Downloads/AnimeAgentSquad/characters apps/web/public/characters
```

- [ ] **Step 7: ติดตั้ง และ run**

```bash
cd apps/web && pnpm install && pnpm dev
```

Expected: Next.js รัน บน http://localhost:3000

- [ ] **Step 8: Commit**

```bash
git add apps/web/
git commit -m "feat(web): scaffold Next.js app with Tailwind"
```

---

## Task 2: Root Layout + TopBar

**Files:**
- Create: `apps/web/src/app/globals.css`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/components/TopBar.tsx`

- [ ] **Step 1: สร้าง globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

:root {
  --accent: #f0abfc;
  --accent2: #c8a8e8;
}

body {
  background: #07041a;
  color: #e2d9f3;
  font-family: 'Inter', 'Segoe UI', sans-serif;
}
```

- [ ] **Step 2: สร้าง TopBar.tsx**

```typescript
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/lounge',  label: '🏠 Lounge' },
  { href: '/stages',  label: '💬 Stages' },
  { href: '/projects',label: '📋 Projects' },
];

export function TopBar() {
  const path = usePathname();
  return (
    <header className="flex items-center gap-3 px-5 py-2.5 bg-[rgba(5,2,14,0.96)] border-b border-white/7 backdrop-blur-md">
      <span className="text-xs font-black tracking-[3px] text-[#f0abfc] uppercase">
        ✦ <em className="not-italic text-[#c8a8e8]">SQUAD</em> ✧
      </span>
      <nav className="flex flex-1 justify-center gap-0.5">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`text-[10px] font-semibold px-3.5 py-1 rounded-lg transition-all ${
              path === href
                ? 'bg-white/8 text-[#f0abfc] border border-white/14'
                : 'text-[#3d3060] hover:text-[#7c6b99]'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 rounded-full bg-[rgba(74,222,128,0.1)] text-[#4ade80] border border-[rgba(74,222,128,0.2)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
        3 active
      </div>
    </header>
  );
}
```

- [ ] **Step 3: สร้าง layout.tsx**

```typescript
import type { Metadata } from 'next';
import './globals.css';
import { TopBar } from '@/components/TopBar';

export const metadata: Metadata = { title: '✦ Anime Agent Squad ✧' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-screen">
        <div className="max-w-[860px] mx-auto">
          <TopBar />
          {children}
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: สร้าง app/page.tsx (redirect)**

```typescript
import { redirect } from 'next/navigation';
export default function Home() { redirect('/lounge'); }
```

- [ ] **Step 5: ตรวจสอบ**

เปิด http://localhost:3000 → ควร redirect ไป /lounge และเห็น TopBar

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/
git commit -m "feat(web): add root layout and TopBar"
```

---

## Task 3: Lounge — Time Theme System

**Files:**
- Create: `apps/web/src/components/lounge/themes.ts`
- Create: `apps/web/src/components/lounge/useTimeTheme.ts`

- [ ] **Step 1: สร้าง themes.ts**

```typescript
export type RoomTheme = {
  label: string;
  accent: string;
  skyTop: string; skyMid: string; skyBot: string;
  hasMoon: boolean;
  hasSun: boolean; sunY: number; sunCol: string; sunGlow: string;
  winSky: string[];
  bwA: string; bwB: string; bwC: string;
  lwA: string; lwB: string; lwC: string;
  flA: string; flB: string;
  curtain: string;
  woodT: string; woodF: string; woodS: string;
  chairT: string; chairF: string; chairS: string;
  bedTop: string; bedS: string; blanket: string;
  amb: string;
  lampOn: boolean;
};

export const THEMES: Record<string, RoomTheme> = {
  night: {
    label: '🌙 กลางคืน', accent: '#f0abfc',
    skyTop: '#060318', skyMid: '#0d0728', skyBot: '#1a1040',
    hasMoon: true, hasSun: false, sunY: 0, sunCol: '#fff', sunGlow: 'transparent',
    winSky: ['#080428','#10083a','#180c54','#1e1060'],
    bwA: '#ece4fc', bwB: '#e0d8f5', bwC: '#d4ccea',
    lwA: '#f8f4ff', lwB: '#f0eafd', lwC: '#e6defc',
    flA: '#cfc0f0', flB: '#baaee4',
    curtain: 'rgba(245,240,255,0.83)',
    woodT: '#c49060', woodF: '#9a7040', woodS: '#855e30',
    chairT: '#e87050', chairF: '#c85c3a', chairS: '#a84828',
    bedTop: '#eee8ff', bedS: '#d8d0f0', blanket: '#b39be8',
    amb: 'rgba(160,130,255,0.06)', lampOn: true,
  },
  dawn: {
    label: '🌅 เช้าตรู่', accent: '#ffa07a',
    skyTop: '#1c052e', skyMid: '#8b1a4a', skyBot: '#ff6030',
    hasMoon: false, hasSun: true, sunY: 0.82, sunCol: '#ff7043', sunGlow: 'rgba(255,100,50,0.28)',
    winSky: ['#20062e','#9a1e50','#e03820','#ff7030'],
    bwA: '#ffe8e0', bwB: '#fdd8cc', bwC: '#f8c8b8',
    lwA: '#fff4ee', lwB: '#ffece4', lwC: '#ffe4d8',
    flA: '#e8d0b8', flB: '#d4b898',
    curtain: 'rgba(255,240,235,0.83)',
    woodT: '#c89060', woodF: '#a07040', woodS: '#8a5e28',
    chairT: '#e06040', chairF: '#c04828', chairS: '#a03018',
    bedTop: '#fff0e8', bedS: '#f0d8c8', blanket: '#e8a080',
    amb: 'rgba(255,120,60,0.09)', lampOn: true,
  },
  morning: {
    label: '🌤️ เช้า', accent: '#38b4f8',
    skyTop: '#4a9fd4', skyMid: '#7ac0e8', skyBot: '#a8d8f0',
    hasMoon: false, hasSun: true, sunY: 0.35, sunCol: '#fbbf24', sunGlow: 'rgba(251,191,36,0.3)',
    winSky: ['#3a8ac0','#6ab4e0','#90ccf0','#b8e4f8'],
    bwA: '#f8f4ee', bwB: '#f2ece4', bwC: '#ebe4da',
    lwA: '#ffffff', lwB: '#fcfaf7', lwC: '#f8f4ef',
    flA: '#e0d8c0', flB: '#ccc4aa',
    curtain: 'rgba(255,255,252,0.83)',
    woodT: '#c8a870', woodF: '#a07840', woodS: '#8a6430',
    chairT: '#e87050', chairF: '#c85c3a', chairS: '#a84828',
    bedTop: '#f8f4ee', bedS: '#e8e0d4', blanket: '#d0c8b0',
    amb: 'rgba(255,220,120,0.08)', lampOn: false,
  },
  afternoon: {
    label: '☀️ บ่าย', accent: '#38b4f8',
    skyTop: '#1a78c2', skyMid: '#3a9ae0', skyBot: '#70bef5',
    hasMoon: false, hasSun: true, sunY: 0.12, sunCol: '#f59e0b', sunGlow: 'rgba(245,158,11,0.25)',
    winSky: ['#1060a8','#3080cc','#58a4ec','#80c4f8'],
    bwA: '#f8f5f0', bwB: '#f2ede8', bwC: '#ece7e0',
    lwA: '#ffffff', lwB: '#fdfcfa', lwC: '#faf8f5',
    flA: '#ddd8c0', flB: '#ccc8b0',
    curtain: 'rgba(255,255,250,0.83)',
    woodT: '#d4b478', woodF: '#a88448', woodS: '#8c6c34',
    chairT: '#e87050', chairF: '#c85c3a', chairS: '#a84828',
    bedTop: '#f4f0e8', bedS: '#e4ddd0', blanket: '#c8c0a8',
    amb: 'rgba(255,230,150,0.07)', lampOn: false,
  },
  evening: {
    label: '🌆 พระอาทิตย์ตก', accent: '#ffb347',
    skyTop: '#0a001c', skyMid: '#680a28', skyBot: '#ff4800',
    hasMoon: false, hasSun: true, sunY: 0.78, sunCol: '#ff5722', sunGlow: 'rgba(255,80,20,0.3)',
    winSky: ['#100020','#780820','#d82800','#ff5000','#ff8020'],
    bwA: '#ffe8d8', bwB: '#ffd8c4', bwC: '#f8c8b0',
    lwA: '#fff4ec', lwB: '#ffeee4', lwC: '#ffe8dc',
    flA: '#d8c0a0', flB: '#c4a888',
    curtain: 'rgba(255,245,238,0.83)',
    woodT: '#c89060', woodF: '#a07040', woodS: '#8a5e28',
    chairT: '#d85030', chairF: '#b83a1a', chairS: '#983008',
    bedTop: '#fff0e4', bedS: '#eeddd0', blanket: '#e09060',
    amb: 'rgba(255,100,30,0.1)', lampOn: true,
  },
};

export function pickThemeName(hour: number): string {
  if (hour >= 5  && hour < 8)  return 'dawn';
  if (hour >= 8  && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}
```

- [ ] **Step 2: สร้าง useTimeTheme.ts**

```typescript
'use client';
import { useMemo } from 'react';
import { THEMES, pickThemeName, type RoomTheme } from './themes';

export function useTimeTheme(): { theme: RoomTheme; themeName: string } {
  return useMemo(() => {
    const hour = new Date().getHours();
    const themeName = pickThemeName(hour);
    return { theme: THEMES[themeName]!, themeName };
  }, []);
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/lounge/
git commit -m "feat(web/lounge): add time-based theme system (5 themes)"
```

---

## Task 4: Lounge — Canvas Room Drawing

**Files:**
- Create: `apps/web/src/components/lounge/roomDraw.ts`

- [ ] **Step 1: สร้าง roomDraw.ts** (isometric canvas drawing)

```typescript
import type { RoomTheme } from './themes';

// ── Projection ─────────────────────────────────────────────────────
const S = 40, OX = 190, OY = 446;
export function proj(wx: number, wy: number, wz: number): [number, number] {
  return [OX + wx * S + wy * S * 0.5, OY - wy * S * 0.5 - wz * S];
}

// ── Helpers ────────────────────────────────────────────────────────
function Q(ctx: CanvasRenderingContext2D, pts: [number,number][], fill?: string | CanvasGradient, stroke?: string, lw = 0.6) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill)  { ctx.fillStyle = fill;   ctx.fill(); }
  if (stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
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
  if (cT) Q(ctx, [proj(wx,wy,wz+h),proj(wx+w,wy,wz+h),proj(wx+w,wy+d,wz+h),proj(wx,wy+d,wz+h)], cT, st);
  if (cF) Q(ctx, [proj(wx,wy,wz),proj(wx+w,wy,wz),proj(wx+w,wy,wz+h),proj(wx,wy,wz+h)], cF, st);
  if (cR) Q(ctx, [proj(wx+w,wy,wz),proj(wx+w,wy+d,wz),proj(wx+w,wy+d,wz+h),proj(wx+w,wy,wz+h)], cR, st);
}

function SHD(ctx: CanvasRenderingContext2D, wx: number, wy: number, w: number, d: number, a = 0.15) {
  ctx.save(); ctx.globalAlpha = a;
  Q(ctx, [proj(wx,wy,0),proj(wx+w,wy,0),proj(wx+w,wy+d,0),proj(wx,wy+d,0)], 'rgba(40,20,80,0.55)');
  ctx.restore();
}

// ── Main draw function ─────────────────────────────────────────────
export function drawRoom(ctx: CanvasRenderingContext2D, T: RoomTheme, themeName: string) {
  ctx.clearRect(0, 0, 860, 500);

  // Sky
  ctx.fillStyle = LG(ctx, 430, 0, 430, 500, [[0, T.skyTop],[0.35, T.skyMid],[1, T.skyBot]]);
  ctx.fillRect(0, 0, 860, 500);

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
    LG(ctx, proj(0,7,4.5)[0],proj(0,7,4.5)[1],proj(0,7,0)[0],proj(0,7,0)[1],[[0,T.bwA],[0.55,T.bwB],[1,T.bwC]]),
    'rgba(0,0,0,0.07)');
  Q(ctx, [proj(0,7,0),proj(9,7,0),proj(9,7,0.13),proj(0,7,0.13)], 'rgba(0,0,0,0.12)');

  // Left wall
  Q(ctx, [proj(0,0,0),proj(0,7,0),proj(0,7,4.5),proj(0,0,4.5)],
    LG(ctx, proj(0,0,4.5)[0],proj(0,0,4.5)[1],proj(0,7,0)[0],proj(0,7,0)[1],[[0,T.lwA],[0.5,T.lwB],[1,T.lwC]]),
    'rgba(0,0,0,0.05)');
  Q(ctx, [proj(0,0,0),proj(0,7,0),proj(0,7,0.13),proj(0,0,0.13)], 'rgba(0,0,0,0.1)');

  // Floor
  Q(ctx, [proj(0,0,0),proj(9,0,0),proj(9,7,0),proj(0,7,0)],
    LG(ctx, proj(0,0,0)[0],proj(0,0,0)[1],proj(9,7,0)[0],proj(9,7,0)[1],[[0,T.flA],[0.55,T.flA+'cc'],[1,T.flB]]),
    'rgba(0,0,0,0.05)');
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 0.7;
  for (let i=1;i<9;i++){const a=proj(i,0,0),b=proj(i,7,0);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}
  for (let j=1;j<7;j++){const a=proj(0,j,0),b=proj(9,j,0);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}

  // Rug
  ctx.save(); ctx.globalAlpha = 0.4;
  Q(ctx, [proj(2.3,1.7,0),proj(6.9,1.7,0),proj(6.9,6.3,0),proj(2.3,6.3,0)], 'rgba(150,110,220,0.22)');
  ctx.restore();
  Q(ctx, [proj(2.3,1.7,0),proj(6.9,1.7,0),proj(6.9,6.3,0),proj(2.3,6.3,0)], undefined, 'rgba(170,130,240,0.3)', 1.2);

  // Ambient
  ctx.fillStyle = RG(ctx, 430, 350, 10, 430, 350, 380, [[0, T.amb],[1,'transparent']]);
  ctx.fillRect(0, 0, 860, 500);

  // Window
  Q(ctx, [proj(0,.95,.72),proj(0,5.75,.72),proj(0,5.75,4.02),proj(0,.95,4.02)], T.lwA, 'rgba(0,0,0,0.07)', 3);
  const wC = T.winSky;
  const wA=proj(0,1.1,.88), wB=proj(0,5.6,.88), wD=proj(0,5.6,3.88), wE=proj(0,1.1,3.88);
  Q(ctx, [wA,wB,wD,wE], LG(ctx, wE[0],wE[1],wA[0],wA[1], wC.map((c,i):[number,string]=>[i/(wC.length-1),c])));
  // Buildings
  const bldgs=[[1.3,3.2,1.1],[1.65,3.55,1.5],[2.05,3.8,1.2],[2.5,3.95,1.7],[2.95,3.7,1.1],[3.35,4.1,1.65],[3.8,3.6,1.0],[4.2,4.15,1.4],[4.65,3.75,1.1],[5.05,3.95,.9]];
  bldgs.forEach(([by2,yd,bh]) => {
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

  // Wall art + clock (simplified)
  Q(ctx,[proj(.82,7,2.2),proj(2.72,7,2.2),proj(2.72,7,3.95),proj(.82,7,3.95)],T.bwA,'rgba(0,0,0,0.14)',2);
  Q(ctx,[proj(1.02,7,2.44),proj(2.52,7,2.44),proj(2.52,7,3.72),proj(1.02,7,3.72)],
    LG(ctx,proj(1.02,7,3.72)[0],proj(1.02,7,3.72)[1],proj(1.02,7,2.44)[0],proj(1.02,7,2.44)[1],[[0,'#c4b5fd'],[.5,'#818cf8'],[1,'#60a5fa']]));
  ctx.fillStyle='rgba(249,115,22,0.72)'; ctx.beginPath(); ctx.arc(proj(1.52,7,3.0)[0]+.5,proj(1.52,7,3.0)[1],10,0,Math.PI*2); ctx.fill();
  const ck=proj(7.78,7,2.82);
  ctx.beginPath(); ctx.arc(ck[0]+.5,ck[1],16,0,Math.PI*2); ctx.fillStyle=T.bwA; ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.14)'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1.8;
  ctx.beginPath();ctx.moveTo(ck[0]+.5,ck[1]);ctx.lineTo(ck[0]+7,ck[1]-8);ctx.stroke();

  // Bookshelf
  SHD(ctx,2.62,6.52,3.76,.48,.22);
  Q(ctx,[proj(2.62,7,0),proj(6.38,7,0),proj(6.38,7,4.18),proj(2.62,7,4.18)],'#5c3818');
  BOX(ctx,2.62,6.52,0,3.76,.48,4.18,T.woodT,'#6b4820','#5a3818');
  [.7,1.42,2.16,2.92].forEach(sz=>Q(ctx,[proj(2.64,6.52,sz),proj(6.36,6.52,sz),proj(6.36,7,sz),proj(2.64,7,sz)],'#7a5828','rgba(0,0,0,0.2)',.5));
  const bkC=['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6','#e11d48'];
  [0,.7,1.42,2.16].forEach((sz,ri)=>{
    let bx=2.67;
    for(let bi=0;bi<11;bi++){
      const bw=.24+Math.sin(ri*4+bi+1)*.07, bh=.54+Math.cos(ri*2+bi)*.1, bc=bkC[(ri*5+bi)%bkC.length];
      Q(ctx,[proj(bx,6.52,sz+.06),proj(bx+bw,6.52,sz+.06),proj(bx+bw,6.52,sz+.06+bh),proj(bx,6.52,sz+.06+bh)],bc);
      Q(ctx,[proj(bx+bw,6.52,sz+.06),proj(bx+bw,7,sz+.06),proj(bx+bw,7,sz+.06+bh),proj(bx+bw,6.52,sz+.06+bh)],'rgba(0,0,0,0.28)');
      const r=parseInt(bc.slice(1,3),16),g2=parseInt(bc.slice(3,5),16),b2=parseInt(bc.slice(5,7),16);
      Q(ctx,[proj(bx,6.52,sz+.06+bh),proj(bx+bw,6.52,sz+.06+bh),proj(bx+bw,7,sz+.06+bh),proj(bx,7,sz+.06+bh)],
        `rgb(${Math.min(255,r+45)},${Math.min(255,g2+45)},${Math.min(255,b2+45)})`);
      bx+=bw+.04; if(bx>6.3) break;
    }
  });

  // Bed
  SHD(ctx,5.58,.36,3.24,4.84,.19);
  BOX(ctx,5.58,.36,0,3.24,.14,1.3,LG(ctx,proj(5.58,.36,0)[0],proj(5.58,.36,0)[1],proj(8.82,.36,0)[0],proj(8.82,.36,0)[1],[[0,T.woodT],[1,T.woodF]]),T.woodS);
  BOX(ctx,5.58,.5,0,3.24,4.84,.3,T.woodF,T.woodS);
  BOX(ctx,5.58,5.08,0,3.24,.14,.72,LG(ctx,proj(5.58,5.08,0)[0],proj(5.58,5.08,0)[1],proj(8.82,5.08,0)[0],proj(8.82,5.08,0)[1],[[0,T.woodT],[1,T.woodF]]),T.woodS);
  BOX(ctx,5.61,.52,.3,3.18,4.56,.37,T.bedTop,T.bedS,T.bedS+'aa');
  BOX(ctx,5.62,2.38,.67,3.16,2.62,.15,T.blanket,T.blanket+'aa',T.blanket+'88');
  [[5.64,.54,.67,1.14,1.0],[6.9,.54,.67,1.12,1.0]].forEach(([bx2,by2,bz2,w2,d2])=>
    BOX(ctx,bx2,by2,bz2,w2,d2,.22,'#fafaff','#eeeaff','#e0daf5'));
  // Bedside
  SHD(ctx,5.44,.36,.97,.62,.18);
  BOX(ctx,5.44,.36,0,.97,.62,.72,T.woodT,T.woodF,T.woodS);
  const lb=proj(5.74,.5,.72);
  ctx.strokeStyle='#9a7828'; ctx.lineWidth=2.3;
  ctx.beginPath();ctx.moveTo(lb[0]+1,lb[1]-3);ctx.lineTo(lb[0]+2,lb[1]-22);ctx.stroke();
  ctx.fillStyle='#fde68a';
  ctx.beginPath();ctx.moveTo(lb[0]-7,lb[1]-22);ctx.lineTo(lb[0]+11,lb[1]-22);ctx.lineTo(lb[0]+8,lb[1]-33);ctx.lineTo(lb[0]-4,lb[1]-33);ctx.closePath();ctx.fill();
  if(T.lampOn){ctx.fillStyle=RG(ctx,lb[0]+2,lb[1]-20,1,lb[0]+2,lb[1]-20,46,[[0,'rgba(255,210,80,0.17)'],[1,'transparent']]);ctx.beginPath();ctx.arc(lb[0]+2,lb[1]-20,46,0,Math.PI*2);ctx.fill();}

  // Chairs
  function chair(wx: number, wy: number) {
    SHD(ctx,wx,wy,1.78,1.88,.22);
    [[.14,.14],[1.5,.14],[.14,1.6],[1.5,1.6]].forEach(([lx,ly])=>BOX(ctx,wx+lx,wy+ly,0,.09,.09,.3,'#8b3020','#6b2010'));
    BOX(ctx,wx,wy,.3,1.78,1.88,.33,LG(ctx,proj(wx,wy,.3)[0],proj(wx,wy,.3)[1],proj(wx+1.78,wy+1.88,.3)[0],proj(wx+1.78,wy+1.88,.3)[1],[[0,T.chairT],[1,T.chairF]]),T.chairF,T.chairS);
    BOX(ctx,wx,wy,.63,1.78,.28,.98,T.chairT,T.chairF,T.chairS);
    BOX(ctx,wx,wy,.63,.2,1.88,.35,T.chairF,T.chairS);
    BOX(ctx,wx+1.58,wy,.63,.2,1.88,.35,T.chairF,T.chairS);
  }
  chair(2.32, 1.72); chair(4.88, 3.12);

  // Coffee table
  SHD(ctx,3.42,2.62,2.06,1.58,.19);
  BOX(ctx,3.42,2.62,.06,2.06,1.58,.46,LG(ctx,proj(3.42,2.62,.52)[0],proj(3.42,2.62,.52)[1],proj(5.48,4.2,.52)[0],proj(5.48,4.2,.52)[1],[[0,T.woodT],[1,T.woodF]]),T.woodF,T.woodS);
  BOX(ctx,3.68,2.85,.52,.24,.24,.29,'#f0abfc','rgba(200,150,230,0.7)');
  BOX(ctx,4.62,3.32,.52,.24,.24,.29,'#a5f3fc','rgba(120,200,220,0.7)');

  // Desk
  SHD(ctx,.26,.26,3.54,3.28,.22);
  BOX(ctx,.26,.26,0,3.54,3.28,1.14,LG(ctx,proj(.26,.26,1.14)[0],proj(.26,.26,1.14)[1],proj(3.8,3.54,1.14)[0],proj(3.8,3.54,1.14)[1],[[0,T.woodT],[.5,T.woodF+'cc'],[1,T.woodF]]),T.woodF,T.woodS);
  // Monitor
  BOX(ctx,.98,2.06,1.14,.74,.15,.06,'#1e293b','#141f30');
  BOX(ctx,.7,2.0,1.55,1.7,.13,1.38,'#141d2e','#0e1522','#0a1018');
  Q(ctx,[proj(.72,2.0,1.57),proj(2.38,2.0,1.57),proj(2.38,2.0,2.91),proj(.72,2.0,2.91)],
    LG(ctx,proj(.72,2.0,2.91)[0],proj(.72,2.0,2.91)[1],proj(.72,2.0,1.57)[0],proj(.72,2.0,1.57)[1],[[0,'#1a3060'],[.3,'#1e2858'],[.7,'#14204a'],[1,'#0c1430']]),
    'rgba(96,165,250,0.2)',.5);
  // Keyboard
  BOX(ctx,.46,1.14,1.14,1.88,.7,.08,LG(ctx,proj(.46,1.14,1.22)[0],proj(.46,1.14,1.22)[1],proj(2.34,1.84,1.22)[0],proj(2.34,1.84,1.22)[1],[[0,'#1e2d42'],[1,'#141f30']]),'#0f1820','#0a1018');
  // Desk lamp
  const dlb=proj(2.9,.52,1.14);
  ctx.strokeStyle='#9a7828'; ctx.lineWidth=2.4;
  ctx.beginPath();ctx.moveTo(dlb[0]+2,dlb[1]-3);ctx.lineTo(dlb[0]+5,dlb[1]-22);ctx.lineTo(dlb[0]-4,dlb[1]-34);ctx.stroke();
  ctx.fillStyle='#f5c042';
  ctx.beginPath();ctx.moveTo(dlb[0]-13,dlb[1]-30);ctx.lineTo(dlb[0]+7,dlb[1]-30);ctx.lineTo(dlb[0]+3,dlb[1]-42);ctx.lineTo(dlb[0]-9,dlb[1]-42);ctx.closePath();ctx.fill();
  if(T.lampOn){ctx.fillStyle=RG(ctx,dlb[0]-4,dlb[1]-24,2,dlb[0]-4,dlb[1]-24,58,[[0,'rgba(255,220,80,0.17)'],[1,'transparent']]);ctx.beginPath();ctx.arc(dlb[0]-4,dlb[1]-24,58,0,Math.PI*2);ctx.fill();}

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

  // Fairy lights
  const flC=['#fde68a','#f9a8d4','#a5f3fc','#c4b5fd','#bbf7d0'];
  for(let i=0;i<=8;i++){const c=flC[i%5]!,fc=proj(0,i/8*6.8+.1,4.38);ctx.beginPath();ctx.arc(fc[0],fc[1],2.5,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();ctx.fillStyle=RG(ctx,fc[0],fc[1],1,fc[0],fc[1],9,[[0,c+'88'],[1,'transparent']]);ctx.beginPath();ctx.arc(fc[0],fc[1],9,0,Math.PI*2);ctx.fill();}
  for(let i=0;i<=11;i++){const c=flC[(i+3)%5]!,fc=proj(i/11*8.7+.1,7,4.38);ctx.beginPath();ctx.arc(fc[0],fc[1],2.5,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();ctx.fillStyle=RG(ctx,fc[0],fc[1],1,fc[0],fc[1],9,[[0,c+'88'],[1,'transparent']]);ctx.beginPath();ctx.arc(fc[0],fc[1],9,0,Math.PI*2);ctx.fill();}
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/lounge/roomDraw.ts
git commit -m "feat(web/lounge): add isometric room drawing with full furniture"
```

---

## Task 5: Lounge — Canvas Component + Character Overlays

**Files:**
- Create: `apps/web/src/components/lounge/CharacterSpot.tsx`
- Create: `apps/web/src/components/lounge/LoungeCanvas.tsx`
- Create: `apps/web/src/app/lounge/page.tsx`

- [ ] **Step 1: สร้าง CharacterSpot.tsx**

```typescript
'use client';
import { useEffect, useRef } from 'react';
import { proj } from './roomDraw';

type Props = {
  wx: number; wy: number; wz: number;
  emoji: string;
  bg: string; bc: string; gc: string; gs: number; fs: number; sz: number;
  animClass: 'fw' | 'fi' | 'fl' | 'fs';
  dotBg: string; dotFg: string; dotText: string;
  name: string; role: string;
  sleep?: boolean;
  onClick?: () => void;
};

export function CharacterSpot({ wx, wy, wz, emoji, bg, bc, gc, gs, fs, sz, animClass, dotBg, dotFg, dotText, name, role, sleep, onClick }: Props) {
  const [sx, sy] = proj(wx, wy, wz);
  return (
    <div
      className={`ch ${animClass} absolute flex flex-col items-center gap-1 cursor-pointer group`}
      style={{ left: sx, top: sy, transform: 'translateX(-50%) translateY(-100%)' }}
      onClick={onClick}
    >
      <div
        className="ca rounded-full flex items-center justify-center relative overflow-hidden transition-transform duration-200 group-hover:-translate-y-1 group-hover:scale-105"
        style={{
          width: sz, height: sz, fontSize: fs,
          background: bg,
          border: `3px solid ${bc}`,
          boxShadow: `0 6px 20px rgba(0,0,0,0.6), 0 0 ${gs}px ${gc}`,
          filter: sleep ? 'brightness(0.55) saturate(0.4)' : undefined,
        }}
      >
        {emoji}
        <span
          className="absolute bottom-px right-px flex items-center justify-center rounded-full border-2 border-[#07041a]"
          style={{ width: 14, height: 14, background: dotBg, color: dotFg, fontSize: 6, fontWeight: 900 }}
        >
          {dotText}
        </span>
      </div>
      <div
        className="opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1 scale-90 group-hover:scale-100 transition-all duration-200 bg-[rgba(5,2,14,0.94)] border border-white/14 rounded-lg px-2.5 py-1 text-[9px] font-bold text-[#f0abfc] whitespace-nowrap text-center pointer-events-none"
      >
        {name}
        <span className="block text-white/38 text-[8px] font-normal">{role}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: สร้าง LoungeCanvas.tsx**

```typescript
'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { drawRoom } from './roomDraw';
import { useTimeTheme } from './useTimeTheme';
import { CharacterSpot } from './CharacterSpot';

const CHARACTERS = [
  { id:'mai',   wx:1.5, wy:.22,wz:1.3, emoji:'🐱', bg:'linear-gradient(135deg,#ffd8ec,#e9b0f0,#c8a8e8)', bc:'#f0abfc', gc:'rgba(240,171,252,.5)', gs:22, fs:24, sz:58, animClass:'fw' as const, dotBg:'#4ade80', dotFg:'#052e16', dotText:'●', name:'Mai', role:'Frontend · 🤔 thinking' },
  { id:'ren',   wx:8.2, wy:.22,wz:1.1, emoji:'⚔️', bg:'linear-gradient(135deg,#a8f0c8,#6ee7b7,#60a5fa)', bc:'#4ade80', gc:'rgba(74,222,128,.4)', gs:18, fs:22, sz:52, animClass:'fw' as const, dotBg:'#4ade80', dotFg:'#052e16', dotText:'●', name:'Ren', role:'Backend · 💪 focused' },
  { id:'yui',   wx:3.95,wy:3.0, wz:1.55,emoji:'📖', bg:'linear-gradient(135deg,#fef9c3,#fde68a,#f59e0b)', bc:'#fde047', gc:'rgba(253,224,71,.45)', gs:24, fs:28, sz:66, animClass:'fl' as const, dotBg:'#fde047', dotFg:'#713f12', dotText:'★', name:'Yui', role:'Lead · 👑 coordinating' },
  { id:'mika',  wx:2.62,wy:2.4, wz:1.1, emoji:'🌸', bg:'linear-gradient(135deg,#ede9fe,#ddd6fe,#a78bfa)', bc:'#a78bfa', gc:'rgba(167,139,250,.3)', gs:14, fs:18, sz:46, animClass:'fi' as const, dotBg:'#94a3b8', dotFg:'#0f172a', dotText:'○', name:'Mika', role:'UI · 😊 idle' },
  { id:'aki',   wx:6.62,wy:2.05,wz:1.0, emoji:'🔧', bg:'linear-gradient(135deg,#fed7aa,#fdba74,#fb923c)', bc:'#fb923c', gc:'rgba(251,146,60,.28)', gs:14, fs:18, sz:46, animClass:'fi' as const, dotBg:'#94a3b8', dotFg:'#0f172a', dotText:'○', name:'Aki', role:'DevOps · 😊 idle' },
  { id:'senko', wx:6.9, wy:3.62,wz:1.28,emoji:'🦊', bg:'linear-gradient(135deg,#fde68a,#fcd34d,#fca5a5)', bc:'rgba(148,163,184,.22)', gc:'transparent', gs:0, fs:16, sz:42, animClass:'fs' as const, dotBg:'#334155', dotFg:'#64748b', dotText:'z', name:'Senko', role:'Support · 😴 sleeping', sleep: true },
  { id:'shin',  wx:8.12,wy:4.68,wz:1.3, emoji:'🗡️', bg:'linear-gradient(135deg,#ddd6fe,#c4b5fd,#8b5cf6)', bc:'rgba(148,163,184,.22)', gc:'transparent', gs:0, fs:16, sz:42, animClass:'fs' as const, dotBg:'#334155', dotFg:'#64748b', dotText:'z', name:'Shinobu', role:'Strategist · 😴 sleeping', sleep: true },
];

export function LoungeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme, themeName } = useTimeTheme();
  const router = useRouter();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try { drawRoom(ctx, theme, themeName); } catch (e) { console.error('Lounge draw error:', e); }
  }, [theme, themeName]);

  return (
    <div className="relative w-[860px] h-[500px] overflow-hidden">
      <canvas ref={canvasRef} width={860} height={500} className="absolute inset-0" />
      <div className="absolute inset-0 pointer-events-none">
        {CHARACTERS.map(ch => (
          <CharacterSpot
            key={ch.id}
            {...ch}
            onClick={() => router.push(`/stages?character=${ch.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: เพิ่ม CSS animations ใน globals.css**

```css
/* Character animations */
.fw { animation: cfw 2.5s ease-in-out infinite; }
.fi { animation: cfi 3.8s ease-in-out infinite; }
.fl { animation: cfl 3s ease-in-out infinite; }
.fs { animation: cfs 6s ease-in-out infinite; }
@keyframes cfw { 0%,100%{transform:translateX(-50%) translateY(-100%)} 50%{transform:translateX(-50%) translateY(calc(-100% - 10px))} }
@keyframes cfi { 0%,100%{transform:translateX(-50%) translateY(-100%)} 50%{transform:translateX(-50%) translateY(calc(-100% - 6px))} }
@keyframes cfl { 0%,100%{transform:translateX(-50%) translateY(-100%)} 50%{transform:translateX(-50%) translateY(calc(-100% - 13px))} }
@keyframes cfs { 0%,100%{transform:translateX(-50%) translateY(-100%) rotate(-2.5deg)} 50%{transform:translateX(-50%) translateY(-100%) rotate(2.5deg)} }
```

- [ ] **Step 4: สร้าง app/lounge/page.tsx**

```typescript
import { LoungeCanvas } from '@/components/lounge/LoungeCanvas';

export default function LoungePage() {
  return (
    <main>
      <LoungeCanvas />
      <div className="flex items-center justify-between px-5 py-2 bg-[rgba(5,2,14,0.96)] border-t border-white/5">
        <div className="flex gap-1.5">
          {[
            { cls: 'bg-[rgba(74,222,128,0.1)] text-[#4ade80] border-[rgba(74,222,128,0.2)]', text: '● 3 active' },
            { cls: 'bg-white/7 text-[#f0abfc] border-white/12', text: '★ 1 lead' },
            { cls: 'bg-[rgba(148,163,184,0.1)] text-[#94a3b8] border-[rgba(148,163,184,0.18)]', text: '○ 2 idle  💤 2 sleeping' },
          ].map(({ cls, text }) => (
            <span key={text} className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${cls}`}>{text}</span>
          ))}
        </div>
        <span className="text-[9px] text-white/18">hover ตัวละคร · คลิกเพื่อเปิด Stage</span>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: ทดสอบ Lounge page**

เปิด http://localhost:3000/lounge — ควรเห็นห้อง isometric พร้อมตัวละคร 7 ตัว

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/
git commit -m "feat(web/lounge): complete Lounge page with isometric room and character overlays"
```

---

## Task 6: Socket.io Client + API lib

**Files:**
- Create: `apps/web/src/hooks/useSocket.ts`
- Create: `apps/web/src/hooks/useStageSocket.ts`
- Create: `apps/web/src/lib/api.ts`

- [ ] **Step 1: สร้าง useSocket.ts**

```typescript
'use client';
import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function useSocket(): Socket {
  const ref = useRef<Socket | null>(null);

  if (!socketInstance) {
    socketInstance = io(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001', {
      autoConnect: true,
      reconnectionAttempts: 5,
    });
  }
  ref.current = socketInstance;
  return ref.current;
}
```

- [ ] **Step 2: สร้าง useStageSocket.ts**

```typescript
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSocket } from './useSocket';
import { readCharacterMood, type CharacterMood, type StageRuntimeState, type IdleTier } from '@squad/core';

type StageState = {
  state: StageRuntimeState;
  idleTier: IdleTier;
  mood: CharacterMood;
};

type MessageChunk = { messageId: string; chunk: string };
type MessageDone  = { messageId: string; fullContent: string; mood?: string };

export function useStageSocket(characterId: string) {
  const socket = useSocket();
  const [stageState, setStageState] = useState<StageState>({
    state: 'idle', idleTier: 'ready', mood: 'idle',
  });
  const [chunks, setChunks] = useState<MessageChunk[]>([]);
  const [moodOverride, setMoodOverride] = useState<CharacterMood | null>(null);

  useEffect(() => {
    socket.emit('join_stage', { characterId });

    const onStageState = (data: { characterId: string; state: StageRuntimeState; idleTier?: IdleTier; mood: CharacterMood }) => {
      if (data.characterId !== characterId) return;
      setStageState({ state: data.state, idleTier: data.idleTier ?? 'ready', mood: data.mood });
    };
    const onChunk = (data: { characterId: string } & MessageChunk) => {
      if (data.characterId !== characterId) return;
      setChunks(prev => [...prev, { messageId: data.messageId, chunk: data.chunk }]);
    };
    const onMoodOverride = (data: { characterId: string; mood: CharacterMood }) => {
      if (data.characterId !== characterId) return;
      setMoodOverride(data.mood);
      setTimeout(() => setMoodOverride(null), 3_000);
    };
    const onDone = (data: { characterId: string } & MessageDone) => {
      if (data.characterId !== characterId) return;
      setChunks([]);
    };

    socket.on('stage_state',   onStageState);
    socket.on('message_chunk', onChunk);
    socket.on('mood_override', onMoodOverride);
    socket.on('message_done',  onDone);

    return () => {
      socket.off('stage_state',   onStageState);
      socket.off('message_chunk', onChunk);
      socket.off('mood_override', onMoodOverride);
      socket.off('message_done',  onDone);
    };
  }, [socket, characterId]);

  const sendMessage = useCallback((content: string) => {
    socket.emit('send_message', { characterId, content });
  }, [socket, characterId]);

  const activeMood = moodOverride ?? stageState.mood;

  return { stageState, activeMood, chunks, sendMessage };
}
```

- [ ] **Step 3: สร้าง lib/api.ts**

```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function getConversation(characterId: string) {
  const res = await fetch(`${BASE}/api/conversations/${characterId}`);
  if (!res.ok) throw new Error('Failed to fetch conversation');
  return res.json();
}

export async function getHistory(characterId: string) {
  const res = await fetch(`${BASE}/api/conversations/${characterId}/history`);
  if (!res.ok) return [];
  return res.json() as Promise<Array<{ id: string; role: string; content: string; mood?: string; createdAt: string }>>;
}

export async function getCharacters() {
  const res = await fetch(`${BASE}/api/characters`);
  if (!res.ok) throw new Error('Failed to fetch characters');
  return res.json();
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/ apps/web/src/lib/
git commit -m "feat(web): add Socket.io client hooks and API lib"
```

---

## Task 7: Stages Page

**Files:**
- Create: `apps/web/src/components/stages/CharacterAvatar.tsx`
- Create: `apps/web/src/components/stages/CharacterSidebar.tsx`
- Create: `apps/web/src/components/stages/ChatPanel.tsx`
- Create: `apps/web/src/components/stages/MessageBubble.tsx`
- Create: `apps/web/src/components/stages/useAnimeEmotion.ts`
- Create: `apps/web/src/app/stages/page.tsx`

- [ ] **Step 1: ติดตั้ง animejs**

```bash
cd apps/web && pnpm add animejs@^4.0.0
```

- [ ] **Step 2: สร้าง useAnimeEmotion.ts**

```typescript
'use client';
import { useEffect, useRef } from 'react';
import type { CharacterMood } from '@squad/core';

type AnimeInstance = {
  pause: () => void;
  restart: () => void;
};

// Emotion → anime.js animation config
const EMOTION_LOOP: Record<CharacterMood, { translateY?: number[]; rotate?: number[]; scale?: number[]; duration: number }> = {
  idle:      { translateY: [0, -6],    duration: 3000 },
  thinking:  { rotate: [-3, 3],        duration: 2500 },
  happy:     { translateY: [0, -10],   scale: [1, 1.04], duration: 1200 },
  excited:   { translateY: [0, -12],   scale: [1, 1.06], duration: 700 },
  victory:   { translateY: [0, -14],   scale: [1, 1.08], rotate: [-3, 3], duration: 800 },
  crying:    { translateY: [0, 4],     rotate: [-2, 2],  duration: 4000 },
  sleepy:    { rotate: [-2, 2],        duration: 5000 },
  angry:     { translateY: [0, -3],    duration: 800 },
  surprised: { scale: [1, 1.1],        translateY: [0, -8], duration: 600 },
  listening: { translateY: [0, -5],    duration: 3500 },
  love:      { scale: [1, 1.05],       translateY: [0, -8], duration: 1500 },
  snack:     { translateY: [0, -4],    rotate: [-1, 1], duration: 2000 },
  done:      { translateY: [0, -8],    duration: 2000 },
};

const EMOTION_BURST: Record<CharacterMood, { translateY?: number; scale?: number; rotate?: number; duration: number }> = {
  idle:      { translateY: -3,  duration: 400 },
  thinking:  { translateY: -2,  duration: 400 },
  happy:     { translateY: -12, scale: 1.1,  duration: 350 },
  excited:   { translateY: -18, scale: 1.15, duration: 300 },
  victory:   { translateY: -20, scale: 1.2,  rotate: 8, duration: 350 },
  crying:    { translateY: 4,   duration: 600 },
  sleepy:    { translateY: 3,   duration: 800 },
  angry:     { scale: 1.05,     duration: 200 },
  surprised: { scale: 1.25,     translateY: -10, duration: 200 },
  listening: { translateY: -5,  duration: 400 },
  love:      { scale: 1.12,     translateY: -10, duration: 350 },
  snack:     { translateY: -6,  duration: 400 },
  done:      { translateY: -8,  scale: 1.05, duration: 350 },
};

export function useAnimeEmotion(mood: CharacterMood, elementRef: React.RefObject<HTMLElement | null>) {
  const loopRef   = useRef<AnimeInstance | null>(null);
  const prevMood  = useRef<CharacterMood | null>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    let cancelled = false;

    import('animejs').then(({ default: anime }) => {
      if (cancelled) return;

      // Stop previous loop
      loopRef.current?.pause();

      // Burst on mood change
      if (prevMood.current !== mood) {
        prevMood.current = mood;
        const burst = EMOTION_BURST[mood] ?? EMOTION_BURST.idle;
        anime({
          targets: el,
          translateY: [0, burst.translateY ?? 0, 0],
          scale:      [1, burst.scale ?? 1, 1],
          rotate:     [0, burst.rotate ?? 0, 0],
          duration:   burst.duration,
          easing:     'spring(1, 80, 10, 0)',
        });
      }

      // Start loop
      const loop = EMOTION_LOOP[mood] ?? EMOTION_LOOP.idle;
      const instance = anime({
        targets: el,
        translateY: loop.translateY ?? [0, 0],
        rotate:     loop.rotate     ?? 0,
        scale:      loop.scale      ?? 1,
        duration:   loop.duration,
        easing:     'easeInOutSine',
        loop:       true,
        direction:  'alternate',
      }) as unknown as AnimeInstance;
      loopRef.current = instance;
    });

    return () => {
      cancelled = true;
      loopRef.current?.pause();
    };
  }, [mood, elementRef]);
}
```

- [ ] **Step 3: สร้าง CharacterAvatar.tsx**

```typescript
'use client';
import { useRef } from 'react';
import Image from 'next/image';
import { resolveCharacterMoodImagePath, type CharacterMood } from '@squad/core';
import { useAnimeEmotion } from './useAnimeEmotion';

type Props = {
  characterId: string;
  mood: CharacterMood;
  size?: 'sm' | 'md' | 'lg';
};

const SIZES = { sm: 36, md: 52, lg: 72 };

export function CharacterAvatar({ characterId, mood, size = 'md' }: Props) {
  const avatarRef = useRef<HTMLDivElement>(null);
  useAnimeEmotion(mood, avatarRef);

  const imgPath = resolveCharacterMoodImagePath(characterId, mood);
  const px = SIZES[size];

  return (
    <div ref={avatarRef} className="inline-block" style={{ width: px, height: px }}>
      <Image
        src={imgPath}
        alt={`${characterId} ${mood}`}
        width={px}
        height={px}
        className="rounded-full object-cover w-full h-full border-2 border-white/20"
        priority={size === 'lg'}
      />
    </div>
  );
}
```

- [ ] **Step 4: สร้าง CharacterSidebar.tsx**

```typescript
'use client';
import { CHARACTER_TEMPLATES } from '@squad/core';
import { CharacterAvatar } from './CharacterAvatar';
import { useStageSocket } from '@/hooks/useStageSocket';
import type { CharacterMood } from '@squad/core';

type Props = {
  activeId: string;
  onSelect: (id: string) => void;
};

function SidebarEntry({ characterId, isActive, onSelect }: { characterId: string; isActive: boolean; onSelect: () => void }) {
  const { activeMood, stageState } = useStageSocket(characterId);
  const template = CHARACTER_TEMPLATES.find(t => t.characterId === characterId)!;

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-all text-left ${
        isActive
          ? 'bg-[rgba(255,255,255,0.08)] border-white/14'
          : 'border-transparent hover:bg-white/4'
      }`}
    >
      <div className="relative flex-shrink-0">
        <CharacterAvatar characterId={characterId} mood={activeMood} size="sm" />
        <span
          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#07041a]"
          style={{ background: stageState.state === 'processing' ? '#4ade80' : '#475569' }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[11px] font-bold truncate ${isActive ? 'text-[#f0abfc]' : 'text-[#e2d9f3]'}`}>
          {template.name}
        </p>
        <p className="text-[9px] text-white/38 uppercase tracking-wide truncate">{template.title}</p>
        <span className="inline-block mt-0.5 text-[8px] px-1.5 py-0 rounded-full bg-white/7 text-white/50">
          {activeMood}
        </span>
      </div>
    </button>
  );
}

export function CharacterSidebar({ activeId, onSelect }: Props) {
  return (
    <aside className="w-[200px] flex-shrink-0 bg-[rgba(5,2,14,0.6)] border-r border-white/7 p-2.5 flex flex-col gap-1 overflow-y-auto">
      <p className="text-[9px] font-black tracking-[2.5px] text-white/30 uppercase px-2 py-1.5 mb-1">
        ✦ SQUAD ✧
      </p>
      {CHARACTER_TEMPLATES.map(t => (
        <SidebarEntry
          key={t.characterId}
          characterId={t.characterId}
          isActive={t.characterId === activeId}
          onSelect={() => onSelect(t.characterId)}
        />
      ))}
    </aside>
  );
}
```

- [ ] **Step 5: สร้าง MessageBubble.tsx**

```typescript
type Props = {
  role: 'user' | 'assistant';
  content: string;
  characterName?: string;
  isStreaming?: boolean;
};

export function MessageBubble({ role, content, characterName, isStreaming }: Props) {
  if (role === 'user') {
    return (
      <div className="flex gap-2 justify-end">
        <div className="max-w-[75%]">
          <p className="text-[9px] text-white/38 text-right mb-1">คุณ</p>
          <div className="bg-[rgba(124,58,237,0.35)] border border-[rgba(167,139,250,0.3)] rounded-2xl rounded-tr-sm px-3.5 py-2 text-[12px] text-[#e2d9f3] leading-relaxed">
            {content}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <div className="max-w-[80%]">
        <p className="text-[9px] text-white/38 mb-1">{characterName ?? 'Assistant'}</p>
        <div className="bg-[rgba(255,255,255,0.05)] border border-white/8 rounded-2xl rounded-tl-sm px-3.5 py-2 text-[12px] text-[#e2d9f3] leading-relaxed">
          {content}
          {isStreaming && <span className="inline-block w-1 h-3.5 bg-[#f0abfc] ml-0.5 animate-pulse rounded-sm" />}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: สร้าง ChatPanel.tsx**

```typescript
'use client';
import { useState, useEffect, useRef } from 'react';
import { useStageSocket } from '@/hooks/useStageSocket';
import { getHistory } from '@/lib/api';
import { CharacterAvatar } from './CharacterAvatar';
import { MessageBubble } from './MessageBubble';
import { CHARACTER_TEMPLATES } from '@squad/core';

type HistoryMessage = { id: string; role: string; content: string; mood?: string };

type Props = { characterId: string };

export function ChatPanel({ characterId }: Props) {
  const { stageState, activeMood, chunks, sendMessage } = useStageSocket(characterId);
  const [history, setHistory]   = useState<HistoryMessage[]>([]);
  const [input, setInput]       = useState('');
  const [streaming, setStreaming] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const template  = CHARACTER_TEMPLATES.find(t => t.characterId === characterId)!;

  // Load history
  useEffect(() => {
    getHistory(characterId).then(setHistory);
    setStreaming('');
  }, [characterId]);

  // Accumulate streaming chunks
  useEffect(() => {
    if (chunks.length === 0) { setStreaming(''); return; }
    setStreaming(chunks.map(c => c.chunk).join(''));
  }, [chunks]);

  // Scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, streaming]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setHistory(prev => [...prev, { id: Date.now().toString(), role: 'user', content: trimmed }]);
    sendMessage(trimmed);
    setInput('');
  };

  const isProcessing = stageState.state === 'processing';

  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/7 bg-white/2">
        <CharacterAvatar characterId={characterId} mood={activeMood} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-black text-[#f0abfc]">{template.name}</p>
          <p className="text-[10px] flex items-center gap-1.5">
            {isProcessing
              ? <><span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" /> กำลังคิดอยู่...</>
              : <><span className="w-1.5 h-1.5 rounded-full bg-[#475569]" /> {activeMood}</>
            }
          </p>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/7 text-[#a78bfa] border border-white/10">
          {activeMood}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {history.map(msg => (
          <MessageBubble
            key={msg.id}
            role={msg.role as 'user' | 'assistant'}
            content={msg.content}
            characterName={msg.role === 'assistant' ? `${template.name} · ${template.title}` : undefined}
          />
        ))}
        {streaming && (
          <MessageBubble
            role="assistant"
            content={streaming}
            characterName={`${template.name} กำลังพิมพ์...`}
            isStreaming
          />
        )}
        {isProcessing && !streaming && (
          <div className="flex gap-2">
            <div className="flex gap-1 px-3.5 py-2.5 bg-white/5 border border-white/8 rounded-2xl rounded-tl-sm">
              {[0,1,2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#c8a8e8] animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 px-4 py-3 border-t border-white/7">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={`พิมพ์ข้อความถึง ${template.name}...`}
          rows={1}
          className="flex-1 resize-none bg-white/6 border border-white/14 rounded-xl px-3.5 py-2.5 text-[12px] text-[#e2d9f3] placeholder-white/25 outline-none focus:border-[rgba(240,171,252,0.4)] transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isProcessing}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-[#f0abfc] to-[#a78bfa] flex items-center justify-center text-sm shadow-lg disabled:opacity-40 hover:scale-105 active:scale-95 transition-transform flex-shrink-0"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: สร้าง app/stages/page.tsx**

```typescript
'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CharacterSidebar } from '@/components/stages/CharacterSidebar';
import { ChatPanel } from '@/components/stages/ChatPanel';

function StagesContent() {
  const searchParams = useSearchParams();
  const initial = searchParams.get('character') ?? 'mai';
  const [activeId, setActiveId] = useState(initial);

  return (
    <main className="flex h-[538px] bg-[rgba(7,4,26,0.8)] border-t border-white/5">
      <CharacterSidebar activeId={activeId} onSelect={setActiveId} />
      <ChatPanel characterId={activeId} />
    </main>
  );
}

export default function StagesPage() {
  return (
    <Suspense>
      <StagesContent />
    </Suspense>
  );
}
```

- [ ] **Step 8: เพิ่ม NEXT_PUBLIC_API_URL ใน apps/web/.env.local**

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > apps/web/.env.local
```

- [ ] **Step 9: ทดสอบ Stages page**

เปิด http://localhost:3000/stages — ควรเห็น character sidebar ซ้าย, chat ขวา, คลิก Mai ส่งข้อความ

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/
git commit -m "feat(web/stages): complete Stages page with CharacterAvatar, emotion animations, and chat"
```

---

## Task 8: Self-Review + Final Check

- [ ] **Step 1: รัน all tests**

```bash
# packages/core
cd packages/core && pnpm test
# Expected: 8 tests PASS

# api
cd ../../apps/api && pnpm test
# Expected: no test failures
```

- [ ] **Step 2: ทดสอบ full flow**

```bash
# Terminal 1
cd apps/api && pnpm dev

# Terminal 2
cd apps/web && pnpm dev
```

ทดสอบ:
1. เปิด http://localhost:3000 → redirect ไป /lounge
2. เห็นห้อง isometric + 7 characters
3. คลิก Mai → navigate ไป /stages?character=mai
4. Stages page: Mai ใน sidebar, chat area ขวา
5. ส่งข้อความ "Hello!" → เห็น streaming response + emotion animation

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat: Plan B complete — Next.js frontend with Lounge, Stages, and emotion animations"
```

---

## Summary

Plan B สร้างสิ่งต่อไปนี้:
- **Lounge page** — Canvas isometric room, 5 time-based themes, 7 character overlays with animations
- **Stages page** — Character sidebar + chat interface with real-time streaming
- **CharacterAvatar** — anime.js loop + burst animations per emotion
- **Socket.io client** — stage state, chunks, mood override events

**Plan C (ต่อไป):** Projects page, Lead/Member orchestration, Relay messaging
