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
    expect(tracker.poll(500)).toBeNull();
    const result = tracker.poll(1100);
    expect(result).toBe('idle');
    expect(tracker.currentState).toBe('idle');
  });

  it('extends the idle deadline when observing stream chunks', () => {
    const tracker = new StageTracker({ idleAfterMs: 1000 });
    tracker.observeSubmit(0);
    tracker.observeChunk(800);
    expect(tracker.poll(1200)).toBeNull();
    expect(tracker.poll(1800)).toBe('idle');
  });

  it('returns null when polled while already idle', () => {
    const tracker = new StageTracker();
    expect(tracker.poll()).toBeNull();
  });

  it('forceIdle resets to idle from processing', () => {
    const tracker = new StageTracker();
    tracker.observeSubmit();
    tracker.forceIdle();
    expect(tracker.currentState).toBe('idle');
    expect(tracker.poll()).toBeNull();
  });
});
