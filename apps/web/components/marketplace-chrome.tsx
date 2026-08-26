import Link from 'next/link';
import { PublicMarketplaceHeader } from './public-marketplace-header';

export function MarketplaceHeader(props: { active?: 'catalog' | 'storefront' }) {
  void props.active;
  return <PublicMarketplaceHeader />;
}

export function MarketplaceFooter() {
  return (
    <footer className="df-site-footer">
      <div>
        <Link className="df-footer-brand" href="/">
          DecorFlavor
        </Link>
        <p>Curated furniture and decor with character, history and presence.</p>
      </div>
      <nav aria-label="Footer navigation">
        <Link href="/catalog">Explore collection</Link>
        <Link href="/catalog?sort=newest">New arrivals</Link>
        <Link href="/dealers/established-lines">Established Lines</Link>
      </nav>
    </footer>
  );
}
