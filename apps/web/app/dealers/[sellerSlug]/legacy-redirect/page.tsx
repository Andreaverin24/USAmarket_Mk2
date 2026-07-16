import { permanentRedirect } from 'next/navigation';
import { api } from '../../../../lib/api';

export const dynamic = 'force-dynamic';

export default async function LegacyRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ sellerSlug: string }>;
  searchParams: Promise<{ path?: string }>;
}) {
  const { sellerSlug } = await params;
  const { path } = await searchParams;
  if (!path?.startsWith('/')) return <main className="state">Legacy URL not found.</main>;
  let result: { targetPath: string };
  try {
    result = await api<{ targetPath: string }>(
      `/storefronts/${sellerSlug}/redirect?path=${encodeURIComponent(path)}`,
    );
  } catch {
    return <main className="state">Legacy URL not found.</main>;
  }
  permanentRedirect(result.targetPath);
}
