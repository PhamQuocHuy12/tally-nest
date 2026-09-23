import { z } from 'zod';

const environmentSchema = z
  .object({
    AWS_REGION: z.string().trim().min(1).default('ap-southeast-1'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    TALLYNEST_ENV: z.enum(['local', 'development']).default('local'),
  })
  .readonly();

export type Environment = z.infer<typeof environmentSchema>;

export class ConfigurationError extends Error {
  public constructor(public readonly issues: readonly string[]) {
    super(`Invalid application configuration: ${issues.join('; ')}`);
    this.name = 'ConfigurationError';
  }
}

export function loadConfig(input: NodeJS.ProcessEnv = process.env): Environment {
  const result = environmentSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const path = issue.path.join('.') || 'environment';
      return `${path}: ${issue.message}`;
    });

    throw new ConfigurationError(issues);
  }

  return result.data;
}
