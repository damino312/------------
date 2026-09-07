import type { ChatCompletionRequest } from '../schemas/chat-completion.schema.js';

/** Минимальный запрос — обычный диалог без tools */
export const chatCompletionSimpleExample: ChatCompletionRequest = {
  model: 'llama3.1:8b',
  messages: [
    {
      role: 'system',
      content:
        'You are Lydia, housecarl of Whiterun. Stay in character and respond briefly.',
    },
    {
      role: 'user',
      content: 'Hello Lydia, how are you today?',
    },
  ],
  stream: true,
  max_tokens: 48,
  temperature: 1,
  top_p: 1,
};

/** Запрос как от CHIM — с tool calling для игровых действий */
export const chatCompletionWithToolsExample: ChatCompletionRequest = {
  model: 'llama3.1:8b',
  messages: [
    {
      role: 'system',
      content:
        'You are Lydia, housecarl of Whiterun. Use available functions when the player asks you to follow, stop, or open inventory.',
    },
    {
      role: 'user',
      content: 'Lydia, follow me.',
    },
  ],
  stream: true,
  max_tokens: 48,
  temperature: 1,
  top_p: 1,
  tools: [
    {
      type: 'function',
      function: {
        name: 'StopAll',
        description: 'Stop all current actions and stay in place',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'Follow',
        description: 'Follow the player',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'OpenInventory',
        description: 'Open trade/inventory with the player',
        parameters: { type: 'object', properties: {} },
      },
    },
  ],
  tool_choice: 'auto',
};

/** Non-stream — удобно тестировать ответ целиком в Swagger UI */
export const chatCompletionNonStreamExample: ChatCompletionRequest = {
  ...chatCompletionSimpleExample,
  stream: false,
};

export const chatCompletionOpenApiSchema = {
  type: 'object',
  required: ['model', 'messages'],
  properties: {
    model: {
      type: 'string',
      example: 'llama3.1:8b',
      description: 'Ollama model name',
    },
    messages: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['role'],
        properties: {
          role: {
            type: 'string',
            enum: ['system', 'user', 'assistant', 'tool', 'function'],
          },
          content: {
            oneOf: [{ type: 'string' }, { type: 'null' }],
          },
          name: { type: 'string' },
          tool_call_id: { type: 'string' },
        },
      },
    },
    stream: {
      type: 'boolean',
      default: true,
      description: 'SSE streaming (CHIM always uses true in production)',
    },
    max_tokens: { type: 'integer', example: 48 },
    temperature: { type: 'number', minimum: 0, maximum: 2, example: 1 },
    top_p: { type: 'number', minimum: 0, maximum: 1, example: 1 },
    presence_penalty: { type: 'number', minimum: -2, maximum: 2 },
    frequency_penalty: { type: 'number', minimum: -2, maximum: 2 },
    tools: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['function'] },
          function: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              parameters: { type: 'object' },
            },
          },
        },
      },
    },
    tool_choice: {
      oneOf: [
        { type: 'string', enum: ['none', 'auto', 'required'] },
        {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['function'] },
            function: {
              type: 'object',
              properties: { name: { type: 'string' } },
            },
          },
        },
      ],
    },
  },
} ;

export const chatCompletionRequestExamples = {
  simpleStream: {
    summary: 'Simple dialogue (stream)',
    description: 'Basic roleplay request without tools — default CHIM dialogue',
    value: chatCompletionSimpleExample,
  },
  withTools: {
    summary: 'CHIM with tools',
    description:
      'Request with game action tools (Follow, StopAll, OpenInventory)',
    value: chatCompletionWithToolsExample,
  },
  nonStream: {
    summary: 'Non-stream (debug)',
    description:
      'Easier to inspect full JSON response in Swagger UI — not used by CHIM in production',
    value: chatCompletionNonStreamExample,
  },
};
