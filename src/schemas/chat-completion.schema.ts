import { z } from 'zod';
import { MessageSchema } from './message.schema.js';
import { ToolChoiceSchema, ToolSchema } from './tool.schema.js';

export const ChatCompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(MessageSchema).min(1),
  stream: z.boolean().default(true),
  max_tokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  tools: z.array(ToolSchema).optional(),
  tool_choice: ToolChoiceSchema.optional(),
});

export const ChatCompletionChoiceSchema = z.object({
  index: z.number().optional(),
  message: z
    .object({
      role: z.string(),
      content: z.string().nullable().optional(),
      tool_calls: z.array(z.unknown()).optional(),
    })
    .optional(),
  delta: z.record(z.string(), z.unknown()).optional(),
  finish_reason: z.string().nullable().optional(),
});

export const ChatCompletionResponseSchema = z.object({
  id: z.string().optional(),
  object: z.string().optional(),
  created: z.number().optional(),
  model: z.string().optional(),
  choices: z.array(ChatCompletionChoiceSchema),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .optional(),
});

export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;
export type ChatCompletionResponse = z.infer<typeof ChatCompletionResponseSchema>;
