'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

const SearchIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 4.5 4.5" />
  </svg>
);

const MenuIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export function PublicMarketplaceHeader({
  query,
  onQueryChange,
  onSearchSubmit,
}: {
  query?: string;
  onQueryChange?: (value: string) => void;
  onSearchSubmit?: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const router = useRouter();
  const [internalQuery, setInternalQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const searchValue = query ?? internalQuery;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const updateQuery = (value: string) => {
    if (onQueryChange) onQueryChange(value);
    else setInternalQuery(value);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    if (onSearchSubmit) {
      onSearchSubmit(event);
      return;
    }
    event.preventDefault();
    const term = searchValue.trim();
    router.push(term ? `/catalog?q=${encodeURIComponent(term)}` : '/catalog');
  };

  return (
    <div className="public-marketplace-chrome">
      <header className="search-first-header">
        <button
          aria-controls="decorflavor-navigation-menu"
          aria-expanded={menuOpen}
          aria-label="Open menu"
          className="search-first-mobile-menu"
          onClick={() => setMenuOpen(true)}
          type="button"
        >
          <MenuIcon />
        </button>
        <Link aria-label="DecorFlavor home" className="search-first-logo" href="/">
          <Image
            alt="DecorFlavor"
            className="search-first-logo-image"
            height={724}
            priority
            src="/brand/decorflavor-logo-horizontal.svg"
            width={2172}
          />
        </Link>
        <form className="search-first-search" onSubmit={submitSearch} role="search">
          <SearchIcon />
          <input
            aria-label="Search DecorFlavor"
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Search furniture, makers, styles, materials and eras"
            type="search"
            value={searchValue}
          />
        </form>
        <div className="search-first-actions">
          <Link aria-label="Open catalogue" className="search-first-catalog-link" href="/catalog">
            View all
          </Link>
          <button
            aria-controls="decorflavor-navigation-menu"
            aria-expanded={menuOpen}
            aria-label="Open menu"
            className="search-first-desktop-menu"
            onClick={() => setMenuOpen(true)}
            type="button"
          >
            <MenuIcon />
          </button>
        </div>
      </header>

      <div
        aria-hidden={!menuOpen}
        className={`search-first-menu-drawer ${menuOpen ? 'open' : ''}`}
        id="decorflavor-navigation-menu"
        onClick={(event) => {
          if (event.target === event.currentTarget) setMenuOpen(false);
        }}
      >
        <nav aria-label="DecorFlavor navigation" className="search-first-menu-panel">
          <div className="search-first-menu-heading">
            <span>DecorFlavor</span>
            <button aria-label="Close menu" onClick={() => setMenuOpen(false)} type="button">
              ×
            </button>
          </div>
          <div className="search-first-menu-links">
            <Link href="/" onClick={() => setMenuOpen(false)}>
              Discover
            </Link>
            <Link href="/catalog" onClick={() => setMenuOpen(false)}>
              All pieces
            </Link>
            <Link href="/dealers/established-lines" onClick={() => setMenuOpen(false)}>
              Established Lines
            </Link>
            <Link href="/account/orders" onClick={() => setMenuOpen(false)}>
              My orders
            </Link>
            <Link href="/account/support" onClick={() => setMenuOpen(false)}>
              Support
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
