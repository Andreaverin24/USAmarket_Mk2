import type { Metadata } from 'next';
import Link from 'next/link';
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
      title: `${policy.title} — ${policy.storefront.organization.name}`,
      alternates: { canonical: `/dealers/${sellerSlug}/policies/${policySlug}` },
    };
  } catch {
    return { title: 'Store policy' };
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
      <main className="policy-page">
        <Link href={`/dealers/${sellerSlug}`}>← {policy.storefront.organization.name}</Link>
        <p className="eyebrow">Store policy</p>
        <h1>{policy.title}</h1>
        <p>{policy.body}</p>
      </main>
    );
  } catch {
    return <main className="state">Policy not found.</main>;
  }
}
