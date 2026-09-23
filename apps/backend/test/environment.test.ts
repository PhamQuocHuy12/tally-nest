import { describe, expect, it } from 'vitest';

import { ConfigurationError, loadConfig } from '../src/config/environment.js';

describe('loadConfig', () => {
  it('provides safe local defaults', () => {
    expect(loadConfig({})).toEqual({
      AWS_REGION: 'ap-southeast-1',
      LOG_LEVEL: 'info',
      TALLYNEST_ENV: 'local',
    });
  });

  it('accepts the development environment', () => {
    expect(
      loadConfig({
        AWS_REGION: 'ap-southeast-1',
        LOG_LEVEL: 'warn',
        TALLYNEST_ENV: 'development',
      }),
    ).toEqual({
      AWS_REGION: 'ap-southeast-1',
      LOG_LEVEL: 'warn',
      TALLYNEST_ENV: 'development',
    });
  });

  it('rejects unsupported environment names without echoing values', () => {
    const invalidValue = 'production-secret-value';

    expect(() => loadConfig({ TALLYNEST_ENV: invalidValue })).toThrow(ConfigurationError);

    try {
      loadConfig({ TALLYNEST_ENV: invalidValue });
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect((error as Error).message).not.toContain(invalidValue);
    }
  });
});
