import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getStoreBySlug, getStoreProducts } from '@/lib/supabase';
import { StorefrontClient } from '@/components/StorefrontClient';

export const revalidate = 30; // re-fetch at most every 30s — products change often, but no need for every request

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const store = await getStoreBySlug(params.slug);
   console.log('SLUG:', params.slug, 'URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  if (!store) return { title: 'Store not found — TradaBooks' };
  return {
    title: `${store.store_name} — TradaBooks`,
    description: `Shop ${store.store_name}'s products directly on WhatsApp.`,
  };
}

export default async function StorePage({ params }: { params: { slug: string } }) {
  const store = await getStoreBySlug(params.slug);
  if (!store) notFound();

  const products = await getStoreProducts(store.id);

  return <StorefrontClient store={store} products={products} />;
}
