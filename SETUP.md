# TradaBooks Storefront — Setup & Deployment Guide

This covers everything that needs to happen outside the code: Supabase
config, deployment, DNS, and the things to double-check before customers
start clicking real links.

## 1. Supabase — things to verify or add

The storefront reads from tables that already exist (`user_profiles`,
`products`) and writes through a new Edge Function to `orders`,
`order_items`, and `customers` — same tables the Flutter app already uses.

**Check these columns exist on `user_profiles`** (the storefront query
selects all of them):
- `store_slug`, `store_name`, `bio`, `category`, `profile_image_url`,
  `whatsapp_number`, `phone_number`

`whatsapp_number` is already used by the trader's Business Profile screen
in the app, so it should be populated for any trader who's completed that
screen. If a trader never filled it in, the storefront falls back to
`phone_number` — but if both are empty, ordering will show an error. Worth
a quick check in your Supabase table editor for any null `whatsapp_number`
+ null `phone_number` rows before launch.

**Check the `orders` table has a `source` column.** The new Edge Function
writes `source: 'storefront'` so you can later tell customer-placed orders
apart from trader-logged ones in the dashboard. If that column doesn't
exist yet, either add it (`alter table orders add column source text;`) or
remove that line from the function — it's not required for the flow to
work, just useful for reporting later.

**Deploy the new Edge Function:**
```
supabase functions deploy create-customer-order
```
This function uses the **service role key** (not the anon key) internally,
which it reads from the function's environment — Supabase sets
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically for all Edge
Functions in your project, so no manual secret configuration needed there.

**Confirm RLS does not block the function.** Since the function uses the
service role key, it bypasses Row Level Security entirely — this is
intentional (it's why we built a function instead of writing from the
browser directly). You don't need to change any RLS policies for this to
work, but it's worth knowing the function itself is now the security
boundary for customer-created orders, not RLS.

## 2. Vercel — deploying the Next.js storefront

1. Push the `tradabooks-web` project to a Git repo (GitHub/GitLab/Bitbucket
   — whichever you use).
2. In Vercel, "Add New Project" → import that repo.
3. Framework preset should auto-detect as Next.js. No build command
   changes needed.
4. Add environment variables in Vercel's project settings:
   - `NEXT_PUBLIC_SUPABASE_URL` — same Supabase project URL the app uses
     (`https://bjediyvrezgronzpqxjq.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the anon key from Supabase dashboard
     → Project Settings → API (the same one already in `main.dart`)
5. Deploy. Vercel will give you a `*.vercel.app` URL first — confirm a
   real store loads at `your-project.vercel.app/store/some-real-slug`
   before moving to the domain step.

## 3. Connecting tradabooks.shop

1. In Vercel project settings → Domains, add `tradabooks.shop`.
2. Vercel will show you DNS records to add (typically an `A` record
   pointing to Vercel's IP, or a `CNAME` if you're using a subdomain).
   Add these at your domain registrar (wherever you bought
   tradabooks.shop).
3. DNS propagation can take anywhere from a few minutes to a few hours.
   Vercel's dashboard will show the domain as "Valid" once it's live.
4. Once connected, every existing `StoreService.getStoreUrl()` call in the
   Flutter app already points to `https://tradabooks.shop/store/{slug}` —
   no app changes needed, the links just start working the moment DNS
   resolves.

## 4. Testing before sharing real links

Walk through the full loop once for real:
1. Open `tradabooks.shop/store/{a-real-trader-slug}` on an actual phone,
   ideally inside the WhatsApp app itself (tap a link someone sends you in
   a chat) — the in-app browser behaves slightly differently than Safari/
   Chrome and is where most customers will actually land.
2. Tap a product, fill the order form, submit.
3. Confirm WhatsApp opens with the pre-filled message and the order
   reference number.
4. Check the trader's app — the order should appear in Orders within a
   few seconds, with the customer's name, phone (if given), and note.
5. Tap "Send Payment Link" from the trader side and confirm that still
   works as before — this part wasn't changed.

## 5. Known follow-ups (not blocking launch, but don't lose track)

- **No rate limiting on `create-customer-order` yet.** Decided to ship
  without it for now. Worth revisiting once there's real traffic — someone
  could currently script repeated calls to drain a trader's stock counters
  or spam their order list. Cheapest first fix later: a simple per-IP
  count check inside the function, or Supabase's built-in Edge Function
  rate limits if your plan supports them.
- **`payment_success_screen.dart` in the app is still disconnected** —
  flagged separately, not part of this web deployment, but don't forget
  it's still showing placeholder content if anyone navigates there.
- **Paystack webhook → automatic "paid" status** isn't covered by this
  deployment either. Right now "Mark as Paid" is a manual trader tap. If
  you want it automatic, that's a Supabase Realtime subscription + webhook
  question, separate from the link architecture we just built.
