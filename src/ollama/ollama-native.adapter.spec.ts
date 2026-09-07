import { describe, expect, it } from 'vitest';
import {
  buildNativeChatBody,
  nativeChunkToOpenAiSse,
  nativeResponseToOpenAi,
} from './ollama-native.adapter.js';

describe('ollama native adapter', () => {
  it('prefers request model over env default', () => {
    const body = buildNativeChatBody(
      {
        model: 'qwen2.5:7b',
        messages: [{ role: 'user', content: 'hi' }],
        stream: true,
      },
      {
        OLLAMA_MODEL: 'qwen3:14b',
        OLLAMA_THINK: false,
      } as never,
    );

    expect(body.model).toBe('qwen2.5:7b');
  });

  it('falls back to env model when request model is empty', () => {
    const body = buildNativeChatBody(
      {
        model: '  ',
        messages: [{ role: 'user', content: 'hi' }],
        stream: true,
      },
      {
        OLLAMA_MODEL: 'qwen3:14b',
        OLLAMA_THINK: false,
      } as never,
    );

    expect(body.model).toBe('qwen3:14b');
  });

  it('builds native chat body with think=false', () => {
    const body = buildNativeChatBody(
      {
        model: 'qwen3:14b',
        messages: [{ role: 'user', content: 'hi' }],
        stream: true,
        max_tokens: 48,
        temperature: 1,
      },
      {
        OLLAMA_THINK: false,
      } as never,
    );

    expect(body.think).toBe(false);
    expect(body.options?.num_predict).toBe(48);
  });

  it('converts native stream chunk to OpenAI SSE', () => {
    const sse = nativeChunkToOpenAiSse(
      {
        message: { role: 'assistant', content: 'Hello' },
        done: false,
      },
      true,
    );

    expect(sse).toContain('"content":"Hello"');
    expect(sse).toContain('"role":"assistant"');
  });

  it('skips thinking chunks', () => {
    const sse = nativeChunkToOpenAiSse(
      {
        message: { role: 'assistant', content: '', thinking: 'internal' },
        done: false,
      },
      false,
    );

    expect(sse).toBeNull();
  });

  it('converts native json response to OpenAI format', () => {
    const openAi = nativeResponseToOpenAi({
      model: 'qwen3:14b',
      message: { role: 'assistant', content: 'Hello!' },
      done: true,
      done_reason: 'stop',
    });

    expect(openAi.choices).toEqual([
      expect.objectContaining({
        message: { role: 'assistant', content: 'Hello!' },
        finish_reason: 'stop',
      }),
    ]);
  });
});
