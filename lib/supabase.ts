import { createClient } from '@supabase/supabase-js';

// Public anon key — same project the Flutter app uses. Safe to expose
// client-side; all writes that need protection go through Edge Functions
// with their own validation, not direct table access from here.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
}

export type StoreProfile = {
  id: string;
  store_name: string;
  store_slug: string;
  store_bio: string | null;
  store_description: string | null;
  store_location: string | null;
  business_type: string | null;
  profile_image_url: string | null;
  whatsapp_number: string | null;
  phone_number: string | null;
};

export type StoreProduct = {
  id: string;
  trader_id: string;
  name: string;
  price_kobo: number;
  quantity: number;
  category: string | null;
  image_url: string | null;
  is_available: boolean;
};

/**
 * Fetches a trader's public profile by store slug.
 */
export async function getStoreBySlug(
  slug: string
): Promise<StoreProfile | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select(`
      id,
      store_name,
      store_slug,
      store_bio,
      store_description,
      store_location,
      business_type,
      profile_image_url,
      whatsapp_number,
      phone_number
    `)
    .eq('store_slug', slug)
    .maybeSingle();

  console.log(
    'STORE DATA:',
    JSON.stringify(data),
    'ERROR:',
    JSON.stringify(error)
  );

  if (error) {
    console.error('Store lookup failed:', error);
    return null;
  }

  if (!data) {
    console.log('No store found for slug:', slug);
    return null;
  }

  return data as StoreProfile;
}


/**
 * Fetches all available products for a trader.
 */
export async function getStoreProducts(
  traderId: string
): Promise<StoreProduct[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('products')
    .select(
      'id, trader_id, name, price_kobo, quantity, category, image_url, is_available'
    )
    .eq('trader_id', traderId)
    .eq('is_available', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Products lookup failed:', error);
    return [];
  }

  return (data ?? []) as StoreProduct[];
}