import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketplaceFooter, MarketplaceHeader } from '../../../../../components/marketplace-chrome';
import { api } from '../../../../../lib/api';
export const dynamic = 'force-dynamic';
interface Policy {
  slug: string;
  title: string;
  body: string;
  storefront: { organization: { name: string } };
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ sellerSlug: string; policySlug: string }>;
}): Promise<Metadata> {
  const { sellerSlug, policySlug } = await params;
  try {
    const policy = await api<Policy>(`/storefronts/${sellerSlug}/policies/${policySlug}`);
    return {
      title: `${policy.title} | ${policy.storefront.organization.name}`,
      alternates: { canonical: `/dealers/${sellerSlug}/policies/${policySlug}` },
    };
  } catch {
    return { title: 'Store policy | DecorFlavor' };
  }
}
export default async function PolicyPage({
  params,
}: {
  params: Promise<{ sellerSlug: string; policySlug: string }>;
}) {
  const { sellerSlug, policySlug } = await params;
  try {
    const policy = await api<Policy>(`/storefronts/${sellerSlug}/policies/${policySlug}`);
    return (
      <div className="df-page-shell">
        <MarketplaceHeader active="designers" />
        <main className="df-policy-page">
          <Link className="df-back-link" href={`/dealers/${sellerSlug}`}>
            ← {policy.storefront.organization.name}
          </Link>
          <p className="df-kicker">Store policy</p>
          <h1>{policy.title}</h1>
          <article>{policy.body}</article>
        </main>
        <MarketplaceFooter />
      </div>
    );
  } catch {
    return <main className="df-state">Policy not found.</main>;
  }
}
