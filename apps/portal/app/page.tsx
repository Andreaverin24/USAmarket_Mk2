import Link from 'next/link';
import { redirect } from 'next/navigation';
export default function Page() {
  if (process.env.NEXT_PUBLIC_INVESTOR_DEMO === 'true') redirect('/catalog-dashboard');

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
      <p>
        <Link href="/dealer-onboarding">Dealer onboarding</Link> ·{' '}
        <Link href="/admin/dealers">Admin operations</Link>
      </p>
    </main>
  );
}
