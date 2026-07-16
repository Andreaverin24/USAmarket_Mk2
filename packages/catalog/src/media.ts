export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
export const MAX_IMAGE_BYTES = 20_000_000;
export const MAX_IMAGE_PIXELS = 40_000_000;

export function sniffImageMime(buffer: Uint8Array) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return 'image/jpeg';
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    String.fromCharCode(...buffer.slice(1, 4)) === 'PNG'
  )
    return 'image/png';
  if (
    buffer.length >= 12 &&
    String.fromCharCode(...buffer.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...buffer.slice(8, 12)) === 'WEBP'
  )
    return 'image/webp';
  if (
    buffer.length >= 12 &&
    String.fromCharCode(...buffer.slice(4, 8)) === 'ftyp' &&
    ['avif', 'avis'].includes(String.fromCharCode(...buffer.slice(8, 12)))
  )
    return 'image/avif';
  throw new Error('Unsupported or spoofed image MIME');
}
