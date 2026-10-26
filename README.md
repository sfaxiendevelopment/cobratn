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
EmailJS, Resend, or Gmail SMTP. EmailJS is selected first when its secrets are
configured, followed by Resend and then Gmail SMTP.

**Option A — EmailJS (no custom website domain required):**

1. Create an account at EmailJS and add an email service. You can connect a
   Gmail account; follow EmailJS's current account-connection steps.
2. Create or edit an email template. Set its **To Email** field to
   `{{to_email}}`. The existing order-confirmation template can be used as a
   starting point: it receives `order_id`, an `orders` array containing
   `name`, `units`, `price`, `line_total`, and `image` for each item, plus a
   `cost` object with `subtotal`, `shipping`, `tax`, `discount`, and `total`.
   It also receives `customer_name`, `customer_email`, `customer_phone`,
   `customer_address`, `additional_info`, and `order_date`. The function sends
   one message per store recipient, not to the customer. The `tax` value is
   currently zero because checkout does not calculate a separate tax.
   Update any dollar signs in the template to `TND`; order prices are Tunisian
   dinars. Remove or reword customer-facing promises such as tracking updates
   if they do not apply to this store notification.
3. To add a download button, use this link in the template's HTML content:
   `<a href="{{order_pdf_url}}">Télécharger le bon de commande (PDF)</a>`.
   The function creates the PDF in a private Supabase Storage bucket and passes
   an expiring signed download URL. The link works for seven days; anyone with
   the link can use it until it expires.
4. Copy the Service ID, Template ID, Public Key, and Private Key from the
   EmailJS dashboard. Keep the Private Key secret.
5. In Supabase **Project Settings → Edge Functions → Secrets**, set:

```bash
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_TEMPLATE_ID=your_template_id
EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_PRIVATE_KEY=your_private_key
```

   Or use the Supabase CLI from the project folder:

```powershell
supabase secrets set EMAILJS_SERVICE_ID=your_service_id EMAILJS_TEMPLATE_ID=your_template_id EMAILJS_PUBLIC_KEY=your_public_key EMAILJS_PRIVATE_KEY=your_private_key
```

6. Deploy the Edge Function:

```powershell
supabase functions deploy order-notification --no-verify-jwt
```

7. In Supabase **SQL Editor**, run `supabase/order_pdfs.sql` to create the
   private PDF bucket. Run `supabase/contact_emails.sql` once if you have not
   already run it. Then deploy the updated storefront and place a test order.
   Check all three recipient inboxes, including spam, and verify the PDF button
   opens a download.

EmailJS limits requests to one per second; the function sends recipient emails
sequentially with a short pause. EmailJS may still deliver to spam, and use of
Gmail through EmailJS does not guarantee inbox placement. If you previously
configured Resend or SMTP, EmailJS takes priority while all four EmailJS secrets
are present. Remove old provider secrets if you do not want them kept as
fallbacks.

**Option B — Gmail SMTP:** Enable 2-Step Verification on Gmail, create an App
Password at `myaccount.google.com/apppasswords`, then set `SMTP_USER` (optional;
defaults to `cobratn0@gmail.com`) and `SMTP_PASS` in Supabase Edge Function
secrets and deploy the function.

**Option C — Resend:** Resend requires a verified sending domain to send to
arbitrary recipients. Set `RESEND_API_KEY` and `ORDER_FROM` in Supabase secrets,
then deploy the function.

Either way, the recipient is read from **Admin → Settings → Contact email**
(`admin_settings.contact_email`), falling back to the `ORDER_TO` secret and then
to the built-in `cobratn0@gmail.com`. The function looks the order up
server-side with the service role and only emails a summary, so customer details
are never trusted from the request body.
Multiple contact addresses may be entered in Admin → Settings separated by
commas or new lines; order notifications are sent to each address.

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
