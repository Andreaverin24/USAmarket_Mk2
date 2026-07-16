import type { Prisma } from '@atlas/database';

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: true;
    media: { include: { mediaVariants: true } };
    inventory: true;
    attributes: true;
    location: true;
    organization: { select: { id: true; name: true; slug: true } };
  };
}>;

export function presentProduct(product: ProductWithRelations) {
  return {
    ...product,
    priceMinor: product.priceMinor.toString(),
    width: product.width?.toString() ?? null,
    height: product.height?.toString() ?? null,
    depth: product.depth?.toString() ?? null,
    weight: product.weight?.toString() ?? null,
  };
}
