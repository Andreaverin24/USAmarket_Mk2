import { describe, expect, it } from 'vitest';
import { parseConfig } from './index.js';

const valid = {
  DATABASE_URL: 'postgresql://atlas:atlas@localhost:5432/atlas',
  REDIS_URL: 'redis://localhost:6379',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_BUCKET: 'atlas-local',
  S3_ACCESS_KEY: 'atlas',
  S3_SECRET_KEY: 'atlas-local-secret',
  APP_ORIGINS: 'http://localhost:3000,http://localhost:3001',
};

describe('parseConfig', () => {
  it('parses and normalizes application origins', () => {
    expect(parseConfig(valid).APP_ORIGINS).toEqual([
      'http://localhost:3000',
      'http://localhost:3001',
    ]);
  });
  it('rejects an incomplete configuration', () => expect(() => parseConfig({})).toThrow());
});
