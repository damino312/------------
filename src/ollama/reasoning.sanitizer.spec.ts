import { describe, expect, it } from 'vitest';
import {
  sanitizeStreamChunkLine,
  sanitizeStreamDelta,
  applyOllamaOptions,
} from './reasoning.sanitizer.js';

describe('reasoning sanitizer', () => {
  it('removes reasoning-only delta chunks', () => {
    expect(
      sanitizeStreamDelta({
        role: 'assistant',
        content: '',
        reasoning: 'Okay, the user greeted me',
      }),
    ).toEqual({ role: 'assistant', content: '' });

    expect(
      sanitizeStreamDelta({
        content: '',
        reasoning: 'thinking...',
      }),
    ).toBeNull();
  });

  it('keeps content and tool_calls deltas', () => {
    expect(
      sanitizeStreamDelta({
        content: 'Hello!',
        reasoning: 'ignored',
      }),
    ).toEqual({ content: 'Hello!' });
  });

  it('sanitizes SSE lines with reasoning', () => {
    const line =
      'data: {"choices":[{"index":0,"delta":{"content":"","reasoning":"test"},"finish_reason":null}]}';

    expect(sanitizeStreamChunkLine(line)).toBeNull();
  });

  it('forwards finish_reason chunks', () => {
    const line =
      'data: {"choices":[{"index":0,"delta":{},"finish_reason":"length"}]}';
    const result = sanitizeStreamChunkLine(line);

    expect(result).toContain('"finish_reason":"length"');
  });

  it('adds think=false when OLLAMA_THINK is false', () => {
    const payload = applyOllamaOptions(
      { model: 'qwen3:14b', messages: [] },
      {
        OLLAMA_THINK: false,
      } as never,
    );

    expect(payload.think).toBe(false);
  });
});
