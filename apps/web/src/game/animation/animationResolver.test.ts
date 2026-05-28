import { describe, it, expect } from 'vitest';
import { resolveWalkingAnimation, resolveStateAnimation } from '../animation/animationResolver';

describe('resolveWalkingAnimation', () => {
  it('maps up to walk_up', () => expect(resolveWalkingAnimation('up')).toBe('walk_up'));
  it('maps down to walk_down', () => expect(resolveWalkingAnimation('down')).toBe('walk_down'));
  it('maps left to walk_left', () => expect(resolveWalkingAnimation('left')).toBe('walk_left'));
  it('maps right to walk_right', () => expect(resolveWalkingAnimation('right')).toBe('walk_right'));
});

describe('resolveStateAnimation', () => {
  it('coding maps to typing',      () => expect(resolveStateAnimation('coding')).toBe('typing'));
  it('researching maps to reading', () => expect(resolveStateAnimation('researching')).toBe('reading'));
  it('meeting maps to talking',     () => expect(resolveStateAnimation('meeting')).toBe('talking'));
  it('printing maps to printing',   () => expect(resolveStateAnimation('printing')).toBe('printing'));
  it('resting maps to resting',     () => expect(resolveStateAnimation('resting')).toBe('resting'));
  it('idle maps to idle',           () => expect(resolveStateAnimation('idle')).toBe('idle'));
  it('walking maps to walk_down',   () => expect(resolveStateAnimation('walking')).toBe('walk_down'));
  it('done maps to happy',          () => expect(resolveStateAnimation('done')).toBe('happy'));
  it('error maps to confused',      () => expect(resolveStateAnimation('error')).toBe('confused'));
});
