import { describe, expect, it } from 'vitest';
import { resolveOllamaModel } from './resolve-model.js';

describe('resolveOllamaModel', () => {
  it('uses request model when provided', () => {
    expect(resolveOllamaModel('qwen2.5:7b', 'qwen3:14b')).toBe('qwen2.5:7b');
  });

  it('falls back to env model', () => {
    expect(resolveOllamaModel('', 'qwen3:14b')).toBe('qwen3:14b');
  });

  it('throws when no model available', () => {
    expect(() => resolveOllamaModel('', undefined)).toThrow('Model is required');
  });
});
