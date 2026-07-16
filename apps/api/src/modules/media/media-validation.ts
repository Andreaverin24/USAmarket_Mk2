import { MAX_IMAGE_BYTES, sniffImageMime } from '@atlas/catalog';

const mimeByExtension: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

export interface MediaUploadInput {
  filename: string;
  mimeType: string;
  size: number;
  checksum: string;
}

export function validateMediaUpload(input: MediaUploadInput) {
  const extension = input.filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (!extension || !mimeByExtension[extension]) throw new Error('Unsupported media extension');
  if (mimeByExtension[extension] !== input.mimeType)
    throw new Error('Filename extension does not match MIME type');
  if (input.size < 1 || input.size > MAX_IMAGE_BYTES)
    throw new Error('Media size is outside limits');
  if (!/^[a-f0-9]{64}$/i.test(input.checksum)) throw new Error('Invalid SHA-256 checksum');
  return {
    extension: extension === 'jpeg' ? 'jpg' : extension,
    mimeType: mimeByExtension[extension],
  };
}

export { sniffImageMime };
