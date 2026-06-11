import { describe, expect, it } from 'vitest';
import {
  AFFECTION_MAX,
  AFFECTION_START,
  FOOD_CAP,
  FOOD_DRAIN_PER_CHAR_PER_MIN,
  FOOD_ITEMS,
  HEADPAT_AFFECTION,
  HEADPAT_COOLDOWN_MS,
  MORALE_MAX,
  MORALE_START,
  OFFLINE_CAP_MS,
  XP_PER_MIN_BASE,
  affectionBand,
  applyHeadpat,
  applyTaskMorale,
  applyTrainingXp,
  comfortXpBonus,
  computeComfort,
  createDormState,
  feedDorm,
  foodDepletionSeconds,
  getFoodItem,
  moraleBand,
  reviveDormState,
  tickDorm,
  xpToNextLevel,
} from './dormEngine';

const IDS = ['agent-1', 'agent-2', 'agent-3', 'agent-4', 'agent-5'];
const T0 = 1_000_000;

describe('comfort', () => {
  it('sums furniture happiness values and ignores negatives', () => {
    expect(computeComfort([{ happiness: 10 }, { happiness: 5 }, { happiness: -3 }])).toBe(15);
    expect(computeComfort([])).toBe(0);
  });

  it('comfort bonus has diminishing returns and stays below 1', () => {
    expect(comfortXpBonus(0)).toBe(0);
    expect(comfortXpBonus(100)).toBeCloseTo(0.5);
    expect(comfortXpBonus(300)).toBeCloseTo(0.75);
    expect(comfortXpBonus(10_000)).toBeLessThan(1);
    expect(comfortXpBonus(-50)).toBe(0);
  });
});

describe('levels', () => {
  it('level curve grows linearly', () => {
    expect(xpToNextLevel(1)).toBe(100);
    expect(xpToNextLevel(2)).toBe(150);
    expect(xpToNextLevel(5)).toBe(300);
  });
});

describe('createDormState / reviveDormState', () => {
  it('creates default characters with AL starting stats', () => {
    const state = createDormState(IDS, T0);
    expect(Object.keys(state.characters)).toEqual(IDS);
    const char = state.characters['agent-1']!;
    expect(char.level).toBe(1);
    expect(char.morale).toBe(MORALE_START);
    expect(char.affection).toBe(AFFECTION_START);
    expect(state.lastTickAt).toBe(T0);
  });

  it('revives persisted state and clamps invalid fields', () => {
    const revived = reviveDormState(
      {
        food: FOOD_CAP * 10,
        lastTickAt: T0 - 5000,
        characters: {
          'agent-1': { level: 7, xp: 20, morale: 500, affection: -10, lastHeadpatAt: 1 },
        },
      },
      IDS,
      T0,
    );
    expect(revived.food).toBe(FOOD_CAP);
    expect(revived.lastTickAt).toBe(T0 - 5000);
    expect(revived.characters['agent-1']!.level).toBe(7);
    expect(revived.characters['agent-1']!.morale).toBe(MORALE_MAX);
    expect(revived.characters['agent-1']!.affection).toBe(0);
    // Missing characters fall back to defaults
    expect(revived.characters['agent-2']!.level).toBe(1);
  });

  it('returns fresh defaults for garbage input', () => {
    const revived = reviveDormState('nope', IDS, T0);
    expect(revived.characters['agent-3']!.morale).toBe(MORALE_START);
    expect(revived.lastTickAt).toBe(T0);
  });
});

describe('tickDorm', () => {
  it('drains food per character per minute and accrues XP', () => {
    const state = createDormState(IDS, T0);
    const oneMinute = T0 + 60_000;
    const result = tickDorm(state, oneMinute, { comfort: 0 });
    expect(result.foodConsumed).toBe(FOOD_DRAIN_PER_CHAR_PER_MIN * IDS.length);
    expect(result.state.food).toBe(state.food - result.foodConsumed);
    expect(result.xpPerCharacter).toBe(XP_PER_MIN_BASE);
    expect(result.state.characters['agent-1']!.xp).toBe(XP_PER_MIN_BASE);
    expect(result.state.lastTickAt).toBe(oneMinute);
  });

  it('comfort boosts XP rate', () => {
    const state = createDormState(IDS, T0);
    const result = tickDorm(state, T0 + 60_000, { comfort: 100 });
    expect(result.xpPerCharacter).toBe(Math.round(XP_PER_MIN_BASE * 1.5));
  });

  it('stops XP accrual when food runs out mid-tick', () => {
    const state = { ...createDormState(IDS, T0), food: FOOD_DRAIN_PER_CHAR_PER_MIN * IDS.length };
    // 10 minutes elapsed, but only 1 minute of food available.
    const result = tickDorm(state, T0 + 10 * 60_000, { comfort: 0 });
    expect(result.state.food).toBe(0);
    expect(result.xpPerCharacter).toBe(XP_PER_MIN_BASE);
  });

  it('recovers morale and affection passively, resting adds extra morale', () => {
    const base = createDormState(IDS, T0);
    base.characters['agent-1']!.morale = 50;
    base.characters['agent-2']!.morale = 50;
    const result = tickDorm(base, T0 + 10 * 60_000, { comfort: 0, restingIds: ['agent-2'] });
    const m1 = result.state.characters['agent-1']!.morale;
    const m2 = result.state.characters['agent-2']!.morale;
    expect(m1).toBeCloseTo(60);
    expect(m2).toBeCloseTo(90);
    expect(result.state.characters['agent-1']!.affection).toBeCloseTo(AFFECTION_START + 0.6);
  });

  it('caps morale and affection at maxima', () => {
    const base = createDormState(IDS, T0);
    base.characters['agent-1']!.affection = AFFECTION_MAX - 0.01;
    const result = tickDorm(base, T0 + 60 * 60_000, { comfort: 0, restingIds: IDS });
    expect(result.state.characters['agent-1']!.morale).toBe(MORALE_MAX);
    expect(result.state.characters['agent-1']!.affection).toBe(AFFECTION_MAX);
  });

  it('applies level-ups from accumulated XP', () => {
    const state = { ...createDormState(IDS, T0), food: FOOD_CAP };
    // 100 minutes fed at comfort 0 → 3000 XP → several levels.
    const result = tickDorm(state, T0 + 100 * 60_000, { comfort: 0 });
    const char = result.state.characters['agent-1']!;
    expect(char.level).toBeGreaterThan(1);
    expect(result.levelUps).toBeGreaterThan(0);
    expect(char.xp).toBeLessThan(xpToNextLevel(char.level));
  });

  it('caps offline elapsed time at OFFLINE_CAP_MS', () => {
    const state = { ...createDormState(IDS, T0), food: FOOD_CAP };
    const result = tickDorm(state, T0 + OFFLINE_CAP_MS * 3, { comfort: 0 });
    expect(result.elapsedMs).toBe(OFFLINE_CAP_MS);
  });

  it('is a no-op for zero or negative elapsed time', () => {
    const state = createDormState(IDS, T0);
    const result = tickDorm(state, T0 - 500, { comfort: 50 });
    expect(result.elapsedMs).toBe(0);
    expect(result.foodConsumed).toBe(0);
    expect(result.state.characters['agent-1']!.xp).toBe(0);
  });

  it('does not mutate the input state', () => {
    const state = createDormState(IDS, T0);
    const snapshot = JSON.parse(JSON.stringify(state));
    tickDorm(state, T0 + 60_000, { comfort: 10 });
    expect(state).toEqual(snapshot);
  });
});

describe('feedDorm', () => {
  it('adds food units up to the cap', () => {
    const state = { ...createDormState(IDS, T0), food: FOOD_CAP - 500 };
    const item = getFoodItem('oxy_cola')!;
    const result = feedDorm(state, item);
    expect(result.added).toBe(500);
    expect(result.state.food).toBe(FOOD_CAP);
  });

  it('rejects feeding when full', () => {
    const state = { ...createDormState(IDS, T0), food: FOOD_CAP };
    const result = feedDorm(state, FOOD_ITEMS[0]!);
    expect(result.added).toBe(0);
    expect(result.state.food).toBe(FOOD_CAP);
  });
});

describe('applyHeadpat', () => {
  it('grants affection and starts cooldown', () => {
    const state = createDormState(IDS, T0);
    const result = applyHeadpat(state, 'agent-1', T0);
    expect(result.accepted).toBe(true);
    expect(result.state.characters['agent-1']!.affection).toBeCloseTo(
      AFFECTION_START + HEADPAT_AFFECTION,
    );

    const again = applyHeadpat(result.state, 'agent-1', T0 + HEADPAT_COOLDOWN_MS - 1);
    expect(again.accepted).toBe(false);

    const later = applyHeadpat(result.state, 'agent-1', T0 + HEADPAT_COOLDOWN_MS);
    expect(later.accepted).toBe(true);
  });

  it('ignores unknown characters', () => {
    const state = createDormState(IDS, T0);
    expect(applyHeadpat(state, 'ghost', T0).accepted).toBe(false);
  });
});

describe('applyTaskMorale', () => {
  it('drains morale for work tasks and restores for rest', () => {
    const state = createDormState(IDS, T0);
    const afterCode = applyTaskMorale(state, 'agent-1', 'code');
    expect(afterCode.characters['agent-1']!.morale).toBe(MORALE_START - 6);
    const afterRest = applyTaskMorale(afterCode, 'agent-1', 'rest');
    expect(afterRest.characters['agent-1']!.morale).toBe(MORALE_START - 6 + 15);
  });

  it('clamps morale to [0, MORALE_MAX] and ignores unknown task types', () => {
    const state = createDormState(IDS, T0);
    state.characters['agent-1']!.morale = 3;
    const drained = applyTaskMorale(state, 'agent-1', 'code');
    expect(drained.characters['agent-1']!.morale).toBe(0);
    expect(applyTaskMorale(state, 'agent-1', 'unknown')).toBe(state);
  });
});

describe('applyTrainingXp', () => {
  it('grants XP to every character and reports level-ups', () => {
    const state = createDormState(IDS, T0);
    const result = applyTrainingXp(state, 120);
    expect(result.levelUps).toBe(IDS.length);
    for (const id of IDS) {
      expect(result.state.characters[id]!.level).toBe(2);
      expect(result.state.characters[id]!.xp).toBe(20);
    }
  });
});

describe('bands', () => {
  it('maps morale to bands', () => {
    expect(moraleBand(150)).toBe('sparkling');
    expect(moraleBand(119)).toBe('happy');
    expect(moraleBand(79)).toBe('normal');
    expect(moraleBand(39)).toBe('sad');
    expect(moraleBand(10)).toBe('depressed');
  });

  it('maps affection to bands', () => {
    expect(affectionBand(0)).toBe('stranger');
    expect(affectionBand(50)).toBe('friendly');
    expect(affectionBand(60)).toBe('like');
    expect(affectionBand(80)).toBe('love');
    expect(affectionBand(100)).toBe('promise');
  });
});

describe('foodDepletionSeconds', () => {
  it('computes seconds until the gauge empties', () => {
    expect(foodDepletionSeconds(FOOD_DRAIN_PER_CHAR_PER_MIN * 5, 5)).toBe(60);
    expect(foodDepletionSeconds(0, 5)).toBe(0);
    expect(foodDepletionSeconds(1000, 0)).toBe(0);
  });
});
