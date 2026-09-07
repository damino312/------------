import { EnvSchema, type EnvConfig } from './env.schema.js';

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = EnvSchema.safeParse(config);

  if (!result.success) {
    const formatted = result.error.flatten();
    throw new Error(
      `Invalid environment configuration: ${JSON.stringify(formatted, null, 2)}`,
    );
  }

  return result.data;
}

export const ENV_CONFIG = 'ENV_CONFIG';
