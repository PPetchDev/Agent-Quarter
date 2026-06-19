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
