import { describe, it, expect } from 'vitest';
import { enqueueTask, dequeueTask } from './taskQueue';

describe('enqueueTask', () => {
  it('appends to an empty queue', () => {
    expect(enqueueTask([], 'code')).toEqual(['code']);
  });

  it('appends to a non-empty queue preserving order', () => {
    expect(enqueueTask(['code', 'research'], 'print')).toEqual([
      'code',
      'research',
      'print',
    ]);
  });

  it('does not mutate the input queue', () => {
    const original = ['code', 'research'] as const;
    const result = enqueueTask(original, 'print');
    expect(original).toEqual(['code', 'research']);
    expect(result).not.toBe(original);
  });
});

describe('dequeueTask', () => {
  it('returns null next for an empty queue', () => {
    const { next, rest } = dequeueTask([]);
    expect(next).toBeNull();
    expect(rest).toEqual([]);
  });

  it('pops the head task and returns the tail', () => {
    const { next, rest } = dequeueTask(['code', 'research', 'print']);
    expect(next).toBe('code');
    expect(rest).toEqual(['research', 'print']);
  });

  it('returns the only task and an empty tail for a single-item queue', () => {
    const { next, rest } = dequeueTask(['rest']);
    expect(next).toBe('rest');
    expect(rest).toEqual([]);
  });

  it('does not mutate the input queue', () => {
    const original = ['code', 'research'] as const;
    dequeueTask(original);
    expect(original).toEqual(['code', 'research']);
  });
});
