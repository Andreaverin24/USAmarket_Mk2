import { describe, expect, it } from 'vitest';
import { sniffImageMime, validateMediaUpload } from './media-validation.js';

const checksum = 'a'.repeat(64);

describe('media validation', () => {
  it('accepts a matching bounded upload', () => {
    expect(
      validateMediaUpload({ filename: 'chair.JPEG', mimeType: 'image/jpeg', size: 42, checksum }),
    ).toEqual({
      extension: 'jpg',
      mimeType: 'image/jpeg',
    });
  });

  it('rejects MIME confusion and oversized input', () => {
    expect(() =>
      validateMediaUpload({ filename: 'chair.png', mimeType: 'image/jpeg', size: 42, checksum }),
    ).toThrow('does not match');
    expect(() =>
      validateMediaUpload({
        filename: 'chair.jpg',
        mimeType: 'image/jpeg',
        size: 20_000_001,
        checksum,
      }),
    ).toThrow('outside limits');
  });

  it('sniffs supported magic bytes and rejects text', () => {
    expect(sniffImageMime(Uint8Array.from([0xff, 0xd8, 0xff, 0xdb]))).toBe('image/jpeg');
    expect(() => sniffImageMime(new TextEncoder().encode('<script>'))).toThrow('spoofed');
  });
});
