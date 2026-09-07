import { Injectable, Inject, Logger } from '@nestjs/common';
import type { ChatCompletionRequest } from '../schemas/chat-completion.schema.js';
import type { Tool } from '../schemas/tool.schema.js';
import type { Message } from '../schemas/message.schema.js';
import { ENV_CONFIG } from '../config/configuration.js';
import type { EnvConfig } from '../config/env.schema.js';

export type AdaptedRequest = ChatCompletionRequest & {
  _toolsInjected?: boolean;
};

@Injectable()
export class ToolsAdapter {
  private readonly logger = new Logger(ToolsAdapter.name);

  constructor(@Inject(ENV_CONFIG) private readonly env: EnvConfig) {}

  shouldUsePromptMode(request: ChatCompletionRequest): boolean {
    return (
      this.env.TOOLS_MODE === 'prompt' &&
      !!request.tools &&
      request.tools.length > 0
    );
  }

  adaptRequest(request: ChatCompletionRequest): AdaptedRequest {
    if (!this.shouldUsePromptMode(request)) {
      return request;
    }

    return this.injectToolsIntoPrompt(request);
  }

  injectToolsIntoPrompt(request: ChatCompletionRequest): AdaptedRequest {
    const tools = request.tools ?? [];
    const toolsPrompt = this.buildToolsPrompt(tools);
    const messages = this.prependSystemInstruction(
      request.messages,
      toolsPrompt,
    );

    const { tools: _tools, tool_choice: _toolChoice, ...rest } = request;

    this.logger.debug(
      `Injected ${tools.length} tool(s) into system prompt (prompt mode)`,
    );

    return {
      ...rest,
      messages,
      _toolsInjected: true,
    };
  }

  buildToolsPrompt(tools: Tool[]): string {
    const definitions = tools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters,
    }));

    return [
      'You have access to the following functions. When you need to call a function, respond ONLY with a JSON object in this exact format:',
      '{"name":"<function_name>","arguments":{...}}',
      'Available functions:',
      JSON.stringify(definitions, null, 2),
    ].join('\n');
  }

  prependSystemInstruction(
    messages: Message[],
    instruction: string,
  ): Message[] {
    const systemIndex = messages.findIndex((m) => m.role === 'system');

    if (systemIndex >= 0) {
      const updated = [...messages];
      const existing = updated[systemIndex];
      const existingContent =
        typeof existing.content === 'string' ? existing.content : '';

      updated[systemIndex] = {
        ...existing,
        content: `${existingContent}\n\n${instruction}`,
      };

      return updated;
    }

    return [{ role: 'system', content: instruction }, ...messages];
  }

  parseToolCallFromText(text: string): { name: string; arguments: string } | null {
    const trimmed = text.trim();

    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        name?: string;
        arguments?: Record<string, unknown>;
      };

      if (!parsed.name) {
        return null;
      }

      return {
        name: parsed.name,
        arguments: JSON.stringify(parsed.arguments ?? {}),
      };
    } catch {
      return null;
    }
  }

  buildToolCallSseChunk(name: string, args: string): string {
    const payload = {
      choices: [
        {
          index: 0,
          delta: {
            tool_calls: [
              {
                index: 0,
                type: 'function',
                function: { name, arguments: args },
              },
            ],
          },
          finish_reason: null,
        },
      ],
    };

    return `data: ${JSON.stringify(payload)}\n\n`;
  }

  buildContentSseChunk(content: string): string {
    const payload = {
      choices: [
        {
          index: 0,
          delta: { content },
          finish_reason: null,
        },
      ],
    };

    return `data: ${JSON.stringify(payload)}\n\n`;
  }

  buildDoneChunk(): string {
    return 'data: [DONE]\n\n';
  }
}
