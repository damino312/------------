import { z } from 'zod';

export const MessageRoleSchema = z.enum([
  'system',
  'user',
  'assistant',
  'tool',
  'function',
]);

export const MessageContentPartSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
});

export const MessageSchema = z.object({
  role: MessageRoleSchema,
  content: z
    .union([z.string(), z.array(MessageContentPartSchema), z.null()])
    .optional(),
  name: z.string().optional(),
  tool_call_id: z.string().optional(),
  tool_calls: z.array(z.unknown()).optional(),
});

export type Message = z.infer<typeof MessageSchema>;
export type MessageRole = z.infer<typeof MessageRoleSchema>;
