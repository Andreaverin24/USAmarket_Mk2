import Image from 'next/image';
import Link from 'next/link';

export function MarketplaceHeader({ active }: { active?: 'catalog' | 'designers' }) {
  return (
    <header className="df-site-header">
      <Link className="df-brand" href="/" aria-label="DecorFlavor home">
        <Image
          alt="DecorFlavor"
          height={724}
          priority
          src="/brand/decorflavor-logo-horizontal.svg"
          width={2172}
        />
      </Link>
      <nav aria-label="Marketplace navigation" className="df-site-nav">
        <Link className={active === 'catalog' ? 'is-active' : ''} href="/catalog">
          Shop
        </Link>
        <Link href="/catalog?sort=newest">New arrivals</Link>
        <Link
          className={active === 'designers' ? 'is-active' : ''}
          href="/catalog?style=Contemporary"
        >
          For designers
        </Link>
      </nav>
      <Link className="df-header-action" href="/catalog">
        Search collection
      </Link>
    </header>
  );
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
        <Link href="/catalog?style=Contemporary">For designers</Link>
      </nav>
    </footer>
  );
}
