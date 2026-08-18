import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Rejects destinations that can reach the worker, metadata service, or private network.
 * DNS is checked immediately before use; production still requires egress firewall rules to
 * contain DNS rebinding and browser-process escape risks.
 */
export async function assertPublicHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, '');
  if (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local') ||
    normalized.endsWith('.internal') ||
    normalized.endsWith('.home.arpa')
  )
    throw new Error('Remote host is not public');
  if (isIP(normalized)) throw new Error('Literal IP addresses are forbidden');
  const addresses = await lookup(normalized, { all: true, verbatim: true });
  if (!addresses.length) throw new Error('Remote host did not resolve');
  for (const { address } of addresses)
    if (isPrivateOrReservedAddress(address))
      throw new Error('Remote host resolves to a private or reserved address');
}

export function isPrivateOrReservedAddress(address: string) {
  const normalized = address.toLowerCase().split('%')[0]!;
  if (normalized.startsWith('::ffff:'))
    return isPrivateOrReservedAddress(normalized.slice('::ffff:'.length));
  if (isIP(normalized) === 4) {
    const [a, b, c] = normalized.split('.').map(Number) as [number, number, number, number];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 88 && c === 99) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }
  if (isIP(normalized) === 6)
    return (
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      /^fe[89ab]/.test(normalized) ||
      /^fe[c-f]/.test(normalized) ||
      normalized.startsWith('ff') ||
      normalized.startsWith('2001:db8:')
    );
  return true;
}
