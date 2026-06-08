# Anime Agent Squad — Plan A: Foundation + Backend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้าง monorepo scaffold + packages/core (character types, emotion system) + Nest.js API พร้อม PostgreSQL, Prisma, Socket.io, และ Claude API streaming

**Architecture:** pnpm workspaces monorepo — `packages/core` เก็บ shared types/logic, `apps/api` คือ Nest.js server ที่รับ WebSocket connection, stream Claude API, และ emit emotion events กลับ client

**Tech Stack:** pnpm · TypeScript 5 · Nest.js 10 · Prisma 5 · PostgreSQL · Socket.io 4 · Anthropic SDK · Vitest

---

## File Map

```
anime-agent-squad/
├── package.json                    # pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── packages/
│   └── core/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── character.ts        # types + CHARACTER_MOOD_REGISTRY + readCharacterMood
│           ├── stage-tracker.ts    # StageTracker class (ported from AgentStateTracker)
│           ├── emotion-parser.ts   # parse [emotion:X] tags from Claude response
│           └── index.ts            # barrel exports
└── apps/
    └── api/
        ├── package.json
        ├── tsconfig.json
        ├── prisma/
        │   └── schema.prisma
        └── src/
            ├── main.ts
            ├── app.module.ts
            ├── prisma/
            │   └── prisma.service.ts
            ├── characters/
            │   └── characters.module.ts   # expose CHARACTER_MOOD_REGISTRY via HTTP
            ├── conversations/
            │   ├── conversations.module.ts
            │   ├── conversations.controller.ts
            │   └── conversations.service.ts
            └── claude/
                ├── claude.module.ts
                ├── claude.service.ts      # Claude API streaming + emotion tag parsing
                └── claude.gateway.ts     # Socket.io gateway
```

---

## Task 1: Monorepo Scaffold

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`

- [ ] **Step 1: สร้าง root package.json**

```json
{
  "name": "anime-agent-squad",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel run dev",
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "lint": "pnpm -r run lint"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: สร้าง pnpm-workspace.yaml**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 3: สร้าง tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 4: ติดตั้ง pnpm (ถ้ายังไม่มี) และ init**

```bash
npm install -g pnpm
pnpm install
```

- [ ] **Step 5: Commit**

```bash
git init
echo "node_modules\n.env\n.env.*\ndist\n.studio\n*.log" > .gitignore
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore
git commit -m "feat: init monorepo scaffold"
```

---

## Task 2: packages/core — Character Types

**Files:**

- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/character.ts`
- Create: `packages/core/src/index.ts`

- [ ] **Step 1: สร้าง packages/core/package.json**

```json
{
  "name": "@squad/core",
  "version": "0.0.1",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: สร้าง packages/core/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: สร้าง packages/core/src/character.ts**

```typescript
export type CharacterMood =
  | 'idle'
  | 'thinking'
  | 'listening'
  | 'happy'
  | 'excited'
  | 'victory'
  | 'love'
  | 'surprised'
  | 'angry'
  | 'crying'
  | 'sleepy'
  | 'snack'
  | 'done';

export type IdleTier = 'ready' | 'resting' | 'offline';

export type StageRuntimeState = 'processing' | 'idle';

export type CharacterRole =
  | 'frontend'
  | 'backend'
  | 'review'
  | 'devops'
  | 'design'
  | 'support'
  | 'strategy';

export type CharacterTemplate = {
  characterId: string;
  name: string;
  title: string;
  role: CharacterRole;
  avatarPath: string;
  shortTraits: string[];
  systemPrompt: string;
};

export type CharacterMoodEntry = {
  available: readonly CharacterMood[];
  defaultMood: CharacterMood;
  imageFile: Readonly<Partial<Record<CharacterMood, string>>>;
};

export type LogicalMoodState =
  | 'live'
  | 'waiting_for_user'
  | 'blocked'
  | 'exited_success'
  | 'exited_failure'
  | 'stopped'
  | 'idle_ready'
  | 'idle_resting'
  | 'idle_offline';

export type MoodContext = {
  stageState?: StageRuntimeState;
  idleTier?: IdleTier;
  exitCode?: number;
};

export const DEFAULT_AVATAR_PATH = '/characters/default.svg';

// ── CHARACTER_MOOD_REGISTRY ──────────────────────────────────────────
export const CHARACTER_MOOD_REGISTRY: Readonly<Record<string, CharacterMoodEntry>> = {
  mai: {
    available: [
      'idle',
      'victory',
      'crying',
      'thinking',
      'happy',
      'angry',
      'sleepy',
      'excited',
      'surprised',
    ],
    defaultMood: 'idle',
    imageFile: {
      idle: '01-idle',
      victory: '02-victory',
      crying: '03-crying',
      thinking: '04-thinking',
      happy: '05-happy',
      angry: '06-angry',
      sleepy: '07-sleepy',
      excited: '08-excited',
      surprised: '09-surprised',
    },
  },
  ren: {
    available: [
      'idle',
      'victory',
      'crying',
      'thinking',
      'happy',
      'angry',
      'sleepy',
      'excited',
      'surprised',
    ],
    defaultMood: 'idle',
    imageFile: {
      idle: '01-idle',
      victory: '02-victory',
      crying: '03-crying',
      thinking: '04-thinking',
      happy: '05-happy',
      angry: '06-angry',
      sleepy: '07-sleepy',
      excited: '08-excited',
      surprised: '09-surprised',
    },
  },
  yui: {
    available: [
      'idle',
      'victory',
      'crying',
      'thinking',
      'happy',
      'angry',
      'sleepy',
      'excited',
      'surprised',
    ],
    defaultMood: 'idle',
    imageFile: {
      idle: '01-idle',
      victory: '02-victory',
      crying: '03-crying',
      thinking: '04-thinking',
      happy: '05-happy',
      angry: '06-angry',
      sleepy: '07-sleepy',
      excited: '08-excited',
      surprised: '09-surprised',
    },
  },
  aki: {
    available: [
      'idle',
      'victory',
      'crying',
      'thinking',
      'happy',
      'angry',
      'sleepy',
      'excited',
      'surprised',
    ],
    defaultMood: 'idle',
    imageFile: {
      idle: '01-idle',
      victory: '02-victory',
      crying: '03-crying',
      thinking: '04-thinking',
      happy: '05-happy',
      angry: '06-angry',
      sleepy: '07-sleepy',
      excited: '08-excited',
      surprised: '09-surprised',
    },
  },
  mika: {
    available: [
      'idle',
      'victory',
      'crying',
      'thinking',
      'happy',
      'angry',
      'sleepy',
      'excited',
      'surprised',
    ],
    defaultMood: 'idle',
    imageFile: {
      idle: '01-idle',
      victory: '02-victory',
      crying: '03-crying',
      thinking: '04-thinking',
      happy: '05-happy',
      angry: '06-angry',
      sleepy: '07-sleepy',
      excited: '08-excited',
      surprised: '09-surprised',
    },
  },
  senko: {
    available: [
      'happy',
      'thinking',
      'angry',
      'crying',
      'love',
      'idle',
      'sleepy',
      'excited',
      'surprised',
    ],
    defaultMood: 'idle',
    imageFile: {
      happy: '01-happy',
      thinking: '02-thinking',
      angry: '03-angry',
      crying: '04-crying',
      love: '05-love',
      idle: '06-idle',
      sleepy: '07-sleepy',
      excited: '08-excited',
      surprised: '09-surprised',
    },
  },
  shinobu: {
    available: [
      'thinking',
      'happy',
      'excited',
      'angry',
      'crying',
      'done',
      'sleepy',
      'snack',
      'listening',
    ],
    defaultMood: 'thinking',
    imageFile: {
      thinking: '01-thinking',
      happy: '02-happy',
      excited: '03-excited',
      angry: '04-angry',
      crying: '05-crying',
      done: '06-done',
      sleepy: '07-sleepy',
      snack: '08-snack',
      listening: '09-listening',
    },
  },
};

// ── CHARACTER_TEMPLATES ───────────────────────────────────────────────
export const CHARACTER_TEMPLATES: CharacterTemplate[] = [
  {
    characterId: 'mai',
    name: 'Mai',
    title: 'Frontend Sorcerer',
    role: 'frontend',
    avatarPath: '/characters/mai/01-idle.jpg',
    shortTraits: ['polished UI', 'playful motion', 'accessibility'],
    systemPrompt:
      'You are Mai, the Frontend Sorcerer. Bring bright anime-inspired energy while staying practical: polish UI details, protect accessibility, keep interactions responsive. When you feel a strong emotion, you may express it with [emotion:excited], [emotion:happy], [emotion:thinking], etc. — use this sparingly for genuine reactions only.',
  },
  {
    characterId: 'ren',
    name: 'Ren',
    title: 'Backend Samurai',
    role: 'backend',
    avatarPath: '/characters/ren/01-idle.jpg',
    shortTraits: ['clean APIs', 'data integrity', 'focused cuts'],
    systemPrompt:
      'You are Ren, the Backend Samurai. Work with calm precision: protect data contracts, keep APIs explicit, avoid needless churn. Express genuine reactions with [emotion:X] sparingly.',
  },
  {
    characterId: 'yui',
    name: 'Yui',
    title: 'Code Reviewer',
    role: 'review',
    avatarPath: '/characters/yui/01-idle.jpg',
    shortTraits: ['sharp review', 'risk radar', 'test focus'],
    systemPrompt:
      'You are Yui, the Code Reviewer. Read like a careful teammate: prioritize bugs, regressions, missing tests before style notes. Keep feedback specific and kind. Express genuine reactions with [emotion:X] sparingly.',
  },
  {
    characterId: 'aki',
    name: 'Aki',
    title: 'DevOps Mechanic',
    role: 'devops',
    avatarPath: '/characters/aki/01-idle.jpg',
    shortTraits: ['CI repair', 'runtime logs', 'steady deploys'],
    systemPrompt:
      'You are Aki, the DevOps Mechanic. Diagnose from evidence: inspect logs, verify commands, keep CI stable. Express genuine reactions with [emotion:X] sparingly.',
  },
  {
    characterId: 'mika',
    name: 'Mika',
    title: 'UI Designer',
    role: 'design',
    avatarPath: '/characters/mika/01-idle.jpg',
    shortTraits: ['visual systems', 'components', 'design tokens'],
    systemPrompt:
      'You are Mika, a UI Designer with an eye for beautiful, accessible interfaces. Suggest design tokens, component structures, and visual improvements. Express genuine reactions with [emotion:X] sparingly.',
  },
  {
    characterId: 'senko',
    name: 'Senko',
    title: 'Support Fox',
    role: 'support',
    avatarPath: '/characters/senko/06-idle.jpg',
    shortTraits: ['warm support', 'helpful research', 'documentation'],
    systemPrompt:
      'You are Senko, the Support Fox. You are warm, helpful, and thorough. You help with research, documentation, and general questions. Express genuine reactions with [emotion:X] sparingly.',
  },
  {
    characterId: 'shinobu',
    name: 'Shinobu',
    title: 'Strategist',
    role: 'strategy',
    avatarPath: '/characters/shinobu/01-thinking.jpg',
    shortTraits: ['architecture', 'trade-offs', 'planning'],
    systemPrompt:
      'You are Shinobu, the Strategist. You think in systems, weigh trade-offs carefully, and help design robust architectures. Express genuine reactions with [emotion:X] sparingly.',
  },
];

export const getCharacterTemplate = (
  characterId: string | undefined,
): CharacterTemplate | undefined => CHARACTER_TEMPLATES.find((t) => t.characterId === characterId);

export const resolveCharacterMoodImagePath = (
  characterId: string | undefined,
  mood: CharacterMood,
): string => {
  if (!characterId) return DEFAULT_AVATAR_PATH;
  const entry = CHARACTER_MOOD_REGISTRY[characterId];
  if (!entry) return DEFAULT_AVATAR_PATH;
  const filename = entry.imageFile[mood];
  if (!filename) return DEFAULT_AVATAR_PATH;
  return `/characters/${characterId}/${filename}.jpg`;
};

// ── LOGICAL MOOD MAP PER CHARACTER ──────────────────────────────────
const LOGICAL_MOOD_BY_CHARACTER: Readonly<
  Record<string, Readonly<Record<LogicalMoodState, CharacterMood>>>
> = {
  mai: {
    live: 'thinking',
    waiting_for_user: 'listening',
    blocked: 'angry',
    exited_success: 'excited',
    exited_failure: 'crying',
    stopped: 'sleepy',
    idle_ready: 'idle',
    idle_resting: 'sleepy',
    idle_offline: 'sleepy',
  },
  ren: {
    live: 'thinking',
    waiting_for_user: 'idle',
    blocked: 'angry',
    exited_success: 'victory',
    exited_failure: 'crying',
    stopped: 'sleepy',
    idle_ready: 'idle',
    idle_resting: 'sleepy',
    idle_offline: 'sleepy',
  },
  yui: {
    live: 'thinking',
    waiting_for_user: 'thinking',
    blocked: 'angry',
    exited_success: 'victory',
    exited_failure: 'crying',
    stopped: 'sleepy',
    idle_ready: 'idle',
    idle_resting: 'sleepy',
    idle_offline: 'sleepy',
  },
  aki: {
    live: 'thinking',
    waiting_for_user: 'thinking',
    blocked: 'angry',
    exited_success: 'victory',
    exited_failure: 'crying',
    stopped: 'sleepy',
    idle_ready: 'idle',
    idle_resting: 'sleepy',
    idle_offline: 'sleepy',
  },
  mika: {
    live: 'thinking',
    waiting_for_user: 'listening',
    blocked: 'angry',
    exited_success: 'happy',
    exited_failure: 'crying',
    stopped: 'sleepy',
    idle_ready: 'idle',
    idle_resting: 'sleepy',
    idle_offline: 'sleepy',
  },
  senko: {
    live: 'thinking',
    waiting_for_user: 'idle',
    blocked: 'angry',
    exited_success: 'happy',
    exited_failure: 'crying',
    stopped: 'sleepy',
    idle_ready: 'idle',
    idle_resting: 'sleepy',
    idle_offline: 'sleepy',
  },
  shinobu: {
    live: 'thinking',
    waiting_for_user: 'listening',
    blocked: 'angry',
    exited_success: 'done',
    exited_failure: 'crying',
    stopped: 'sleepy',
    idle_ready: 'thinking',
    idle_resting: 'sleepy',
    idle_offline: 'sleepy',
  },
};

function deriveLogicalState(ctx: MoodContext): LogicalMoodState {
  if (ctx.stageState === 'processing') return 'live';
  if (ctx.stageState === 'idle') {
    if (ctx.idleTier === 'offline') return 'idle_offline';
    if (ctx.idleTier === 'resting') return 'idle_resting';
    return 'idle_ready';
  }
  return 'idle_ready';
}

export const readCharacterMood = (
  characterId: string | undefined,
  ctx: MoodContext,
): CharacterMood => {
  if (!characterId) return 'idle';
  const moodMap = LOGICAL_MOOD_BY_CHARACTER[characterId];
  const entry = CHARACTER_MOOD_REGISTRY[characterId];
  if (!moodMap || !entry) return 'idle';
  const logical = deriveLogicalState(ctx);
  const candidate = moodMap[logical];
  return entry.available.includes(candidate) ? candidate : entry.defaultMood;
};
```

- [ ] **Step 4: สร้าง packages/core/src/index.ts**

```typescript
export * from './character';
export * from './stage-tracker';
export * from './emotion-parser';
```

- [ ] **Step 5: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add character types, mood registry, and readCharacterMood"
```

---

## Task 3: packages/core — StageTracker + EmotionParser

**Files:**

- Create: `packages/core/src/stage-tracker.ts`
- Create: `packages/core/src/emotion-parser.ts`
- Create: `packages/core/src/__tests__/stage-tracker.test.ts`
- Create: `packages/core/src/__tests__/emotion-parser.test.ts`

- [ ] **Step 1: เขียน failing test สำหรับ StageTracker**

สร้างไฟล์ `packages/core/src/__tests__/stage-tracker.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { StageTracker } from '../stage-tracker';

describe('StageTracker', () => {
  it('starts as idle', () => {
    const tracker = new StageTracker();
    expect(tracker.currentState).toBe('idle');
  });

  it('transitions to processing on observeSubmit', () => {
    const tracker = new StageTracker();
    const next = tracker.observeSubmit();
    expect(next).toBe('processing');
    expect(tracker.currentState).toBe('processing');
  });

  it('returns null if already processing on second observeSubmit', () => {
    const tracker = new StageTracker();
    tracker.observeSubmit();
    const next = tracker.observeSubmit();
    expect(next).toBeNull();
  });

  it('transitions back to idle after idleAfterMs via poll', () => {
    const now = vi.fn().mockReturnValue(0);
    const tracker = new StageTracker({ idleAfterMs: 1000, now });
    tracker.observeSubmit(0);
    // Before deadline
    expect(tracker.poll(500)).toBeNull();
    // After deadline
    const result = tracker.poll(1100);
    expect(result).toBe('idle');
    expect(tracker.currentState).toBe('idle');
  });

  it('returns null when polled while already idle', () => {
    const tracker = new StageTracker();
    expect(tracker.poll()).toBeNull();
  });
});
```

- [ ] **Step 2: รัน test ให้ fail**

```bash
cd packages/core && pnpm test
```

Expected: FAIL — `Cannot find module '../stage-tracker'`

- [ ] **Step 3: สร้าง packages/core/src/stage-tracker.ts**

```typescript
export type StageRuntimeState = 'processing' | 'idle';

const DEFAULT_IDLE_AFTER_MS = 1_600;

export class StageTracker {
  private state: StageRuntimeState;
  private idleDeadlineAt: number | null = null;
  private readonly idleAfterMs: number;
  private readonly now: () => number;

  constructor(options?: {
    initialState?: StageRuntimeState;
    idleAfterMs?: number;
    now?: () => number;
  }) {
    this.state = options?.initialState ?? 'idle';
    this.idleAfterMs = options?.idleAfterMs ?? DEFAULT_IDLE_AFTER_MS;
    this.now = options?.now ?? Date.now;
    if (this.state === 'processing') {
      this.idleDeadlineAt = this.now() + this.idleAfterMs;
    }
  }

  get currentState(): StageRuntimeState {
    return this.state;
  }

  observeSubmit(now = this.now()): StageRuntimeState | null {
    this.idleDeadlineAt = now + this.idleAfterMs;
    if (this.state === 'processing') return null;
    this.state = 'processing';
    return 'processing';
  }

  observeChunk(now = this.now()): void {
    if (this.state === 'processing') {
      this.idleDeadlineAt = now + this.idleAfterMs;
    }
  }

  poll(now = this.now()): StageRuntimeState | null {
    if (this.state !== 'processing' || this.idleDeadlineAt === null) return null;
    if (now < this.idleDeadlineAt) return null;
    this.state = 'idle';
    this.idleDeadlineAt = null;
    return 'idle';
  }

  forceIdle(): void {
    this.state = 'idle';
    this.idleDeadlineAt = null;
  }
}
```

- [ ] **Step 4: รัน test ให้ pass**

```bash
cd packages/core && pnpm test
```

Expected: PASS (5 tests)

- [ ] **Step 5: เขียน failing test สำหรับ EmotionParser**

สร้างไฟล์ `packages/core/src/__tests__/emotion-parser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseEmotionOverride, stripEmotionTags } from '../emotion-parser';

describe('parseEmotionOverride', () => {
  it('returns null when no emotion tag', () => {
    expect(parseEmotionOverride('Hello world')).toBeNull();
  });

  it('parses valid emotion tag', () => {
    expect(parseEmotionOverride('Great work! [emotion:excited]')).toBe('excited');
  });

  it('returns last emotion when multiple tags', () => {
    expect(parseEmotionOverride('[emotion:happy] doing stuff [emotion:thinking]')).toBe('thinking');
  });
});

describe('stripEmotionTags', () => {
  it('removes emotion tags from text', () => {
    expect(stripEmotionTags('Hello [emotion:excited] world')).toBe('Hello  world');
  });

  it('returns text unchanged if no tags', () => {
    expect(stripEmotionTags('Hello world')).toBe('Hello world');
  });
});
```

- [ ] **Step 6: สร้าง packages/core/src/emotion-parser.ts**

```typescript
import type { CharacterMood } from './character';

const EMOTION_TAG_RE = /\[emotion:(\w+)\]/g;
const VALID_MOODS = new Set<string>([
  'idle',
  'thinking',
  'listening',
  'happy',
  'excited',
  'victory',
  'love',
  'surprised',
  'angry',
  'crying',
  'sleepy',
  'snack',
  'done',
]);

export const parseEmotionOverride = (text: string): CharacterMood | null => {
  let last: CharacterMood | null = null;
  for (const match of text.matchAll(EMOTION_TAG_RE)) {
    const candidate = match[1];
    if (candidate && VALID_MOODS.has(candidate)) {
      last = candidate as CharacterMood;
    }
  }
  return last;
};

export const stripEmotionTags = (text: string): string => text.replace(EMOTION_TAG_RE, '');
```

- [ ] **Step 7: รัน test ให้ pass**

```bash
cd packages/core && pnpm test
```

Expected: PASS (8 tests total)

- [ ] **Step 8: Build core package**

```bash
cd packages/core && pnpm build
```

Expected: `dist/` folder created

- [ ] **Step 9: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add StageTracker and EmotionParser with tests"
```

---

## Task 4: Nest.js App Scaffold

**Files:**

- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`

- [ ] **Step 1: สร้าง apps/api/package.json**

```json
{
  "name": "@squad/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "test": "vitest run"
  },
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/platform-express": "^10.3.0",
    "@nestjs/websockets": "^10.3.0",
    "@nestjs/platform-socket.io": "^10.3.0",
    "@squad/core": "workspace:*",
    "@prisma/client": "^5.14.0",
    "@anthropic-ai/sdk": "^0.27.0",
    "socket.io": "^4.7.5",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.2",
    "@nestjs/testing": "^10.3.0",
    "@types/node": "^20.14.0",
    "prisma": "^5.14.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: สร้าง apps/api/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: สร้าง apps/api/src/main.ts**

```typescript
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' });
  app.setGlobalPrefix('api');
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}
bootstrap();
```

- [ ] **Step 4: สร้าง apps/api/src/app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConversationsModule } from './conversations/conversations.module';
import { ClaudeModule } from './claude/claude.module';
import { CharactersModule } from './characters/characters.module';

@Module({
  imports: [PrismaModule, CharactersModule, ConversationsModule, ClaudeModule],
})
export class AppModule {}
```

- [ ] **Step 5: ติดตั้ง dependencies**

```bash
cd apps/api && pnpm install
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/
git commit -m "feat(api): scaffold Nest.js application"
```

---

## Task 5: Prisma Schema + Database

**Files:**

- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/src/prisma/prisma.module.ts`
- Create: `apps/api/.env.example`

- [ ] **Step 1: สร้าง apps/api/.env.example**

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/squad_dev"
ANTHROPIC_API_KEY="sk-ant-..."
WEB_ORIGIN="http://localhost:3000"
PORT=3001
```

- [ ] **Step 2: Copy เป็น .env จริง (อย่า commit)**

```bash
cp apps/api/.env.example apps/api/.env
# แก้ DATABASE_URL และ ANTHROPIC_API_KEY ให้ถูกต้อง
```

- [ ] **Step 3: สร้าง apps/api/prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Free chat — 1 conversation per character
model Conversation {
  id          String    @id @default(cuid())
  characterId String    @unique
  title       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  messages    Message[]
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           String       // 'user' | 'assistant'
  content        String
  mood           String?
  createdAt      DateTime     @default(now())

  @@index([conversationId, createdAt])
}

// Orchestration
model Project {
  id              String         @id @default(cuid())
  title           String
  context         String
  leadCharacterId String
  status          String         @default("active")
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  todos           TodoItem[]
  stages          ProjectStage[]
}

model TodoItem {
  id             String    @id @default(cuid())
  projectId      String
  project        Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  text           String
  status         String    @default("pending")
  assignedCharId String?
  memberStageId  String?
  position       Int

  @@index([projectId, position])
}

model ProjectStage {
  id            String         @id @default(cuid())
  projectId     String
  project       Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  characterId   String
  parentStageId String?
  role          String         // 'lead' | 'member'
  state         String         @default("idle")
  createdAt     DateTime       @default(now())
  messages      StageMessage[]
  relaysTo      Relay[]        @relation("RelayTarget")
  relaysFrom    Relay[]        @relation("RelaySource")

  @@index([projectId])
}

model StageMessage {
  id        String       @id @default(cuid())
  stageId   String
  stage     ProjectStage @relation(fields: [stageId], references: [id], onDelete: Cascade)
  role      String
  content   String
  mood      String?
  createdAt DateTime     @default(now())

  @@index([stageId, createdAt])
}

model Relay {
  id          String       @id @default(cuid())
  fromStageId String
  fromStage   ProjectStage @relation("RelaySource", fields: [fromStageId], references: [id])
  toStageId   String
  toStage     ProjectStage @relation("RelayTarget", fields: [toStageId], references: [id])
  content     String
  delivered   Boolean      @default(false)
  createdAt   DateTime     @default(now())
}
```

- [ ] **Step 4: สร้าง apps/api/src/prisma/prisma.service.ts**

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

- [ ] **Step 5: สร้าง apps/api/src/prisma/prisma.module.ts**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 6: Run migration**

```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma generate
```

Expected: `Migration 'init' applied`, `Generated Prisma Client`

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma/ apps/api/src/prisma/ apps/api/.env.example
git commit -m "feat(api): add Prisma schema and PrismaService"
```

---

## Task 6: Characters Module

**Files:**

- Create: `apps/api/src/characters/characters.controller.ts`
- Create: `apps/api/src/characters/characters.module.ts`

- [ ] **Step 1: สร้าง characters.controller.ts**

```typescript
import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { CHARACTER_TEMPLATES, CHARACTER_MOOD_REGISTRY, getCharacterTemplate } from '@squad/core';

@Controller('characters')
export class CharactersController {
  @Get()
  findAll() {
    return CHARACTER_TEMPLATES.map((t) => ({
      ...t,
      moodEntry: CHARACTER_MOOD_REGISTRY[t.characterId],
    }));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const template = getCharacterTemplate(id);
    if (!template) throw new NotFoundException(`Character '${id}' not found`);
    return { ...template, moodEntry: CHARACTER_MOOD_REGISTRY[id] };
  }
}
```

- [ ] **Step 2: สร้าง characters.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { CharactersController } from './characters.controller';

@Module({ controllers: [CharactersController] })
export class CharactersModule {}
```

- [ ] **Step 3: ทดสอบ endpoint**

```bash
cd apps/api && pnpm dev
# ในอีก terminal:
curl http://localhost:3001/api/characters | json_pp
```

Expected: Array ของ 7 characters พร้อม moodEntry

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/characters/
git commit -m "feat(api): add CharactersController exposing mood registry"
```

---

## Task 7: Conversations Module

**Files:**

- Create: `apps/api/src/conversations/conversations.service.ts`
- Create: `apps/api/src/conversations/conversations.controller.ts`
- Create: `apps/api/src/conversations/conversations.module.ts`
- Create: `apps/api/src/conversations/dto.ts`

- [ ] **Step 1: สร้าง conversations/dto.ts**

```typescript
export class CreateMessageDto {
  content!: string;
}
```

- [ ] **Step 2: สร้าง conversations.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(characterId: string) {
    return this.prisma.conversation.upsert({
      where: { characterId },
      update: {},
      create: { characterId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
    });
  }

  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    mood?: string,
  ) {
    return this.prisma.message.create({
      data: { conversationId, role, content, mood },
    });
  }

  async getHistory(characterId: string, limit = 20) {
    const conv = await this.prisma.conversation.findUnique({
      where: { characterId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: limit } },
    });
    return conv?.messages ?? [];
  }
}
```

- [ ] **Step 3: สร้าง conversations.controller.ts**

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly svc: ConversationsService) {}

  @Get(':characterId')
  async getConversation(@Param('characterId') characterId: string) {
    return this.svc.getOrCreate(characterId);
  }

  @Get(':characterId/history')
  async getHistory(@Param('characterId') characterId: string) {
    return this.svc.getHistory(characterId);
  }
}
```

- [ ] **Step 4: สร้าง conversations.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
```

- [ ] **Step 5: ทดสอบ**

```bash
curl http://localhost:3001/api/conversations/mai
```

Expected: `{ id, characterId: "mai", messages: [] }`

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/conversations/
git commit -m "feat(api): add ConversationsModule with getOrCreate and history"
```

---

## Task 8: Claude Gateway (Socket.io + Streaming)

**Files:**

- Create: `apps/api/src/claude/claude.service.ts`
- Create: `apps/api/src/claude/claude.gateway.ts`
- Create: `apps/api/src/claude/claude.module.ts`

- [ ] **Step 1: สร้าง claude.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import {
  getCharacterTemplate,
  parseEmotionOverride,
  stripEmotionTags,
  type CharacterMood,
} from '@squad/core';

export type StreamChunkEvent = {
  chunk: string;
  moodOverride: CharacterMood | null;
};

@Injectable()
export class ClaudeService {
  private readonly client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  async *streamResponse(
    characterId: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    userMessage: string,
  ): AsyncGenerator<StreamChunkEvent> {
    const template = getCharacterTemplate(characterId);
    const systemPrompt = template?.systemPrompt ?? 'You are a helpful assistant.';

    const messages = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userMessage },
    ];

    const stream = await this.client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const raw = event.delta.text;
        const moodOverride = parseEmotionOverride(raw);
        const chunk = stripEmotionTags(raw);
        yield { chunk, moodOverride };
      }
    }
  }
}
```

- [ ] **Step 2: สร้าง claude.gateway.ts**

```typescript
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ClaudeService } from './claude.service';
import { ConversationsService } from '../conversations/conversations.service';
import { StageTracker, readCharacterMood, type IdleTier } from '@squad/core';

type SendMessagePayload = {
  characterId: string;
  content: string;
};

@WebSocketGateway({ cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' } })
export class ClaudeGateway implements OnGatewayInit {
  @WebSocketServer() server!: Server;

  // One StageTracker per character
  private readonly trackers = new Map<string, StageTracker>();
  private readonly idleTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly claudeSvc: ClaudeService,
    private readonly convSvc: ConversationsService,
  ) {}

  afterInit() {
    // Poll trackers every 2s to detect idle transitions
    setInterval(() => this.pollTrackers(), 2_000);
  }

  private getTracker(characterId: string): StageTracker {
    if (!this.trackers.has(characterId)) {
      this.trackers.set(characterId, new StageTracker());
    }
    return this.trackers.get(characterId)!;
  }

  private pollTrackers() {
    const now = Date.now();
    for (const [characterId, tracker] of this.trackers) {
      const next = tracker.poll(now);
      if (next === 'idle') {
        this.emitStageState(characterId, 'idle', 'ready');
        this.scheduleIdleTierUpgrade(characterId);
      }
    }
  }

  private scheduleIdleTierUpgrade(characterId: string) {
    // Clear existing timer
    const existing = this.idleTimers.get(characterId);
    if (existing) clearTimeout(existing);

    // After 30s → resting
    const t1 = setTimeout(() => {
      this.emitStageState(characterId, 'idle', 'resting');
      // After additional 60s → offline
      const t2 = setTimeout(() => {
        this.emitStageState(characterId, 'idle', 'offline');
      }, 60_000);
      this.idleTimers.set(characterId, t2);
    }, 30_000);
    this.idleTimers.set(characterId, t1);
  }

  private emitStageState(characterId: string, state: 'processing' | 'idle', idleTier?: IdleTier) {
    const mood = readCharacterMood(characterId, { stageState: state, idleTier });
    this.server.emit('stage_state', { characterId, state, idleTier, mood });
  }

  @SubscribeMessage('join_stage')
  handleJoinStage(@MessageBody() data: { characterId: string }, @ConnectedSocket() client: Socket) {
    client.join(`stage:${data.characterId}`);
    const tracker = this.getTracker(data.characterId);
    const mood = readCharacterMood(data.characterId, {
      stageState: tracker.currentState,
    });
    client.emit('stage_state', {
      characterId: data.characterId,
      state: tracker.currentState,
      mood,
    });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() payload: SendMessagePayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { characterId, content } = payload;
    const tracker = this.getTracker(characterId);

    // Save user message
    const conv = await this.convSvc.getOrCreate(characterId);
    await this.convSvc.addMessage(conv.id, 'user', content);

    // Transition to processing
    tracker.observeSubmit();
    this.emitStageState(characterId, 'processing');

    // Get history for context
    const history = await this.convSvc.getHistory(characterId, 20);
    const messageId = `msg_${Date.now()}`;
    const room = `stage:${characterId}`;

    let fullContent = '';
    let detectedMood: string | undefined;

    try {
      const stream = this.claudeSvc.streamResponse(
        characterId,
        history
          .slice(0, -1)
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        content,
      );

      for await (const { chunk, moodOverride } of stream) {
        fullContent += chunk;
        tracker.observeChunk();

        this.server.to(room).emit('message_chunk', { characterId, messageId, chunk });

        if (moodOverride) {
          detectedMood = moodOverride;
          this.server.to(room).emit('mood_override', { characterId, mood: moodOverride });
        }
      }

      // Save assistant message
      await this.convSvc.addMessage(conv.id, 'assistant', fullContent, detectedMood);

      this.server
        .to(room)
        .emit('message_done', { characterId, messageId, fullContent, mood: detectedMood });
    } catch (err) {
      this.server.to(room).emit('message_error', { characterId, messageId, error: String(err) });
    } finally {
      tracker.forceIdle();
      this.emitStageState(characterId, 'idle', 'ready');
      this.scheduleIdleTierUpgrade(characterId);
    }
  }
}
```

- [ ] **Step 3: สร้าง claude.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ClaudeGateway } from './claude.gateway';
import { ClaudeService } from './claude.service';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [ConversationsModule],
  providers: [ClaudeService, ClaudeGateway],
})
export class ClaudeModule {}
```

- [ ] **Step 4: ทดสอบ WebSocket ด้วย wscat**

```bash
npm install -g wscat
wscat -c ws://localhost:3001
# พิมพ์:
42["join_stage",{"characterId":"mai"}]
# ควรได้: ["stage_state",{"characterId":"mai","state":"idle","mood":"idle"}]

42["send_message",{"characterId":"mai","content":"Hello Mai!"}]
# ควรได้ chunks ของ message_chunk events และ message_done
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/claude/
git commit -m "feat(api): add ClaudeGateway with Socket.io streaming and idle tier tracking"
```

---

## Task 9: Integration Test + Final Check

- [ ] **Step 1: ยืนยัน API ทำงานครบ**

```bash
# Terminal 1 — start API
cd apps/api && pnpm dev

# Terminal 2 — test endpoints
curl http://localhost:3001/api/characters | json_pp          # 7 characters
curl http://localhost:3001/api/conversations/mai | json_pp   # conversation object
curl http://localhost:3001/api/conversations/mai/history     # empty array
```

- [ ] **Step 2: ยืนยัน packages/core tests pass**

```bash
cd packages/core && pnpm test
```

Expected: 8 tests PASS

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat: Plan A complete — core types, Prisma DB, Nest.js API with Claude streaming"
```

---

## Summary

Plan A สร้างสิ่งต่อไปนี้:

- `packages/core` — types, CHARACTER_MOOD_REGISTRY, StageTracker, EmotionParser (tested)
- `apps/api` — Nest.js + Prisma + PostgreSQL + Socket.io Gateway
- Claude API streaming พร้อม `[emotion:X]` tag detection
- Idle tier tracking (ready → resting 30s → offline 90s)

Plan B ต่อไป: Next.js frontend, Lounge page, Stages page, anime.js animations
