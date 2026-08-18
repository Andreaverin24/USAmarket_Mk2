import establishedLinesFixture from '../../portal/public/pilots/established-lines-30.json';
import type { DiscoveryProduct } from './api';

export const ESTABLISHED_LINES_SLUG = 'established-lines';

type FixtureCandidate = {
  title: string;
  slug: string;
  description?: string;
  priceMinor: string;
  currency: string;
  condition: string;
  materials?: string[];
  colors?: string[];
  styles?: string[];
  era?: string;
  width?: string;
  height?: string;
  depth?: string;
  imageUrls?: string[];
  listing: {
    availability: string;
    canonicalUrl: string;
  };
};

type FixtureRow = {
  id: string;
  status: string;
  normalizedPayload: FixtureCandidate;
};

const categories = {
  art: { name: 'Art', slug: 'art' },
  decor: { name: 'Decor', slug: 'decor' },
  furniture: { name: 'Furniture', slug: 'furniture' },
  lighting: { name: 'Lighting', slug: 'lighting' },
  seating: { name: 'Seating', slug: 'seating' },
  storage: { name: 'Storage', slug: 'storage' },
  tables: { name: 'Tables & desks', slug: 'tables-desks' },
} as const;

function categoryFor(title: string) {
  const value = title.toLowerCase();
  if (/lamp|chandelier|light fixture|lighting/.test(value)) return categories.lighting;
  if (/painting|sculpture|artwork/.test(value)) return categories.art;
  if (/sofa|settee|bench|armchair|chair|recamier/.test(value)) return categories.seating;
  if (/cabinet|dresser|chest|bookcase|shelf|etagere|vitrine|curio|wall unit/.test(value)) {
    return categories.storage;
  }
  if (/table|desk|console|stand/.test(value)) return categories.tables;
  if (/vase|ash tray|screen|room divider|urn|mirror|clock/.test(value)) return categories.decor;
  return categories.furniture;
}

const colourRules: Array<[string, RegExp]> = [
  ['White', /\bwhite\b/],
  ['Blue', /\bblue\b/],
  ['Olive', /\bolive\b/],
  ['Honey', /\bhoney\b/],
  ['Blond', /\bblond\b/],
  ['Gold', /\bgilt\b|\bgold\b/],
  ['Brown', /\bwalnut\b|\bmahogany\b|\bteak\b|\bburl\b|\bwood\b/],
];

function coloursFor(title: string, provided: string[] | undefined) {
  const known = values(provided);
  const titleColours = colourRules
    .filter(([, expression]) => expression.test(title.toLowerCase()))
    .map(([colour]) => colour);
  return Array.from(new Set([...known, ...titleColours]));
}

function values(items: string[] | undefined) {
  return items?.filter((value) => Boolean(value.trim())) ?? [];
}

function isEstablishedLinesUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'www.establishedlines.com';
  } catch {
    return false;
  }
}

const rows = (establishedLinesFixture.rows as FixtureRow[]).filter(
  (row) => row.status === 'VALID',
);

/**
 * Read-only discovery fallback. It intentionally has no local product route
 * or reservation action: those require the API and its published inventory.
 */
export function establishedLinesSnapshot(): DiscoveryProduct[] {
  return rows.flatMap((row) => {
    const item = row.normalizedPayload;
    if (!isEstablishedLinesUrl(item.listing.canonicalUrl)) return [];

    const imageUrls = (item.imageUrls ?? []).filter(isEstablishedLinesUrl);
    return [
      {
        id: `established-lines-snapshot-${row.id}`,
        title: item.title,
        slug: item.slug,
        shortDescription: item.description ?? null,
        description: item.description ?? null,
        priceMinor: item.priceMinor,
        currency: item.currency,
        condition: item.condition,
        materials: values(item.materials),
        colors: coloursFor(item.title, item.colors),
        styles: values(item.styles),
        era: item.era ?? null,
        maker: null,
        provenance: null,
        restorationNotes: null,
        width: item.width ?? null,
        height: item.height ?? null,
        depth: item.depth ?? null,
        category: categoryFor(item.title),
        organization: { name: 'Established Lines', slug: ESTABLISHED_LINES_SLUG },
        inventory: {
          quantityAvailable: item.listing.availability === 'AVAILABLE' ? 1 : 0,
          status: item.listing.availability,
        },
        attributes: [],
        media: imageUrls.map((sourceUrl) => ({
          sourceUrl,
          storageKey: null,
          altText: item.title,
          processingStatus: 'READY',
          mediaVariants: [],
        })),
      },
    ];
  });
}

export function establishedLinesSnapshotProduct(slug: string) {
  return establishedLinesSnapshot().find((product) => product.slug === slug) ?? null;
}

export function isEstablishedLinesStorefront(sellerSlug: string) {
  return sellerSlug === ESTABLISHED_LINES_SLUG;
}

export function snapshotFacets(products: DiscoveryProduct[]) {
  return {
    colors: Array.from(new Set(products.flatMap((product) => product.colors))).sort(),
    eras: Array.from(
      new Set(products.flatMap((product) => (product.era ? [product.era] : []))),
    ).sort(),
  };
}
