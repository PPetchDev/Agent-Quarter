import { describe, it, expect } from 'vitest';
import { enqueueTask, dequeueTask, MAX_TASK_QUEUE_LENGTH } from './taskQueue';
import type { AgentTaskType } from './agentTypes';

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

  it('accepts exactly MAX_TASK_QUEUE_LENGTH items', () => {
    const full: AgentTaskType[] = Array.from(
      { length: MAX_TASK_QUEUE_LENGTH - 1 },
      () => 'code',
    );
    const filled = enqueueTask(full, 'rest');
    expect(filled.length).toBe(MAX_TASK_QUEUE_LENGTH);
    expect(filled[filled.length - 1]).toBe('rest');
  });

  it('drops the new task when already at the cap', () => {
    const full: AgentTaskType[] = Array.from(
      { length: MAX_TASK_QUEUE_LENGTH },
      () => 'code',
    );
    const result = enqueueTask(full, 'rest');
    expect(result).toEqual(full);
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
