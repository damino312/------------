import { z } from 'zod';

export const EnvSchema = z.object({
  PORT: z.coerce.number().int().default(3000),
  HOST: z.string().default('0.0.0.0'),
  OLLAMA_BASE_URL: z.url().default('http://127.0.0.1:11434'),
  OLLAMA_MODEL: z.string().optional(),
  OLLAMA_API_KEY: z.string().optional(),
  OLLAMA_THINK: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  TOOLS_MODE: z.enum(['pass-through', 'prompt']).default('pass-through'),
  HTTP_TIMEOUT: z.coerce.number().int().default(120_000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn']).default('info'),
  LOG_REQUEST_BODY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  PROXY_API_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof EnvSchema>;
