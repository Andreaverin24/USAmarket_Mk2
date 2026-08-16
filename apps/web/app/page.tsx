'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

const products = [
  ['Italian Travertine Dining Table', 'Mario Bellini', '$8,500'],
  ['Pair of Sculptural Lounge Chairs', 'Pierre Jeanneret', '$12,000'],
  ['Brass & Glass Chandelier', 'Stilnovo', '$4,200'],
  ['Teak Geometric Credenza', 'Gianfranco Frattini', '$9,800'],
  ['Low Slung Leather Lounge Chair', 'Afra & Tobia Scarpa', '$6,400'],
  ['Handblown Murano Table Lamp', 'Carlo Nason', '$3,200'],
  ['Monumental Oak Dining Table', 'Axel Einar Hjorth', '$18,500'],
  ['Postmodern Marble Console', 'Ettore Sottsass', '$7,900'],
  ['Bouclé Club Chair', 'Guillerme et Chambron', '$5,600'],
  ['Architectural Floor Lamp', 'Gino Sarfatti', '$8,900'],
  ['Ceramic Studio Vessel', 'Lucie Rie', '$4,800'],
  ['Rosewood Writing Desk', 'Gio Ponti', '$11,200'],
  ['Modular Seating System', 'Mario Bellini', '$14,600'],
  ['Sculptural Bronze Sconce', 'Charlotte Perriand', '$2,900'],
  ['Brutalist Coffee Table', 'Paul Evans', '$7,400'],
  ['Walnut Cabinet', 'George Nakashima', '$16,800'],
  ['Woven Cane Armchair', 'Finn Juhl', '$8,200'],
  ['Opaline Pendant Light', 'Fontana Arte', '$4,500'],
  ['Travertine Side Table', 'Angelo Mangiarotti', '$6,100'],
  ['Abstract Composition', 'Alberto Burri', 'Price on request'],
].map(([title, maker, price], index) => ({
  title,
  maker,
  price,
  image: `/demoImg/${index + 1}.png`,
  badge: index % 6 === 0 ? 'Verified Dealer' : index % 9 === 0 ? 'Elite Gallery' : null,
}));

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

const BookmarkIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M7 4h10v16l-5-3-5 3z" />
  </svg>
);

const FilterIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M7 14v6" />
  </svg>
);

function FilterContents() {
  return (
    <div className="search-first-filter-content">
      <div className="search-first-filter-section category-filter">
        <h3>Category</h3>
        {['Seating', 'Tables', 'Lighting', 'Storage'].map((item, index) => (
          <label key={item}>
            <input defaultChecked={index === 0} type="checkbox" />
            <span>{item}</span>
          </label>
        ))}
      </div>

      <div className="search-first-filter-section price-filter">
        <h3>Price</h3>
        <div>
          <label>
            <span>$</span>
            <input aria-label="Minimum price" placeholder="Min" type="number" />
          </label>
          <i>–</i>
          <label>
            <span>$</span>
            <input aria-label="Maximum price" placeholder="Max" type="number" />
          </label>
        </div>
      </div>

      <div className="search-first-filter-section desktop-colors">
        <h3>Color</h3>
        <div className="search-first-swatches">
          {['#050505', '#fff', '#fbfae8', '#a35515', '#aab0ba', '#e0b62d'].map((color) => (
            <button
              aria-label={`Color ${color}`}
              key={color}
              style={{ background: color }}
              type="button"
            />
          ))}
        </div>
      </div>

      {['Condition', 'Dimensions'].map((item) => (
        <button className="search-first-collapsed" key={item} type="button">
          <span>{item}</span>
          <b>+</b>
        </button>
      ))}

      <div className="search-first-filter-section era-filter">
        <h3>Time Era</h3>
        <div className="search-first-era-pills">
          {['Mid-Century', 'Postmodern', 'Contemporary', 'Art Deco'].map((era) => (
            <button key={era} type="button">
              {era}
            </button>
          ))}
        </div>
      </div>

      <div className="search-first-filter-section mobile-sort">
        <h3>Sort By</h3>
        <select defaultValue="newest">
          <option value="newest">Newest Arrivals</option>
          <option value="high">Price: High to Low</option>
          <option value="low">Price: Low to High</option>
        </select>
      </div>
    </div>
  );
}

export default function Page() {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <main className="search-first-home">
      <header className="search-first-header">
        <button
          aria-label="Open menu"
          className="search-first-mobile-menu"
          onClick={() => setFiltersOpen(true)}
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
        <form action="/catalog" className="search-first-search">
          <SearchIcon />
          <input
            aria-label="Search the marketplace"
            name="q"
            placeholder="Search furniture, designers, dealers, materials, eras, dimensions, and more"
            type="search"
          />
        </form>
        <div className="search-first-actions">
          <button aria-label="Saved items" type="button">
            <BookmarkIcon />
          </button>
          <button aria-label="Open menu" onClick={() => setFiltersOpen(true)} type="button">
            <MenuIcon />
          </button>
        </div>
      </header>

      <div className="search-first-mobile-search">
        <form action="/catalog" className="search-first-search">
          <SearchIcon />
          <input
            aria-label="Search the marketplace"
            name="q"
            placeholder="Search designers, eras, or categories"
            type="search"
          />
        </form>
      </div>

      <div className="search-first-layout">
        <aside className="search-first-sidebar">
          <div className="search-first-filter-heading">
            <div>
              <h2>Filters</h2>
              <p>Refine your selection</p>
            </div>
            <button type="button">Clear all</button>
          </div>
          <FilterContents />
        </aside>

        <section className="search-first-results">
          <div className="search-first-results-bar">
            <span>Showing {products.length} items</span>
            <label>
              Sort by:
              <select defaultValue="newest">
                <option value="newest">Newly Listed</option>
                <option value="high">Price: High to Low</option>
                <option value="low">Price: Low to High</option>
              </select>
            </label>
          </div>

          <div className="search-first-mobile-results">
            <span>{products.length} Results</span>
            <button onClick={() => setFiltersOpen(true)} type="button">
              <FilterIcon />
              Filter & Sort
            </button>
          </div>

          <div className="search-first-grid">
            {products.map((product) => (
              <Link
                aria-label={`${product.title}, ${product.price}`}
                className="search-first-card"
                href="/catalog"
                key={product.title}
              >
                <img alt={product.title} src={product.image} />
                <span className="search-first-card-shade" />
                {product.badge ? <em>{product.badge}</em> : null}
                <div>
                  <p>{product.maker}</p>
                  <h2>{product.title}</h2>
                  <strong>{product.price}</strong>
                </div>
              </Link>
            ))}
          </div>
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
        <FilterContents />
        <div className="search-first-drawer-actions">
          <button onClick={() => setFiltersOpen(false)} type="button">
            Clear
          </button>
          <button onClick={() => setFiltersOpen(false)} type="button">
            View Results
          </button>
        </div>
      </div>
    </main>
  );
}
