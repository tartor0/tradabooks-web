// supabase/functions/create-customer-order/index.ts
//
// Public endpoint called from the Next.js storefront's order modal.
// No Supabase auth session required (callable with anon key) — this is the
// one deliberate exception to "writes need an authenticated trader" because
// customers never log in. Validation happens here, server-side, instead of
// relying on RLS policies for an anonymous caller across three tables.
//
// Deploy with: supabase functions deploy create-customer-order

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let payload: {
    trader_id?: string;
    product_id?: string;
    quantity?: number;
    customer_name?: string;
    customer_phone?: string | null;
    note?: string | null;
  };

  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }

  const { trader_id, product_id, quantity, customer_name, customer_phone, note } = payload;

  // ── Validation ──────────────────────────────────────────────
  if (!trader_id || !product_id || !customer_name?.trim()) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }
  if (!Number.isInteger(quantity) || quantity! < 1) {
    return jsonResponse({ error: 'Quantity must be at least 1' }, 400);
  }
  const sanitizedName = customer_name.trim().slice(0, 100);
  if (sanitizedName.length === 0) {
    return jsonResponse({ error: 'Customer name cannot be empty' }, 400);
  }
  const sanitizedPhone = customer_phone?.trim().slice(0, 20) || null;
  const sanitizedNote = note?.trim().slice(0, 200) || null;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ── Look up product, confirm it belongs to trader_id and has stock ──
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, trader_id, name, price_kobo, quantity, is_available')
    .eq('id', product_id)
    .eq('trader_id', trader_id)
    .maybeSingle();

  if (productError || !product) {
    return jsonResponse({ error: 'Product not found' }, 404);
  }
  if (!product.is_available) {
    return jsonResponse({ error: 'This product is no longer available' }, 409);
  }
  if (product.quantity < quantity!) {
    return jsonResponse(
      { error: `Only ${product.quantity} left in stock` },
      409,
    );
  }

  const totalKobo = product.price_kobo * quantity!;
  const now = new Date().toISOString();

  // ── Upsert customer by phone (mirrors OrderService._saveCustomer) ──
  let customerId: string | null = null;
  if (sanitizedPhone) {
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, total_spent_kobo, order_count')
      .eq('trader_id', trader_id)
      .eq('phone', sanitizedPhone)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      await supabase
        .from('customers')
        .update({
          total_spent_kobo: (existingCustomer.total_spent_kobo ?? 0) + totalKobo,
          order_count: (existingCustomer.order_count ?? 0) + 1,
          last_order_at: now,
        })
        .eq('id', customerId);
    }
  }

  if (!customerId) {
    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert({
        trader_id,
        name: sanitizedName,
        phone: sanitizedPhone,
        total_spent_kobo: totalKobo,
        order_count: 1,
        first_order_at: now,
        last_order_at: now,
        created_at: now,
      })
      .select('id')
      .single();

    if (customerError) {
      return jsonResponse({ error: 'Could not save customer record' }, 500);
    }
    customerId = newCustomer.id;
  }

  // ── Create the order ──────────────────────────────────────────
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      trader_id,
      customer_id: customerId,
      customer_name: sanitizedName,
      customer_phone: sanitizedPhone,
      total_kobo: totalKobo,
      status: 'pending',
      notes: sanitizedNote,
      source: 'storefront',
      created_at: now,
    })
    .select('id')
    .single();

  if (orderError || !order) {
    return jsonResponse({ error: 'Could not create order' }, 500);
  }

  // ── Order item ─────────────────────────────────────────────────
  const { error: itemError } = await supabase.from('order_items').insert({
    order_id: order.id,
    product_id: product.id,
    product_name: product.name,
    price_kobo: product.price_kobo,
    quantity,
  });

  if (itemError) {
    // Order header exists but item failed — surface the error rather than
    // silently leaving an empty order; trader will see it as a zero-item
    // pending order otherwise.
    return jsonResponse({ error: 'Order created but failed to save item details' }, 500);
  }

  // ── Decrement stock ───────────────────────────────────────────
  await supabase
    .from('products')
    .update({ quantity: product.quantity - quantity!, updated_at: now })
    .eq('id', product.id);

  const shortRef = order.id.replace(/-/g, '').slice(-8).toUpperCase();

  return jsonResponse({ order_id: order.id, short_ref: shortRef });
});
