/** Safe, API-wide headers. Browser application CSP is intentionally separate: Next.js needs
 * request-bound nonces before a strict script policy can be introduced without breaking it. */
export function apiSecurityHeaders(isProduction: boolean): Record<string, string> {
  return {
    'content-security-policy':
      "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    'cross-origin-opener-policy': 'same-origin',
    'permissions-policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'x-permitted-cross-domain-policies': 'none',
    ...(isProduction ? { 'strict-transport-security': 'max-age=63072000; includeSubDomains' } : {}),
  };
}
