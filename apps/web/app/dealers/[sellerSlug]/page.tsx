import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketplaceFooter, MarketplaceHeader } from '../../../components/marketplace-chrome';
import { ProductCard } from '../../../components/product-card';
import { api, type PublicProduct } from '../../../lib/api';
export const dynamic = 'force-dynamic';
interface StorefrontHome {
  storefront: {
    slug: string;
    organization: { name: string };
    theme: {
      heroTitle: string | null;
      heroSubtitle: string | null;
      about: string | null;
      seoTitle: string | null;
      seoDescription: string | null;
      contactEmail: string | null;
    } | null;
  };
  products: PublicProduct[];
  collections: Array<{ id: string; title: string; slug: string; products: PublicProduct[] }>;
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
      title: data.storefront.theme?.seoTitle ?? data.storefront.organization.name,
      description: data.storefront.theme?.seoDescription ?? undefined,
      alternates: { canonical: `/dealers/${sellerSlug}` },
    };
  } catch {
    return { title: 'Seller storefront | DecorFlavor' };
  }
}
export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ sellerSlug: string }>;
}) {
  const { sellerSlug } = await params;
  try {
    const data = await api<StorefrontHome>(`/storefronts/${sellerSlug}`);
    const theme = data.storefront.theme;
    return (
      <div className="df-page-shell">
        <MarketplaceHeader active="designers" />
        <main className="df-storefront">
          <header className="df-storefront-hero">
            <p className="df-kicker">
              Dealer presentation <span>·</span> DecorFlavor
            </p>
            <h1>{theme?.heroTitle ?? data.storefront.organization.name}</h1>
            <p>
              {theme?.heroSubtitle ??
                'A considered selection of objects with provenance and presence.'}
            </p>
            <a
              className="df-button"
              href={`mailto:${theme?.contactEmail ?? 'design@decorflavor.com'}`}
            >
              Speak to the gallery
            </a>
          </header>
          <section className="df-storefront-section">
            <div className="df-section-heading">
              <div>
                <p className="df-kicker">Available now</p>
                <h2>New arrivals</h2>
              </div>
              <span>{data.products.length} objects</span>
            </div>
            {data.products.length ? (
              <div className="df-product-grid">
                {data.products.map((product) => (
                  <ProductCard key={product.id} product={product} storefront={sellerSlug} />
                ))}
              </div>
            ) : (
              <p className="df-state">New arrivals are being prepared.</p>
            )}
          </section>
          {data.collections
            .filter((collection) => collection.products.length)
            .map((collection) => (
              <section className="df-storefront-section" key={collection.id}>
                <div className="df-section-heading">
                  <div>
                    <p className="df-kicker">Curated edit</p>
                    <h2>{collection.title}</h2>
                  </div>
                  <Link href="#top">Back to top</Link>
                </div>
                <div className="df-product-grid">
                  {collection.products.map((product) => (
                    <ProductCard key={product.id} product={product} storefront={sellerSlug} />
                  ))}
                </div>
              </section>
            ))}
          <section className="df-storefront-note">
            <p className="df-kicker">A considered service</p>
            <h2>Every detail, disclosed.</h2>
            <p>
              {theme?.about ??
                'Condition, restoration and provenance are presented before you enquire. Delivery and collection are coordinated with the gallery.'}
            </p>
          </section>
          <nav className="df-storefront-policies" aria-label="Storefront policies">
            <Link href={`/dealers/${sellerSlug}/policies/shipping`}>Delivery & pickup</Link>
            <Link href={`/dealers/${sellerSlug}/policies/returns`}>Returns</Link>
            <Link href={`/dealers/${sellerSlug}/policies/privacy`}>Privacy</Link>
          </nav>
        </main>
        <MarketplaceFooter />
      </div>
    );
  } catch {
    return <main className="df-state">Storefront not found.</main>;
  }
}
