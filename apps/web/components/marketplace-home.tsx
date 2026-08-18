'use client';

import Image from 'next/image';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { DiscoveryProduct } from '../lib/api';

type HomeFacets = {
  colors: string[];
  eras: string[];
};

type Sort = 'newest' | 'price_asc' | 'price_desc' | 'featured';

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

const FilterIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M7 14v6" />
  </svg>
);

function currency(product: DiscoveryProduct) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: product.currency,
    maximumFractionDigits: 0,
  }).format(Number(product.priceMinor) / 100);
}

function productImage(product: DiscoveryProduct) {
  return product.media.find((media) => media.sourceUrl)?.sourceUrl ?? null;
}

export function MarketplaceHome({
  products,
  facets,
  catalogAvailable,
  catalogMode,
}: {
  products: DiscoveryProduct[];
  facets: HomeFacets;
  catalogAvailable: boolean;
  catalogMode: 'live' | 'snapshot';
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [color, setColor] = useState('');
  const [era, setEra] = useState('');
  const [condition, setCondition] = useState('');
  const [sort, setSort] = useState<Sort>('newest');

  const categories = useMemo(
    () =>
      Array.from(
        new Map(
          products.map((product) => [product.category.slug, product.category.name]),
        ).entries(),
      ).slice(0, 8),
    [products],
  );
  const colors = useMemo(
    () =>
      Array.from(
        new Set([...facets.colors, ...products.flatMap((product) => product.colors)]),
      ).slice(0, 6),
    [facets.colors, products],
  );
  const eras = useMemo(
    () =>
      Array.from(
        new Set([
          ...facets.eras,
          ...products.flatMap((product) => (product.era ? [product.era] : [])),
        ]),
      ).slice(0, 6),
    [facets.eras, products],
  );

  const visibleProducts = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase();
    const minimum = minPrice ? Number(minPrice) * 100 : undefined;
    const maximum = maxPrice ? Number(maxPrice) * 100 : undefined;
    const filtered = products.filter((product) => {
      const haystack = [
        product.title,
        product.maker,
        product.organization.name,
        product.category.name,
        ...product.materials,
        ...product.colors,
        ...product.styles,
        product.era,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const price = Number(product.priceMinor);
      return (
        (!lowerQuery || haystack.includes(lowerQuery)) &&
        (!category || product.category.slug === category) &&
        (!color || product.colors.includes(color)) &&
        (!era || product.era === era) &&
        (!condition || product.condition === condition) &&
        (minimum === undefined || price >= minimum) &&
        (maximum === undefined || price <= maximum)
      );
    });
    return [...filtered].sort((a, b) => {
      if (sort === 'price_asc') return Number(a.priceMinor) - Number(b.priceMinor);
      if (sort === 'price_desc') return Number(b.priceMinor) - Number(a.priceMinor);
      if (sort === 'featured')
        return (
          Number(b.inventory?.quantityAvailable ?? 0) - Number(a.inventory?.quantityAvailable ?? 0)
        );
      return 0;
    });
  }, [category, color, condition, era, maxPrice, minPrice, products, query, sort]);

  const clearFilters = () => {
    setQuery('');
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setColor('');
    setEra('');
    setCondition('');
    setSort('newest');
  };

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setFiltersOpen(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const openCatalog = () => {
    if (catalogMode === 'snapshot') return;
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category) params.set('category', category);
    if (color) params.set('color', color);
    if (era) params.set('era', era);
    if (condition) params.set('condition', condition);
    if (minPrice && Number(minPrice) >= 0)
      params.set('minPrice', String(Math.round(Number(minPrice) * 100)));
    if (maxPrice && Number(maxPrice) >= 0)
      params.set('maxPrice', String(Math.round(Number(maxPrice) * 100)));
    if (sort !== 'newest') params.set('sort', sort);
    router.push(`/catalog${params.size ? `?${params.toString()}` : ''}`);
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (catalogMode === 'snapshot') return;
    openCatalog();
  };

  const renderFilterContents = () => (
    <div className="search-first-filter-content">
      <div className="search-first-filter-section category-filter">
        <h3>Category</h3>
        {categories.map(([slug, name]) => (
          <label key={slug}>
            <input
              checked={category === slug}
              name="home-category"
              onChange={() => setCategory(category === slug ? '' : slug)}
              type="checkbox"
            />
            <span>{name}</span>
          </label>
        ))}
      </div>

      <div className="search-first-filter-section price-filter">
        <h3>Price, USD</h3>
        <div>
          <label>
            <span>$</span>
            <input
              aria-label="Minimum price"
              inputMode="numeric"
              onChange={(event) => setMinPrice(event.target.value)}
              placeholder="Min"
              type="number"
              value={minPrice}
            />
          </label>
          <i>–</i>
          <label>
            <span>$</span>
            <input
              aria-label="Maximum price"
              inputMode="numeric"
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder="Max"
              type="number"
              value={maxPrice}
            />
          </label>
        </div>
      </div>

      <div className="search-first-filter-section desktop-colors">
        <h3>Colour</h3>
        <div className="search-first-colour-options">
          {colors.map((value) => (
            <button
              aria-pressed={color === value}
              className={color === value ? 'is-active' : ''}
              key={value}
              onClick={() => setColor(color === value ? '' : value)}
              type="button"
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="search-first-filter-section condition-filter">
        <h3>Condition</h3>
        <select onChange={(event) => setCondition(event.target.value)} value={condition}>
          <option value="">Any condition</option>
          <option value="NEW">New</option>
          <option value="EXCELLENT">Excellent</option>
          <option value="GOOD">Good</option>
          <option value="RESTORED">Restored</option>
          <option value="AS_IS">As is</option>
        </select>
      </div>

      <div className="search-first-filter-section era-filter">
        <h3>Time era</h3>
        <div className="search-first-era-pills">
          {eras.map((value) => (
            <button
              aria-pressed={era === value}
              className={era === value ? 'is-active' : ''}
              key={value}
              onClick={() => setEra(era === value ? '' : value)}
              type="button"
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="search-first-filter-section mobile-sort">
        <h3>Sort by</h3>
        <select onChange={(event) => setSort(event.target.value as Sort)} value={sort}>
          <option value="newest">New arrivals</option>
          <option value="featured">Available first</option>
          <option value="price_desc">Price: high to low</option>
          <option value="price_asc">Price: low to high</option>
        </select>
      </div>
    </div>
  );

  return (
    <main className="search-first-home">
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
        <Link className="search-first-logo" href="/">
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
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search furniture, makers, styles, materials and eras"
            type="search"
            value={query}
          />
        </form>
        <div className="search-first-actions">
          {catalogMode === 'snapshot' ? (
            <button
              aria-label="Show all prepared catalogue pieces"
              className="search-first-catalog-link"
              onClick={clearFilters}
              type="button"
            >
              View all
            </button>
          ) : (
            <Link aria-label="Open catalogue" className="search-first-catalog-link" href="/catalog">
              View all
            </Link>
          )}
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

      <div className="search-first-mobile-search">
        <form className="search-first-search" onSubmit={submitSearch} role="search">
          <SearchIcon />
          <input
            aria-label="Search DecorFlavor"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search makers, eras or categories"
            type="search"
            value={query}
          />
        </form>
      </div>

      <div className="search-first-layout">
        <aside className="search-first-sidebar">
          <div className="search-first-filter-heading">
            <div>
              <h2>Filters</h2>
              <p>Refine the discovery feed</p>
            </div>
            <button onClick={clearFilters} type="button">
              Clear all
            </button>
          </div>
          {renderFilterContents()}
        </aside>

        <section aria-live="polite" className="search-first-results">
          <div className="search-first-results-bar">
            <label>
              Sort by:
              <select onChange={(event) => setSort(event.target.value as Sort)} value={sort}>
                <option value="newest">Random discovery</option>
                <option value="featured">Available first</option>
                <option value="price_desc">Price: high to low</option>
                <option value="price_asc">Price: low to high</option>
              </select>
            </label>
          </div>

          <div className="search-first-mobile-results">
            <button onClick={() => setFiltersOpen(true)} type="button">
              <FilterIcon />
              Filter & sort
            </button>
          </div>

          {!catalogAvailable ? (
            <div className="search-first-state">
              <h1>The live catalogue is unavailable.</h1>
              <p>Start the DecorFlavor API and database, then refresh this page.</p>
              <Link href="/catalog">Try the catalogue</Link>
            </div>
          ) : visibleProducts.length ? (
            <div className="search-first-grid">
              {visibleProducts.map((product) => {
                const image = productImage(product);
                const content = (
                  <>
                    {image ? (
                      <img
                        alt={
                          product.media.find((media) => media.sourceUrl)?.altText ?? product.title
                        }
                        src={image}
                      />
                    ) : (
                      <span className="search-first-card-placeholder">{product.category.name}</span>
                    )}
                    <span className="search-first-card-shade" />
                    <em>{product.organization.name}</em>
                    <div>
                      <p>{product.maker ?? product.category.name}</p>
                      <h2>{product.title}</h2>
                      <strong>{currency(product)}</strong>
                    </div>
                  </>
                );
                return (
                  <Link
                    aria-label={`${product.title}, ${currency(product)}`}
                    className="search-first-card"
                    href={
                      catalogMode === 'snapshot'
                        ? `/dealers/established-lines/products/${product.slug}`
                        : `/products/${product.slug}`
                    }
                    key={product.id}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="search-first-state">
              <h1>No pieces match these filters.</h1>
              <button onClick={clearFilters} type="button">
                Clear filters
              </button>
              <button className="search-first-text-button" onClick={openCatalog} type="button">
                Search the full catalogue
              </button>
            </div>
          )}
        </section>
      </div>

      <div
        aria-hidden={!filtersOpen}
        className={`search-first-drawer ${filtersOpen ? 'open' : ''}`}
      >
        <div className="search-first-drawer-heading">
          <h2>Filters</h2>
          <button aria-label="Close filters" onClick={() => setFiltersOpen(false)} type="button">
            ×
          </button>
        </div>
        {renderFilterContents()}
        <div className="search-first-drawer-actions">
          <button onClick={clearFilters} type="button">
            Clear
          </button>
          <button
            onClick={() => {
              setFiltersOpen(false);
              if (catalogMode === 'live') openCatalog();
            }}
            type="button"
          >
            View full results
          </button>
        </div>
      </div>

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
            {catalogMode === 'snapshot' ? (
              <button
                onClick={() => {
                  clearFilters();
                  setMenuOpen(false);
                }}
                type="button"
              >
                All pieces
              </button>
            ) : (
              <Link href="/catalog" onClick={() => setMenuOpen(false)}>
                All pieces
              </Link>
            )}
            <Link href="/account/orders" onClick={() => setMenuOpen(false)}>
              My orders
            </Link>
            <Link href="/account/support" onClick={() => setMenuOpen(false)}>
              Support
            </Link>
          </div>
        </nav>
      </div>
    </main>
  );
}
