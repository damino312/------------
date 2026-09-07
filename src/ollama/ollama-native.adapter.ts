import type { ChatCompletionRequest } from '../schemas/chat-completion.schema.js';
import type { EnvConfig } from '../config/env.schema.js';
import type { AdaptedRequest } from '../tools/tools.adapter.js';

export type OllamaNativeChatBody = {
  model: string;
  messages: ChatCompletionRequest['messages'];
  stream: boolean;
  think: boolean;
  tools?: ChatCompletionRequest['tools'];
  tool_choice?: ChatCompletionRequest['tool_choice'];
  options?: Record<string, number>;
};

export function buildNativeChatBody(
  request: AdaptedRequest,
  env: EnvConfig,
): OllamaNativeChatBody {
  const { _toolsInjected, tools, tool_choice, max_tokens, temperature, top_p, ...rest } =
    request;

  const body: OllamaNativeChatBody = {
    model: String(env.OLLAMA_MODEL ?? rest.model),
    messages: rest.messages,
    stream: rest.stream ?? true,
    think: env.OLLAMA_THINK,
  };

  if (!_toolsInjected && tools?.length) {
    body.tools = tools;
    if (tool_choice !== undefined) {
      body.tool_choice = tool_choice;
    }
  }

  const options: Record<string, number> = {};

  if (max_tokens !== undefined) {
    options.num_predict = max_tokens;
  }

  if (temperature !== undefined) {
    options.temperature = temperature;
  }

  if (top_p !== undefined) {
    options.top_p = top_p;
  }

  if (Object.keys(options).length > 0) {
    body.options = options;
  }

  return body;
}

type NativeChatChunk = {
  model?: string;
  message?: {
    role?: string;
    content?: string;
    tool_calls?: unknown[];
    thinking?: string;
  };
  done?: boolean;
  done_reason?: string;
};

export function mapDoneReason(reason?: string): string | null {
  if (!reason) {
    return null;
  }

  if (reason === 'stop') {
    return 'stop';
  }

  if (reason === 'length') {
    return 'length';
  }

  return reason;
}

export function nativeChunkToOpenAiSse(
  chunk: NativeChatChunk,
  includeRole: boolean,
): string | null {
  if (chunk.message?.thinking) {
    return null;
  }

  if (chunk.done) {
    const finishReason = mapDoneReason(chunk.done_reason);
    const toolCalls = chunk.message?.tool_calls;

    if (toolCalls?.length) {
      return `data: ${JSON.stringify({
        choices: [
          {
            index: 0,
            delta: { tool_calls: toolCalls },
            finish_reason: finishReason,
          },
        ],
      })}\n\n`;
    }

    return `data: ${JSON.stringify({
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: finishReason,
        },
      ],
    })}\n\n`;
  }

  const delta: Record<string, unknown> = {};

  if (includeRole && chunk.message?.role) {
    delta.role = chunk.message.role;
  }

  if (chunk.message?.content) {
    delta.content = chunk.message.content;
  }

  if (Object.keys(delta).length === 0) {
    return null;
  }

  return `data: ${JSON.stringify({
    choices: [
      {
        index: 0,
        delta,
        finish_reason: null,
      },
    ],
  })}\n\n`;
}

export function nativeResponseToOpenAi(json: NativeChatChunk): Record<string, unknown> {
  const message = json.message ?? {};

  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: json.model,
    choices: [
      {
        index: 0,
        message: {
          role: message.role ?? 'assistant',
          content: message.content ?? '',
          ...(message.tool_calls ? { tool_calls: message.tool_calls } : {}),
        },
        finish_reason: mapDoneReason(json.done_reason),
      },
    ],
  };
}

export async function collectNativeStreamContent(
  response: globalThis.Response,
): Promise<string> {
  if (!response.body) {
    return '';
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';

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

        try {
          const chunk = JSON.parse(line) as NativeChatChunk;

          if (chunk.message?.content) {
            content += chunk.message.content;
          }
        } catch {
          // ignore malformed lines
        }
      }
    }

    if (buffer.trim()) {
      try {
        const chunk = JSON.parse(buffer) as NativeChatChunk;

        if (chunk.message?.content) {
          content += chunk.message.content;
        }
      } catch {
        // ignore
      }
    }
  } finally {
    reader.releaseLock();
  }

  return content;
}

export async function pipeNativeStreamAsOpenAiSse(
  response: globalThis.Response,
  write: (chunk: string) => void,
): Promise<void> {
  if (!response.body) {
    throw new Error('Empty stream from Ollama');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sentRole = false;

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

        const chunk = JSON.parse(line) as NativeChatChunk;
        const includeRole = !sentRole;
        const sse = nativeChunkToOpenAiSse(chunk, includeRole);

        if (sse) {
          if (includeRole && chunk.message?.role) {
            sentRole = true;
          }

          write(sse);
        }
      }
    }

    if (buffer.trim()) {
      const chunk = JSON.parse(buffer) as NativeChatChunk;
      const sse = nativeChunkToOpenAiSse(chunk, !sentRole);

      if (sse) {
        write(sse);
      }
    }
  } finally {
    reader.releaseLock();
  }

  write('data: [DONE]\n\n');
}
