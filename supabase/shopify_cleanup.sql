-- ============================================================================
-- SHOPIFY CLEANUP
-- ============================================================================
-- Run this ONCE if the Shopify migration in this project was already applied to
-- your Supabase project. It removes the objects that migration created and
-- nothing else. It is safe to run repeatedly, and safe to skip entirely if you
-- never applied the Shopify schema.
--
-- The storefront no longer talks to Shopify: `src/lib/shopify/` and
-- `supabase/shopify.sql` are gone, and commerce runs entirely on Supabase.
-- Run this file to finish removing the database side.
-- ============================================================================

-- Guest wishlist table from the Shopify era.
drop table if exists public.shopify_wishlist;

-- Category column used to mirror Shopify's product type.
alter table public.categories
  drop column if exists shopify_product_type;

-- Any policies that referenced the column above.
drop policy if exists "categories_admin_all" on public.categories;
drop policy if exists "categories_public_read" on public.categories;
