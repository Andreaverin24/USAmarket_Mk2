import Link from 'next/link';
export default function Page() {
  return (
    <main className="portal-home">
      <p className="eyebrow">Project Atlas</p>
      <h1>Catalog operations, without the clutter.</h1>
      <p>
        Import, review and publish one source of product data across marketplace and seller
        storefronts.
      </p>
      <Link className="button" href="/login">
        Open seller portal
      </Link>
    </main>
  );
}
