import { describe, it, expect } from 'vitest';
import { resolveDirection } from '../movement/direction';

describe('resolveDirection', () => {
  it('returns right when dx is positive and dominant', () => {
    expect(resolveDirection(10, 3)).toBe('right');
  });

  it('returns left when dx is negative and dominant', () => {
    expect(resolveDirection(-10, 3)).toBe('left');
  });

  it('returns down when dy is positive and dominant', () => {
    expect(resolveDirection(2, 8)).toBe('down');
  });

  it('returns up when dy is negative and dominant', () => {
    expect(resolveDirection(2, -8)).toBe('up');
  });

  it('returns down when dx equals dy (dy tie-breaks to vertical)', () => {
    // Math.abs(dx) NOT > Math.abs(dy) → vertical
    expect(resolveDirection(5, 5)).toBe('down');
  });

  it('handles zero dx', () => {
    expect(resolveDirection(0, 5)).toBe('down');
    expect(resolveDirection(0, -5)).toBe('up');
  });

  it('handles zero dy', () => {
    expect(resolveDirection(5, 0)).toBe('right');
    expect(resolveDirection(-5, 0)).toBe('left');
  });
});
