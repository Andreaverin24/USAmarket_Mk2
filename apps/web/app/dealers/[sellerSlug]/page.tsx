import type { Metadata } from 'next';
import Link from 'next/link';
import { api, type PublicProduct } from '../../../lib/api';
import { ProductCard } from '../../../components/product-card';
import {
  ESTABLISHED_LINES_SLUG,
  establishedLinesSnapshot,
  isEstablishedLinesStorefront,
} from '../../../lib/established-lines-snapshot';
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
      navigation: Array<{ label: string; href: string }> | null;
    } | null;
  };
  products: PublicProduct[];
  collections: Array<{ id: string; title: string; slug: string; products: PublicProduct[] }>;
}

function establishedLinesStorefront(): StorefrontHome {
  return {
    storefront: {
      slug: ESTABLISHED_LINES_SLUG,
      organization: { name: 'Established Lines' },
      theme: {
        heroTitle: 'Established Lines',
        heroSubtitle: 'Vintage furniture, lighting, art and objects — curated within DecorFlavor.',
        about:
          'Established Lines brings together considered vintage and antique pieces with clear condition details and delivery coordination through DecorFlavor.',
        seoTitle: 'Established Lines | DecorFlavor',
        seoDescription: 'The Established Lines collection within DecorFlavor.',
        contactEmail: 'design@establishedlines.local',
        navigation: [
          { label: 'New arrivals', href: '#new-arrivals' },
          { label: 'About', href: '#about' },
        ],
      },
    },
    products: establishedLinesSnapshot(),
    collections: [],
  };
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
    if (isEstablishedLinesStorefront(sellerSlug)) {
      return {
        title: 'Established Lines | DecorFlavor',
        description: 'The Established Lines collection within DecorFlavor.',
        alternates: { canonical: `/dealers/${ESTABLISHED_LINES_SLUG}` },
      };
    }
    return { title: 'Seller storefront' };
  }
}
export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ sellerSlug: string }>;
}) {
  const { sellerSlug } = await params;
  let data: StorefrontHome;
  try {
    data = await api<StorefrontHome>(`/storefronts/${sellerSlug}`);
  } catch {
    if (!isEstablishedLinesStorefront(sellerSlug)) {
      return <main className="state">Storefront not found.</main>;
    }
    data = establishedLinesStorefront();
  }
  const theme = data.storefront.theme;
  return (
    <main className="storefront">
      <nav>
        <strong>{data.storefront.organization.name}</strong>
        {(theme?.navigation ?? []).map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
        <a href={`mailto:${theme?.contactEmail ?? 'design@establishedlines.local'}`}>Design help</a>
      </nav>
      <section className="storefront-hero">
        <p className="eyebrow">Established Lines · New York</p>
        <h1>{theme?.heroTitle ?? data.storefront.organization.name}</h1>
        <p>{theme?.heroSubtitle}</p>
      </section>
      <section id="new-arrivals" className="storefront-section">
        <header>
          <p className="eyebrow">Recently added</p>
          <h2>New Arrivals</h2>
        </header>
        {data.products.length ? (
          <div className="product-grid">
            {data.products.map((product) => (
              <ProductCard key={product.id} product={product} storefront={sellerSlug} />
            ))}
          </div>
        ) : (
          <p className="state">New arrivals are being prepared.</p>
        )}
      </section>
      <section className="collection-index" aria-label="Established Lines collections">
        {['Vintage', 'Antique', 'Contemporary', 'Established Lines Originals'].map((title) => {
          const collection = data.collections.find((item) => item.title === title);
          return (
            <a
              key={title}
              id={title.toLowerCase().replace(/\s+/g, '-')}
              href={collection ? `#collection-${collection.slug}` : '#new-arrivals'}
            >
              <span>Explore</span>
              <strong>{title}</strong>
            </a>
          );
        })}
      </section>
      {data.collections
        .filter((collection) => collection.products.length)
        .map((collection) => (
          <section
            key={collection.id}
            id={`collection-${collection.slug}`}
            className="storefront-section"
          >
            <header>
              <p className="eyebrow">Curated edit</p>
              <h2>{collection.title}</h2>
            </header>
            <div className="product-grid">
              {collection.products.map((product) => (
                <ProductCard key={product.id} product={product} storefront={sellerSlug} />
              ))}
            </div>
          </section>
        ))}
      <section className="trust-blocks">
        <article>
          <p className="eyebrow">Considered condition</p>
          <h2>Every detail, disclosed.</h2>
          <p>Condition, restoration and provenance are presented before purchase.</p>
        </article>
        <article>
          <p className="eyebrow">Delivery coordination</p>
          <h2>Handled with care.</h2>
          <p>Request an estimate and timing for white-glove delivery or arrange gallery pickup.</p>
        </article>
      </section>
      <section id="about" className="story">
        <p className="eyebrow">Our point of view</p>
        <h2>Pieces with presence and a history worth telling.</h2>
        <p>{theme?.about}</p>
      </section>
      <footer className="storefront-footer">
        <Link href={`/dealers/${sellerSlug}/policies/shipping`}>Delivery & Pickup</Link>
        <Link href={`/dealers/${sellerSlug}/policies/returns`}>Returns</Link>
        <Link href={`/dealers/${sellerSlug}/policies/privacy`}>Privacy</Link>
      </footer>
    </main>
  );
}
