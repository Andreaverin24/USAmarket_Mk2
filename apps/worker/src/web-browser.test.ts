import { describe, expect, it } from 'vitest';
import { assertPublicHostname, isPrivateOrReservedAddress } from './network-safety.js';

describe('web extraction browser safety', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.10.2',
    '100.64.0.1',
    '192.0.2.1',
    '192.88.99.1',
    '198.51.100.1',
    '203.0.113.1',
    '::1',
    'fd00::1',
    'fe80::1',
    '2001:db8::1',
  ])('rejects private or reserved address %s', (address) => {
    expect(isPrivateOrReservedAddress(address)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', '198.52.1.1', '203.1.1.1', '2606:4700:4700::1111'])(
    'accepts public address classification %s',
    (address) => {
      expect(isPrivateOrReservedAddress(address)).toBe(false);
    },
  );

  it.each([
    'localhost',
    'catalog.localhost',
    'host.local',
    'service.internal',
    'router.home.arpa',
    '127.0.0.1',
  ])('rejects a non-public hostname before any remote request: %s', async (hostname) => {
    await expect(assertPublicHostname(hostname)).rejects.toThrow();
  });
});
