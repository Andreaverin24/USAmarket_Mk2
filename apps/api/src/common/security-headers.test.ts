import { describe, expect, it } from 'vitest';
import { apiSecurityHeaders } from './security-headers.js';

describe('API security headers', () => {
  it('sets browser isolation and anti-sniffing headers for every environment', () => {
    const headers = apiSecurityHeaders(false);
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['content-security-policy']).toContain("default-src 'none'");
    expect(headers['strict-transport-security']).toBeUndefined();
  });

  it('adds HSTS only when HTTPS is required in production', () => {
    expect(apiSecurityHeaders(true)['strict-transport-security']).toContain('max-age=63072000');
  });
});
