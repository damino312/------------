import { describe, expect, it } from 'vitest';
import { countPrimesUpTo } from './prime.util.js';

describe('countPrimesUpTo', () => {
  it('counts primes up to 10', () => {
    expect(countPrimesUpTo(10)).toBe(4);
  });

  it('returns 0 for invalid input', () => {
    expect(countPrimesUpTo(1)).toBe(0);
    expect(countPrimesUpTo(1.5)).toBe(0);
  });
});
