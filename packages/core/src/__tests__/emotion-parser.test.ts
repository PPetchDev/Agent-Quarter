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

  it('ignores invalid emotion values', () => {
    expect(parseEmotionOverride('[emotion:flying]')).toBeNull();
  });
});

describe('stripEmotionTags', () => {
  it('removes emotion tags from text', () => {
    expect(stripEmotionTags('Hello [emotion:excited] world')).toBe('Hello  world');
  });

  it('returns text unchanged if no tags', () => {
    expect(stripEmotionTags('Hello world')).toBe('Hello world');
  });

  it('removes multiple tags', () => {
    expect(stripEmotionTags('[emotion:happy] A [emotion:sad] B')).toBe(' A  B');
  });
});
