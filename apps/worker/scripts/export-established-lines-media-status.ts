import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@atlas/database';

const db = new PrismaClient();

const slugFromUrl = (value?: string | null) => {
  if (!value) return '';
  try {
    return new URL(value).pathname.split('/').filter(Boolean).at(-1) ?? '';
  } catch {
    return '';
  }
};

try {
  const organization = await db.organization.findUniqueOrThrow({
    where: { slug: 'established-lines' },
    select: { id: true },
  });
  const products = await db.product.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      externalListings: {
        orderBy: { lastSeenAt: 'desc' },
        take: 1,
        select: { canonicalUrl: true },
      },
      media: {
        select: {
          processingStatus: true,
          storageKey: true,
          byteSize: true,
          sourceUrl: true,
          mediaVariants: { select: { byteSize: true } },
        },
      },
    },
  });
  const entries = products
    .map((product) => {
      const canonicalUrl = product.externalListings[0]?.canonicalUrl;
      const slug = slugFromUrl(canonicalUrl ?? product.media[0]?.sourceUrl);
      if (!slug) return null;
      return [
        slug,
        {
          productId: product.id,
          total: product.media.length,
          ready: product.media.filter((media) => media.processingStatus === 'READY').length,
          failed: product.media.filter((media) => media.processingStatus === 'FAILED').length,
          stored: product.media.filter((media) => media.storageKey).length,
          variants: product.media.reduce((sum, media) => sum + media.mediaVariants.length, 0),
          originalBytes: product.media.reduce((sum, media) => sum + (media.byteSize ?? 0), 0),
          variantBytes: product.media.reduce(
            (sum, media) =>
              sum +
              media.mediaVariants.reduce((variantSum, variant) => variantSum + variant.byteSize, 0),
            0,
          ),
        },
      ] as const;
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const report = {
    generatedAt: new Date().toISOString(),
    products: Object.fromEntries(entries),
  };
  const outputDirectory = path.resolve('apps/portal/public/pilots');
  const outputPath = path.join(outputDirectory, 'established-lines-media-status.json');
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  const totals = entries.reduce(
    (sum, [, entry]) => ({
      total: sum.total + entry.total,
      ready: sum.ready + entry.ready,
      failed: sum.failed + entry.failed,
      stored: sum.stored + entry.stored,
      variants: sum.variants + entry.variants,
      originalBytes: sum.originalBytes + entry.originalBytes,
      variantBytes: sum.variantBytes + entry.variantBytes,
    }),
    { total: 0, ready: 0, failed: 0, stored: 0, variants: 0, originalBytes: 0, variantBytes: 0 },
  );
  console.log(JSON.stringify({ outputPath, products: entries.length, totals }, null, 2));
} finally {
  await db.$disconnect();
}
