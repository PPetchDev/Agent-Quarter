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
