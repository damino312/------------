import {
  Injectable,
  Inject,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ChatCompletionRequest } from '../schemas/chat-completion.schema.js';
import { ChatCompletionResponseSchema } from '../schemas/chat-completion.schema.js';
import { ENV_CONFIG } from '../config/configuration.js';
import type { EnvConfig } from '../config/env.schema.js';
import { ToolsAdapter, type AdaptedRequest } from '../tools/tools.adapter.js';

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);

  constructor(
    @Inject(ENV_CONFIG) private readonly env: EnvConfig,
    private readonly toolsAdapter: ToolsAdapter,
  ) {}

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.env.OLLAMA_BASE_URL}/api/tags`, {
        signal: AbortSignal.timeout(5_000),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  buildOllamaBody(request: AdaptedRequest): Record<string, unknown> {
    const { _toolsInjected, ...body } = request;

    const payload: Record<string, unknown> = {
      ...body,
      model: this.env.OLLAMA_MODEL ?? body.model,
    };

    if (_toolsInjected) {
      delete payload.tools;
      delete payload.tool_choice;
    }

    return payload;
  }

  buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.env.OLLAMA_API_KEY) {
      headers.Authorization = `Bearer ${this.env.OLLAMA_API_KEY}`;
    }

    return headers;
  }

  async createCompletion(
    request: ChatCompletionRequest,
    res?: Response,
  ): Promise<unknown> {
    let adapted = this.toolsAdapter.adaptRequest(request);
    let usePromptStreamTransform =
      this.toolsAdapter.shouldUsePromptMode(request);

    try {
      return await this.forwardToOllama(
        adapted,
        request.stream,
        res,
        usePromptStreamTransform,
      );
    } catch (error) {
      const shouldRetryWithPrompt =
        !adapted._toolsInjected &&
        request.tools &&
        request.tools.length > 0 &&
        this.isToolsUnsupportedError(error);

      if (!shouldRetryWithPrompt) {
        throw error;
      }

      this.logger.warn(
        'Ollama rejected tools, retrying with prompt injection fallback',
      );

      adapted = this.toolsAdapter.injectToolsIntoPrompt(request);
      usePromptStreamTransform = true;

      return this.forwardToOllama(
        adapted,
        request.stream,
        res,
        usePromptStreamTransform,
      );
    }
  }

  private isToolsUnsupportedError(error: unknown): boolean {
    if (!(error instanceof OllamaRequestError)) {
      return false;
    }

    return error.status === 400 || error.status === 422;
  }

  private async forwardToOllama(
    request: AdaptedRequest,
    stream: boolean,
    res: Response | undefined,
    usePromptStreamTransform: boolean,
  ): Promise<unknown> {
    const body = this.buildOllamaBody(request);
    const url = `${this.env.OLLAMA_BASE_URL}/v1/chat/completions`;

    this.logger.debug(
      `Forwarding to Ollama: model=${String(body.model)}, stream=${stream}`,
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.env.HTTP_TIMEOUT),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new OllamaRequestError(response.status, errorText);
    }

    if (stream && res) {
      if (usePromptStreamTransform) {
        await this.streamWithPromptTransform(response, res);
        return;
      }

      await this.pipeStream(response, res);
      return;
    }

    const json = await response.json();

    if (usePromptStreamTransform && res) {
      await this.transformJsonToSse(json, res);
      return;
    }

    return ChatCompletionResponseSchema.parse(json);
  }

  private async pipeStream(
    ollamaResponse: globalThis.Response,
    res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (!ollamaResponse.body) {
      throw new ServiceUnavailableException('Empty stream from Ollama');
    }

    const reader = ollamaResponse.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        res.write(decoder.decode(value, { stream: true }));
      }
    } finally {
      reader.releaseLock();
      res.end();
    }
  }

  private async streamWithPromptTransform(
    ollamaResponse: globalThis.Response,
    res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (!ollamaResponse.body) {
      throw new ServiceUnavailableException('Empty stream from Ollama');
    }

    const reader = ollamaResponse.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        fullContent += this.extractContentFromSse(chunk);
      }
    } finally {
      reader.releaseLock();
    }

    const toolCall = this.toolsAdapter.parseToolCallFromText(fullContent);

    if (toolCall) {
      res.write(this.toolsAdapter.buildToolCallSseChunk(
        toolCall.name,
        toolCall.arguments,
      ));
    } else if (fullContent) {
      res.write(this.toolsAdapter.buildContentSseChunk(fullContent));
    }

    res.write(this.toolsAdapter.buildDoneChunk());
    res.end();
  }

  private extractContentFromSse(chunk: string): string {
    let content = '';

    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ')) {
        continue;
      }

      const data = line.slice(6).trim();

      if (data === '[DONE]') {
        continue;
      }

      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content;

        if (delta) {
          content += delta;
        }
      } catch {
        // ignore malformed SSE lines
      }
    }

    return content;
  }

  private async transformJsonToSse(json: unknown, res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const parsed = ChatCompletionResponseSchema.parse(json);
    const message = parsed.choices[0]?.message;
    const content = message?.content ?? '';

    const toolCall = this.toolsAdapter.parseToolCallFromText(content);

    if (toolCall) {
      res.write(
        this.toolsAdapter.buildToolCallSseChunk(
          toolCall.name,
          toolCall.arguments,
        ),
      );
    } else if (content) {
      res.write(this.toolsAdapter.buildContentSseChunk(content));
    }

    res.write(this.toolsAdapter.buildDoneChunk());
    res.end();
  }
}

export class OllamaRequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`Ollama request failed (${status}): ${body}`);
    this.name = 'OllamaRequestError';
  }
}
