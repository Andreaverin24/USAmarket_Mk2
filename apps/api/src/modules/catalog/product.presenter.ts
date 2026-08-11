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

type ExternalListingWithSource = Prisma.ExternalListingGetPayload<{
  include: { source: true; _count: { select: { snapshots: true } } };
}>;

type PresentableProduct = ProductWithRelations & {
  externalListings?: ExternalListingWithSource[];
};

export function presentProduct(product: PresentableProduct) {
  return {
    ...product,
    priceMinor: product.priceMinor.toString(),
    width: product.width?.toString() ?? null,
    height: product.height?.toString() ?? null,
    depth: product.depth?.toString() ?? null,
    weight: product.weight?.toString() ?? null,
    diameter: product.diameter?.toString() ?? null,
    seatHeight: product.seatHeight?.toString() ?? null,
    externalListings: (product.externalListings ?? []).map((listing) => ({
      ...listing,
      priceMinor: listing.priceMinor?.toString() ?? null,
      estimateLowMinor: listing.estimateLowMinor?.toString() ?? null,
      estimateHighMinor: listing.estimateHighMinor?.toString() ?? null,
    })),
  };
}
