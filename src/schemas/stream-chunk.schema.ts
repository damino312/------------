import { z } from 'zod';

export const StreamDeltaToolCallSchema = z.object({
  index: z.number().optional(),
  id: z.string().optional(),
  type: z.literal('function').optional(),
  function: z
    .object({
      name: z.string().optional(),
      arguments: z.string().optional(),
    })
    .optional(),
});

export const StreamChunkSchema = z.object({
  id: z.string().optional(),
  object: z.string().optional(),
  created: z.number().optional(),
  model: z.string().optional(),
  choices: z.array(
    z.object({
      index: z.number().optional(),
      delta: z
        .object({
          role: z.string().optional(),
          content: z.string().nullable().optional(),
          tool_calls: z.array(StreamDeltaToolCallSchema).optional(),
        })
        .optional(),
      finish_reason: z.string().nullable().optional(),
    }),
  ),
});

export type StreamChunk = z.infer<typeof StreamChunkSchema>;
