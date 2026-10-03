# COBRA TN

Tunisia-facing storefront for **COBRA TN**, built as a single-page app on Vite + React.
Supabase is the only backend: Postgres for the catalog and orders, Auth for accounts,
Storage for images, and an Edge Function for order notifications.

Ordering is **cash on delivery**. There is no payment gateway, and no card details are
ever collected.

## Stack

| Concern      | Choice                                              |
| ------------ | --------------------------------------------------- |
| Build        | Vite 8, React 19, plain JSX                         |
| Routing      | React Router 7                                       |
| Styling      | Tailwind CSS 3.4                                     |
| Lint         | oxlint                                               |
| Data + Auth  | Supabase (Postgres, Auth, Storage)                   |
| Email        | Supabase Edge Function + Resend                      |

## Getting started

```bash
npm install
cp .env.example .env      # then fill in the two Supabase values
npm run dev
```

Only two environment variables are needed:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-API-KEY
```

Both are public by design. Every read and write is constrained by Postgres row level
security, so the anon key is safe to ship in the browser bundle. **Never** put the
`service_role` key in a `VITE_*` variable — those are inlined into the public bundle.

## Database setup

1. Run `supabase/schema.sql` in the Supabase SQL editor. It is idempotent, so it is safe
   to re-run after a schema change.
2. Optionally load `supabase/seed.sql` for a starter catalog.
3. Promote an account to admin by setting `is_admin = true` on its `profiles` row.

`schema.sql` is the source of truth. It owns the tables, row level security policies,
and the two RPCs the app depends on:

- `next_order_number()` — generates a unique, gap-free order number.
- `commit_order_stock(order_id)` — decrements stock for a placed order. This is a
  `SECURITY DEFINER` function because the anon role has no update policy on
  `products` / `product_variants`; there is no browser-side alternative. It is
  idempotent via `orders.stock_committed`, so a retry or double call is a no-op.

If you previously applied the old Shopify schema, run `supabase/shopify_cleanup.sql`
once to drop the leftover `shopify_wishlist` table and
`categories.shopify_product_type` column.

## Order notifications

The checkout calls an Edge Function after an order is committed. You can use
either transport — it picks the one whose secrets are present.

**Option A — Gmail App Password (no domain needed, recommended to start):**

1. Enable 2-Step Verification on Gmail: `myaccount.google.com/security`
2. Create an App Password: `myaccount.google.com/apppasswords`
3. Deploy and set the secrets:

```bash
supabase functions deploy order-notification --no-verify-jwt
supabase secrets set SMTP_PASS=your-16-char-app-password
```

`SMTP_USER` defaults to the store address (`cobratn0@gmail.com`). Gmail allows
roughly 500 messages/day; this is a real, working production transport with no
domain and no third-party account.

**Option B — Resend:**

```bash
supabase functions deploy order-notification --no-verify-jwt
supabase secrets set RESEND_API_KEY=re_xxx ORDER_FROM="COBRA TN <orders@yourdomain.tn>"
```

Resend needs a verified sending domain to reach arbitrary recipients (its free
test sender only delivers to your own account email).

Either way, the recipient is read from **Admin → Settings → Contact email**
(`admin_settings.contact_email`), falling back to the `ORDER_TO` secret and then
to the built-in `cobratn0@gmail.com`. The function looks the order up
server-side with the service role and only emails a summary, so customer details
are never trusted from the request body.

Notification is best effort on purpose: the order is already committed by the
time it runs, so a delivery failure is recorded but never shown to the customer
as a failed checkout.

## How an order is placed

1. `createOrder()` in `src/lib/api.js` re-prices every line from the database. Nothing
   the browser sent about money is trusted — unit prices, discounts, and the delivery
   charge are all resolved server-side.
2. The order row and its `order_items` are written.
3. `commit_order_stock()` moves stock.
4. The `order-notification` function emails the store.
5. `OrderSuccess` reads a display-only snapshot from `sessionStorage` — a guest never
   needs to read their order back out of the database, and RLS does not allow it.

Guest carts live in `localStorage` under `cobra_guest_cart` and merge into `cart_items`
on sign-in. Guest wishlists work the same way under `cobra_wishlist`.

## Project layout

```
src/
  lib/
    supabase.js     client, auth helpers, storage buckets
    catalog.js      product/variant/collection queries, filters, pagination
    api.js          the app's data facade: catalog, cart, orders, admin CRUD
    utils.js        formatting, governorates, shared helpers
  contexts/         Auth, Cart, Wishlist, UI, Language
  components/       layout, product cards, cart drawer, search, toasts
  pages/            storefront: Home, Shop, Product, Collections, Cart,
                    Checkout, OrderSuccess, Wishlist, account/*
  admin/            admin panel: dashboard, products, orders, customers,
                    categories, collections, coupons, shipping, settings
supabase/
  schema.sql        tables, RLS policies, RPCs
  seed.sql          starter catalog
  functions/order-notification/
```

## Scripts

```bash
npm run dev       # dev server
npm run build     # production build
npm run preview   # serve the production build
npm run lint      # oxlint
```
