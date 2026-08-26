import type { Metadata } from 'next';
import { MarketplaceHome } from '../../../components/marketplace-home';
import { api, type PublicProduct } from '../../../lib/api';
import {
  ESTABLISHED_LINES_SLUG,
  establishedLinesSnapshot,
  isEstablishedLinesStorefront,
  snapshotFacets,
} from '../../../lib/established-lines-snapshot';

export const dynamic = 'force-dynamic';

interface StorefrontHome {
  storefront: {
    slug: string;
    organization: { name: string };
    theme: {
      seoTitle: string | null;
      seoDescription: string | null;
    } | null;
  };
  products: PublicProduct[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sellerSlug: string }>;
}): Promise<Metadata> {
  const { sellerSlug } = await params;
  try {
    const data = await api<StorefrontHome>(`/storefronts/${sellerSlug}`);
    return {
      title:
        data.storefront.theme?.seoTitle ?? `${data.storefront.organization.name} | DecorFlavor`,
      description: data.storefront.theme?.seoDescription ?? undefined,
      alternates: { canonical: `/dealers/${sellerSlug}` },
    };
  } catch {
    if (isEstablishedLinesStorefront(sellerSlug)) {
      return {
        title: 'Established Lines | DecorFlavor',
        description:
          'Vintage furniture, lighting, art and objects from Established Lines inside DecorFlavor.',
        alternates: { canonical: `/dealers/${ESTABLISHED_LINES_SLUG}` },
      };
    }
    return { title: 'Seller storefront | DecorFlavor' };
  }
}

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ sellerSlug: string }>;
}) {
  const { sellerSlug } = await params;
  let products: PublicProduct[] = [];
  let mode: 'live' | 'snapshot' = 'live';

  try {
    const data = await api<StorefrontHome>(`/storefronts/${sellerSlug}`);
    products = data.products;
  } catch {
    if (!isEstablishedLinesStorefront(sellerSlug)) {
      return <main className="df-state">Storefront not found.</main>;
    }
    products = establishedLinesSnapshot();
    mode = 'snapshot';
  }

  const facets = snapshotFacets(products);
  return (
    <MarketplaceHome
      catalogAvailable={products.length > 0}
      catalogMode={mode}
      experience="storefront"
      facets={facets}
      products={products}
      storefrontSlug={sellerSlug}
    />
  );
}
