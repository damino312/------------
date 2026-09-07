import type { EnvConfig } from '../config/env.schema.js';

export function applyOllamaOptions(
  payload: Record<string, unknown>,
  env: EnvConfig,
): Record<string, unknown> {
  if (env.OLLAMA_THINK === false) {
    payload.think = false;
  }

  return payload;
}

type StreamDelta = Record<string, unknown>;

export function sanitizeStreamDelta(
  delta: StreamDelta | undefined,
): StreamDelta | null {
  if (!delta || typeof delta !== 'object') {
    return null;
  }

  const { reasoning, thinking, ...rest } = delta;

  void reasoning;
  void thinking;

  const content = rest.content;
  const hasContent =
    typeof content === 'string' ? content.length > 0 : content != null;
  const toolCalls = rest.tool_calls;
  const hasToolCalls = Array.isArray(toolCalls) && toolCalls.length > 0;
  const hasRole = rest.role != null;

  if (!hasContent && !hasToolCalls && !hasRole) {
    return null;
  }

  return rest;
}

export function sanitizeStreamChunkLine(line: string): string | null {
  if (!line.startsWith('data: ')) {
    return line.endsWith('\n') ? line : `${line}\n`;
  }

  const data = line.slice(6).trim();

  if (data === '[DONE]') {
    return 'data: [DONE]\n\n';
  }

  try {
    const parsed = JSON.parse(data) as {
      choices?: Array<{
        index?: number;
        delta?: StreamDelta;
        finish_reason?: string | null;
      }>;
      [key: string]: unknown;
    };

    if (!parsed.choices?.length) {
      return `data: ${JSON.stringify(parsed)}\n\n`;
    }

    const choice = parsed.choices[0];
    const finishReason = choice.finish_reason;

    if (finishReason && (!choice.delta || Object.keys(choice.delta).length === 0)) {
      return `data: ${JSON.stringify(parsed)}\n\n`;
    }

    const sanitizedDelta = sanitizeStreamDelta(choice.delta);

    if (!sanitizedDelta) {
      return null;
    }

    const sanitized = {
      ...parsed,
      choices: [
        {
          ...choice,
          delta: sanitizedDelta,
        },
      ],
    };

    return `data: ${JSON.stringify(sanitized)}\n\n`;
  } catch {
    return `${line}\n`;
  }
}

export function sanitizeNonStreamResponse(json: unknown): unknown {
  if (!json || typeof json !== 'object') {
    return json;
  }

  const response = json as {
    choices?: Array<{
      message?: Record<string, unknown>;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };

  if (!response.choices?.length) {
    return json;
  }

  const choices = response.choices.map((choice) => {
    if (!choice.message) {
      return choice;
    }

    const { reasoning, thinking, ...message } = choice.message;
    void reasoning;
    void thinking;

    return {
      ...choice,
      message,
    };
  });

  return {
    ...response,
    choices,
  };
}

export async function pipeSanitizedSseStream(
  ollamaResponse: globalThis.Response,
  write: (chunk: string) => void,
): Promise<void> {
  if (!ollamaResponse.body) {
    throw new Error('Empty stream from Ollama');
  }

  const reader = ollamaResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }

        const sanitized = sanitizeStreamChunkLine(line);

        if (sanitized) {
          write(sanitized);
        }
      }
    }

    if (buffer.trim()) {
      const sanitized = sanitizeStreamChunkLine(buffer);

      if (sanitized) {
        write(sanitized);
      }
    }
  } finally {
    reader.releaseLock();
  }
}
