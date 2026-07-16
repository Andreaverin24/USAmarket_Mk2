import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { generateImageVariants } from './outbox-worker.js';

describe('media variants', () => {
  it('creates thumbnail, WebP and AVIF variants without source EXIF', async () => {
    const original = await sharp({
      create: { width: 1200, height: 800, channels: 3, background: '#8f5f3f' },
    })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Artist: 'Atlas acceptance' } } })
      .toBuffer();
    expect((await sharp(original).metadata()).exif).toBeDefined();

    const generated = await generateImageVariants(original);
    expect(generated.variants.map((variant) => `${variant.kind}:${variant.format}`)).toEqual([
      'THUMBNAIL:webp',
      'OPTIMIZED:webp',
      'OPTIMIZED:avif',
    ]);
    for (const variant of generated.variants) {
      const metadata = await sharp(variant.body).metadata();
      expect(metadata.exif).toBeUndefined();
      expect(variant.width).toBeLessThanOrEqual(1600);
      expect(variant.height).toBeLessThanOrEqual(1600);
    }
  });
});
