-- Adds a per-product discount percentage. The customer price becomes:
--   effective_price = (selling price) x (1 - discount_percent / 100)
-- where the selling price is sale_price when set, otherwise price.
--
-- Run this once in the Supabase SQL editor (Dashboard > SQL), AFTER deploying the
-- code changes. It is safe to run on an existing database.

alter table public.products
  add column if not exists discount_percent integer not null default 0 check (discount_percent between 0 and 100);

-- effective_price is a generated column, so it has to be recreated to include
-- the discount. Dropping it also drops its index, which we recreate below.
alter table public.products drop column effective_price;

alter table public.products
  add column effective_price numeric(10,2) generated always as (
    round((coalesce(sale_price, price) * (1 - discount_percent::numeric / 100))::numeric, 2)
  ) stored;

create index if not exists idx_products_effective_price on public.products(effective_price);