// Azur Lane style dorm engine — pure module.
// No PIXI, no window, no Date.now(): callers always pass `now` in ms.

import type { RoomObject } from '@/components/lounge/roomDefs';

// ─── Tuning constants ─────────────────────────────────────────────────────────

export const FOOD_CAP = 40000;
/** Food units consumed per character per minute while any food remains. */
export const FOOD_DRAIN_PER_CHAR_PER_MIN = 45;
/** Base XP gained per character per minute while food remains. */
export const XP_PER_MIN_BASE = 40;
/** Offline catch-up is capped at this many milliseconds (8 hours). */
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;

export const MORALE_MAX = 150;
export const MORALE_START = 120;
/** Morale recovered per minute in the dorm before comfort scaling. */
export const MORALE_RECOVERY_PER_MIN = 2;

export const AFFECTION_MAX = 100;
export const AFFECTION_START = 50;
/** Passive affection gained per minute in the dorm. */
export const AFFECTION_PER_MIN = 0.1;
export const HEADPAT_AFFECTION = 0.5;
export const HEADPAT_COOLDOWN_MS = 30_000;

/** Comfort bonus cap (c/(c+100) limited to this value). */
export const COMFORT_BONUS_CAP = 0.5;

/** Playtest preset export for A/B comparison (opt-in via env or dev panel). */
export const PLAYTEST_PRESET = {
  FOOD_DRAIN_PER_CHAR_PER_MIN: 45,
  XP_PER_MIN_BASE: 40,
  MORALE_RECOVERY_PER_MIN: 2,
  AFFECTION_PER_MIN: 0.1,
  HEADPAT_AFFECTION: 0.5,
  COMFORT_BONUS_CAP: 0.5,
} as const;

// ─── Food items (Azur Lane style supply catalog) ─────────────────────────────

export type FoodItem = {
  id: string;
  label: string;
  icon: string;
  food: number;
  cost: number;
};

export const FOOD_ITEMS: FoodItem[] = [
  { id: 'oxy_cola', label: 'Oxy-Cola', icon: '🥤', food: 1000, cost: 50 },
  { id: 'canned_food', label: 'Canned Food', icon: '🥫', food: 2000, cost: 95 },
  { id: 'lunch_box', label: 'Lunch Box', icon: '🍱', food: 3000, cost: 135 },
  { id: 'royal_feast', label: 'Royal Feast', icon: '🍛', food: 6000, cost: 250 },
];

export function getFoodItem(id: string): FoodItem | undefined {
  return FOOD_ITEMS.find((f) => f.id === id);
}

// ─── Character + dorm state ───────────────────────────────────────────────────

export type DormCharacterStats = {
  level: number;
  /** XP accumulated toward the next level. */
  xp: number;
  morale: number;
  affection: number;
  /** Timestamp (ms) of the last accepted headpat. 0 = never. */
  lastHeadpatAt: number;
};

export type DormState = {
  food: number;
  characters: Record<string, DormCharacterStats>;
  /** Timestamp (ms) of the last applied tick. */
  lastTickAt: number;
};

export function createDormCharacter(): DormCharacterStats {
  return {
    level: 1,
    xp: 0,
    morale: MORALE_START,
    affection: AFFECTION_START,
    lastHeadpatAt: 0,
  };
}

export function createDormState(characterIds: string[], now: number): DormState {
  const characters: Record<string, DormCharacterStats> = {};
  for (const id of characterIds) characters[id] = createDormCharacter();
  return { food: 12000, characters, lastTickAt: now };
}

/** Restores a persisted dorm state, filling in defaults for missing fields. */
export function reviveDormState(
  raw: unknown,
  characterIds: string[],
  now: number,
): DormState {
  const fallback = createDormState(characterIds, now);
  if (typeof raw !== 'object' || raw === null) return fallback;
  const data = raw as Partial<DormState>;
  const characters: Record<string, DormCharacterStats> = {};
  for (const id of characterIds) {
    const c = data.characters?.[id];
    characters[id] = {
      level: clampInt(c?.level, 1, 999, 1),
      xp: clampNumber(c?.xp, 0, Number.MAX_SAFE_INTEGER, 0),
      morale: clampNumber(c?.morale, 0, MORALE_MAX, MORALE_START),
      affection: clampNumber(c?.affection, 0, AFFECTION_MAX, AFFECTION_START),
      lastHeadpatAt: clampNumber(c?.lastHeadpatAt, 0, Number.MAX_SAFE_INTEGER, 0),
    };
  }
  return {
    food: clampNumber(data.food, 0, FOOD_CAP, fallback.food),
    characters,
    lastTickAt: clampNumber(data.lastTickAt, 0, now, now),
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  return Math.round(clampNumber(value, min, max, fallback));
}

// ─── Comfort ─────────────────────────────────────────────────────────────────

/** Total comfort = sum of placed furniture happiness values (Azur Lane comfort). */
export function computeComfort(objects: Pick<RoomObject, 'happiness'>[]): number {
  return objects.reduce((sum, o) => sum + Math.max(0, o.happiness), 0);
}

/** Diminishing-returns comfort bonus in [0, COMFORT_BONUS_CAP): comfort/(comfort+100). */
export function comfortXpBonus(comfort: number): number {
  const c = Math.max(0, comfort);
  return Math.min(COMFORT_BONUS_CAP, c / (c + 100));
}

// ─── Levels ──────────────────────────────────────────────────────────────────

/** XP required to advance from `level` to `level + 1`. */
export function xpToNextLevel(level: number): number {
  return 100 + (Math.max(1, level) - 1) * 50;
}

/** Applies raw XP to a character, consuming level-ups. Returns levels gained. */
function applyXp(char: DormCharacterStats, amount: number): number {
  let gained = 0;
  char.xp += amount;
  while (char.xp >= xpToNextLevel(char.level)) {
    char.xp -= xpToNextLevel(char.level);
    char.level += 1;
    gained += 1;
  }
  return gained;
}

// ─── Morale / affection bands ─────────────────────────────────────────────────

export type MoraleBand = 'sparkling' | 'happy' | 'normal' | 'sad' | 'depressed';

export function moraleBand(morale: number): MoraleBand {
  if (morale >= 120) return 'sparkling';
  if (morale >= 80) return 'happy';
  if (morale >= 40) return 'normal';
  if (morale >= 20) return 'sad';
  return 'depressed';
}

export const MORALE_EMOJI: Record<MoraleBand, string> = {
  sparkling: '😆',
  happy: '🙂',
  normal: '😐',
  sad: '😟',
  depressed: '😢',
};

export type AffectionBand = 'stranger' | 'friendly' | 'like' | 'love' | 'promise';

export function affectionBand(affection: number): AffectionBand {
  if (affection >= 100) return 'promise';
  if (affection >= 80) return 'love';
  if (affection >= 60) return 'like';
  if (affection >= 50) return 'friendly';
  return 'stranger';
}

export const AFFECTION_LABEL: Record<AffectionBand, string> = {
  stranger: 'Stranger',
  friendly: 'Friendly',
  like: 'Like',
  love: 'Love',
  promise: 'Promise 💍',
};

// ─── Tick ────────────────────────────────────────────────────────────────────

export type DormTickResult = {
  state: DormState;
  /** Wall-clock milliseconds covered by this tick after the offline cap. */
  elapsedMs: number;
  foodConsumed: number;
  xpPerCharacter: number;
  levelUps: number;
};

export type DormTickOptions = {
  comfort: number;
  /** Character ids currently resting (extra morale recovery). */
  restingIds?: string[];
};

/**
 * Advances dorm simulation from `state.lastTickAt` to `now`.
 * Food drains per character; XP accrues only while food remains.
 * Morale and affection recover passively. Pure — returns a new state.
 */
export function tickDorm(state: DormState, now: number, options: DormTickOptions): DormTickResult {
  const elapsedMs = Math.max(0, Math.min(now - state.lastTickAt, OFFLINE_CAP_MS));
  const ids = Object.keys(state.characters);
  const next: DormState = {
    food: state.food,
    characters: Object.fromEntries(ids.map((id) => [id, { ...state.characters[id]! }])),
    lastTickAt: now,
  };

  if (elapsedMs === 0 || ids.length === 0) {
    return { state: next, elapsedMs, foodConsumed: 0, xpPerCharacter: 0, levelUps: 0 };
  }

  const minutes = elapsedMs / 60_000;
  const drainPerMin = FOOD_DRAIN_PER_CHAR_PER_MIN * ids.length;
  // Minutes during which food remained available (XP-earning minutes).
  const fedMinutes = drainPerMin > 0 ? Math.min(minutes, next.food / drainPerMin) : minutes;
  const foodConsumed = Math.min(next.food, Math.round(drainPerMin * minutes));
  next.food = Math.max(0, next.food - foodConsumed);

  const bonus = comfortXpBonus(options.comfort);
  // XP stays fractional internally so frequent small ticks do not drift.
  const xpPerCharacterRaw = XP_PER_MIN_BASE * (1 + bonus) * fedMinutes;
  const moraleGain = MORALE_RECOVERY_PER_MIN * (1 + bonus * 0.5) * minutes;
  const affectionGain = AFFECTION_PER_MIN * minutes;
  const resting = new Set(options.restingIds ?? []);

  let levelUps = 0;
  for (const id of ids) {
    const char = next.characters[id]!;
    levelUps += applyXp(char, xpPerCharacterRaw);
    const restBonus = resting.has(id) ? 3 * minutes : 0;
    char.morale = Math.min(MORALE_MAX, char.morale + moraleGain + restBonus);
    char.affection = Math.min(AFFECTION_MAX, char.affection + affectionGain);
  }

  return {
    state: next,
    elapsedMs,
    foodConsumed,
    xpPerCharacter: Math.round(xpPerCharacterRaw),
    levelUps,
  };
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export type FeedResult = {
  state: DormState;
  /** Food units actually added after the cap. */
  added: number;
};

/** Adds a food item's units to the gauge, clamped to FOOD_CAP. */
export function feedDorm(state: DormState, item: FoodItem): FeedResult {
  const added = Math.min(item.food, FOOD_CAP - state.food);
  if (added <= 0) return { state, added: 0 };
  return { state: { ...state, food: state.food + added }, added };
}

export type HeadpatResult = {
  state: DormState;
  accepted: boolean;
  affection: number;
};

/** Headpat a character: +affection with a per-character cooldown. */
export function applyHeadpat(state: DormState, characterId: string, now: number): HeadpatResult {
  const char = state.characters[characterId];
  if (!char) return { state, accepted: false, affection: 0 };
  if (now - char.lastHeadpatAt < HEADPAT_COOLDOWN_MS) {
    return { state, accepted: false, affection: char.affection };
  }
  const nextChar: DormCharacterStats = {
    ...char,
    affection: Math.min(AFFECTION_MAX, char.affection + HEADPAT_AFFECTION),
    lastHeadpatAt: now,
  };
  return {
    state: {
      ...state,
      characters: { ...state.characters, [characterId]: nextChar },
    },
    accepted: true,
    affection: nextChar.affection,
  };
}

/** Morale drained when a task auto-completes; rest restores instead. */
export const TASK_MORALE_DELTA: Record<string, number> = {
  code: -6,
  research: -4,
  meeting: -4,
  document: -4,
  review: -5,
  print: -2,
  rest: 15,
};

/** Applies the morale delta for a completed task type. */
export function applyTaskMorale(state: DormState, characterId: string, taskType: string): DormState {
  const char = state.characters[characterId];
  const delta = TASK_MORALE_DELTA[taskType];
  if (!char || delta === undefined) return state;
  const nextChar: DormCharacterStats = {
    ...char,
    morale: Math.max(0, Math.min(MORALE_MAX, char.morale + delta)),
  };
  return { ...state, characters: { ...state.characters, [characterId]: nextChar } };
}

/** Tactical class (Train button): grant flat XP to every character. */
export function applyTrainingXp(state: DormState, xpAmount: number): { state: DormState; levelUps: number } {
  const ids = Object.keys(state.characters);
  const characters: Record<string, DormCharacterStats> = {};
  let levelUps = 0;
  for (const id of ids) {
    const char = { ...state.characters[id]! };
    levelUps += applyXp(char, Math.max(0, xpAmount));
    characters[id] = char;
  }
  return { state: { ...state, characters }, levelUps };
}

// ─── Derived display helpers ──────────────────────────────────────────────────

/** Seconds until the food gauge empties at the current drain rate. */
export function foodDepletionSeconds(food: number, characterCount: number): number {
  const drainPerSec = (FOOD_DRAIN_PER_CHAR_PER_MIN * characterCount) / 60;
  if (drainPerSec <= 0) return 0;
  return Math.ceil(Math.max(0, food) / drainPerSec);
}
