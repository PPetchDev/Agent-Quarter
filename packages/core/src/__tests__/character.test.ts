import { describe, expect, it } from 'vitest';
import {
  CHARACTER_MOOD_REGISTRY,
  CHARACTER_TEMPLATES,
  DEFAULT_AVATAR_PATH,
  getCharacterTemplate,
  readCharacterMood,
  resolveCharacterMoodImagePath,
} from '../character';

describe('character registry', () => {
  it('has a mood registry entry for every character template', () => {
    for (const template of CHARACTER_TEMPLATES) {
      const entry = CHARACTER_MOOD_REGISTRY[template.characterId];
      expect(entry, template.characterId).toBeDefined();
      expect(entry.available).toContain(entry.defaultMood);
    }
  });

  it('returns a template by character id', () => {
    expect(getCharacterTemplate('mai')?.name).toBe('Mai');
    expect(getCharacterTemplate('missing')).toBeUndefined();
  });
});

describe('readCharacterMood', () => {
  it('maps processing stages to thinking mood', () => {
    expect(readCharacterMood('mai', { stageState: 'processing' })).toBe('thinking');
    expect(readCharacterMood('shinobu', { stageState: 'processing' })).toBe('thinking');
  });

  it('maps idle tiers to character-safe resting/offline moods', () => {
    expect(readCharacterMood('mai', { stageState: 'idle', idleTier: 'ready' })).toBe('idle');
    expect(readCharacterMood('mai', { stageState: 'idle', idleTier: 'resting' })).toBe('sleepy');
    expect(readCharacterMood('mai', { stageState: 'idle', idleTier: 'offline' })).toBe('sleepy');
  });

  it('preserves character-specific idle defaults', () => {
    expect(readCharacterMood('shinobu', { stageState: 'idle', idleTier: 'ready' })).toBe('thinking');
  });

  it('falls back to idle for unknown characters', () => {
    expect(readCharacterMood('missing', { stageState: 'processing' })).toBe('idle');
    expect(readCharacterMood(undefined, { stageState: 'idle', idleTier: 'ready' })).toBe('idle');
  });
});

describe('resolveCharacterMoodImagePath', () => {
  it('resolves registered mood image paths', () => {
    expect(resolveCharacterMoodImagePath('mai', 'excited')).toBe('/characters/mai/08-excited.jpg');
  });

  it('falls back to the default avatar when the character or mood image is missing', () => {
    expect(resolveCharacterMoodImagePath('missing', 'idle')).toBe(DEFAULT_AVATAR_PATH);
    expect(resolveCharacterMoodImagePath('mai', 'love')).toBe(DEFAULT_AVATAR_PATH);
  });
});
