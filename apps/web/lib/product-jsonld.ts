import type { PublicProduct } from './api';

const conditionUrls: Record<string, string> = {
  NEW: 'https://schema.org/NewCondition',
  EXCELLENT: 'https://schema.org/UsedCondition',
  GOOD: 'https://schema.org/UsedCondition',
  FAIR: 'https://schema.org/UsedCondition',
  RESTORED: 'https://schema.org/RefurbishedCondition',
  AS_IS: 'https://schema.org/DamagedCondition',
};

export function productJsonLd(product: PublicProduct, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': url,
    name: product.title,
    description: product.shortDescription ?? product.description ?? undefined,
    sku: product.id,
    brand: product.maker ? { '@type': 'Brand', name: product.maker } : undefined,
    image: product.media.map((media) => media.sourceUrl).filter(Boolean),
    itemCondition: conditionUrls[product.condition],
    material: product.materials,
    seller: { '@type': 'Organization', name: product.organization.name },
    offers: {
      '@type': 'Offer',
      url,
      price: (Number(product.priceMinor) / 100).toFixed(2),
      priceCurrency: product.currency,
      availability:
        product.inventory?.status === 'AVAILABLE' && product.inventory.quantityAvailable > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
  };
}
