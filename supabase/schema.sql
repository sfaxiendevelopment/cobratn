-- ============================================================================
-- COBRA TN — Supabase Schema & Row Level Security
-- Paste this entire file into the Supabase SQL Editor and run it.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- Some database functions below reference tables that are created later in this
-- file. By default Postgres validates SQL function bodies at creation time, so
-- defer that check here and restore it after all objects exist.
set check_function_bodies = off;

-- ----------------------------------------------------------------------------
-- HELPER: is_admin()
-- Core of the security model. The frontend only sends the anon/public key;
-- admin authorization is enforced here inside Postgres.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- ----------------------------------------------------------------------------
-- TF: set_updated_at
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- TF: handle_new_user  (creates a profile row whenever a user signs up)
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', new.email)
  );
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- TF: set_admin(email) — grants admin role. Run in SQL editor as owner:
--   select public.set_admin('your-email@example.com');
-- ----------------------------------------------------------------------------
create or replace function public.set_admin(target_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set role = 'admin', updated_at = now()
  where lower(email) = lower(target_email);
end;
$$;

grant execute on function public.set_admin(text) to postgres;

-- ----------------------------------------------------------------------------
-- RPC: next_order_number() — atomic unique order number generator
-- ----------------------------------------------------------------------------
create sequence if not exists public.order_number_seq;

create or replace function public.next_order_number()
returns text
language sql
volatile
as $$
  select 'CBTN-' || to_char(now(), 'YYYY') || '-'
         || lpad(nextval('public.order_number_seq')::text, 6, '0');
$$;

grant execute on function public.next_order_number() to authenticated, anon;

-- ----------------------------------------------------------------------------
-- RPC: increment_product_sales(product_ids, amounts)
-- ----------------------------------------------------------------------------
create or replace function public.increment_product_sales(product_ids uuid[], amounts int[])
returns void
language plpgsql
volatile
as $$
declare
  i int;
begin
  for i in 1 .. array_length(product_ids, 1) loop
    update public.products
    set sales_count = sales_count + coalesce(amounts[i], 1)
    where id = product_ids[i];
  end loop;
end;
$$;

grant execute on function public.increment_product_sales(uuid[], int[]) to authenticated, anon;

-- ----------------------------------------------------------------------------
-- RPC: commit_order_stock(order_id) — applies stock movement for a placed order
--
-- Guests can insert into orders/order_items (see the orders_insert policy) but
-- the anon role has no update policy on products/product_variants, so stock
-- cannot be moved from the browser. This function is the only path that does it.
--
-- Safety properties:
--   * it reads the order's own order_items rows, never a caller-supplied list,
--     so a caller cannot decrement stock for a product that is not in a real
--     order they created;
--   * it is idempotent via orders.stock_committed, so a retry or a double call
--     cannot decrement twice;
--   * stock is clamped at 0 and never goes negative;
--   * all SQL is static, so nothing is interpolated from user input.
-- ----------------------------------------------------------------------------
create or replace function public.commit_order_stock(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed int;
begin
  if p_order_id is null then
    return false;
  end if;

  -- Claim the order. A second call matches no row and bails out.
  update public.orders
     set stock_committed = true
   where id = p_order_id
     and coalesce(stock_committed, false) = false;
  get diagnostics v_claimed = row_count;

  if v_claimed = 0 then
    return false;
  end if;

  -- Variant lines.
  update public.product_variants v
     set stock = greatest(0, v.stock - agg.qty)
    from (
      select oi.variant_id, sum(oi.quantity)::int as qty
        from public.order_items oi
       where oi.order_id = p_order_id
         and oi.variant_id is not null
       group by oi.variant_id
    ) agg
   where v.id = agg.variant_id;

  -- Product lines for products that have no variant rows.
  update public.products p
     set stock = greatest(0, p.stock - agg.qty)
    from (
      select oi.product_id, sum(oi.quantity)::int as qty
        from public.order_items oi
       where oi.order_id = p_order_id
         and oi.variant_id is null
         and oi.product_id is not null
       group by oi.product_id
    ) agg
   where p.id = agg.product_id;

  return true;
end;
$$;

grant execute on function public.commit_order_stock(uuid) to authenticated, anon;

-- ============================================================================
-- TABLES
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text not null default '',
  last_name text not null default '',
  display_name text,
  phone text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_settings (
  id uuid primary key default gen_random_uuid(),
  about_text text default '',
  contact_email text default '',
  contact_phone text default '',
  social jsonb default '{"instagram": "", "tiktok": "", "facebook": ""}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text default '',
  image_url text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text default '',
  price numeric(10,2) not null check (price >= 0),
  sale_price numeric(10,2) check (sale_price is null or sale_price >= 0),
  discount_percent integer not null default 0 check (discount_percent between 0 and 100),
  effective_price numeric(10,2) generated always as (round((coalesce(sale_price, price) * (1 - discount_percent::numeric / 100))::numeric, 2)) stored,
  category_id uuid references public.categories(id) on delete set null,
  collection_id uuid references public.collections(id) on delete set null,
  sku text,
  stock integer not null default 0 check (stock >= 0),
  materials text default '',
  care_instructions text default '',
  size_chart jsonb default null,
  is_featured boolean not null default false,
  is_published boolean not null default false,
  sales_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt text default '',
  position int not null default 0
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color text not null default 'Black',
  size text not null,
  sku text,
  stock integer not null default 0 check (stock >= 0),
  price numeric(10,2) check (price is null or price >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, color, size)
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (user_id, variant_id)
);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  order_number text not null unique,
  customer_name text not null,
  customer_email text not null,
  phone text not null,
  country text not null default 'Tunisia',
  governorate text not null,
  city text not null,
  address text not null,
  postal_code text,
  additional_info text default '',
  subtotal numeric(10,2) not null default 0,
  shipping_cost numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  payment_method text not null default 'cash_on_delivery',
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  order_status text not null default 'pending'
    check (order_status in ('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled', 'returned')),
  coupon_code text,
  stock_committed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent for databases created before stock_committed existed.
alter table public.orders
  add column if not exists stock_committed boolean not null default false;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  color text,
  size text,
  image_url text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('percent', 'fixed')),
  value numeric(10,2) not null check (value > 0),
  min_order numeric(10,2) not null default 0,
  max_uses integer,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  delivery_price numeric(10,2) not null default 0,
  estimated_days integer not null default 2,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  title text default '',
  subtitle text default '',
  description text default '',
  image_url text default '',
  button_text text default '',
  button_link text default '',
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated
  before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists trg_homepage_updated on public.homepage_sections;
create trigger trg_homepage_updated
  before update on public.homepage_sections
  for each row execute function public.set_updated_at();

-- ============================================================================
-- INDEXES (frequently searched fields)
-- ============================================================================

create index if not exists idx_categories_slug on public.categories(slug);
create index if not exists idx_collections_slug on public.collections(slug);
create index if not exists idx_collections_active on public.collections(is_active);

create index if not exists idx_products_slug on public.products(slug);
create index if not exists idx_products_published on public.products(is_published) where is_published;
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_collection on public.products(collection_id);
create index if not exists idx_products_effective_price on public.products(effective_price);
create index if not exists idx_products_created on public.products(created_at desc);
create index if not exists idx_products_featured on public.products(is_featured) where is_featured;
create index if not exists idx_products_name on public.products using gin (to_tsvector('simple', name || ' ' || coalesce(description, '')));

create index if not exists idx_variants_product on public.product_variants(product_id);
create index if not exists idx_variants_size on public.product_variants(size);
create index if not exists idx_variants_color on public.product_variants(color);
create index if not exists idx_images_product on public.product_images(product_id);

create index if not exists idx_cart_user on public.cart_items(user_id);
create index if not exists idx_wishlist_user on public.wishlists(user_id);
create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_number on public.orders(order_number);
create index if not exists idx_orders_status on public.orders(order_status);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_coupons_code on public.coupons(code);
create index if not exists idx_newsletter_email on public.newsletter_subscribers(email);
create index if not exists idx_homepage_key on public.homepage_sections(section_key);

-- ============================================================================
-- ROW LEVEL SECURITY
-- Rules: users read/update only their own data; admins manage the catalog.
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.cart_items enable row level security;
alter table public.wishlists enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.shipping_zones enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.homepage_sections enable row level security;
alter table public.admin_settings enable row level security;

-- --- profiles ---------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
  );

drop policy if exists "profiles_admin_select_all" on public.profiles;
create policy profiles_admin_select_all on public.profiles
  for select using (public.is_admin());

drop policy if exists "profiles_admin_update_all" on public.profiles;
create policy profiles_admin_update_all on public.profiles
  for update using (public.is_admin())
  with check (true);

drop policy if exists "profiles_admin_delete" on public.profiles;
create policy profiles_admin_delete on public.profiles
  for delete using (public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid() or public.is_admin());

-- --- categories -------------------------------------------------------------
drop policy if exists "categories_public_read" on public.categories;
create policy categories_public_read on public.categories
  for select using (true);

drop policy if exists "categories_admin_write" on public.categories;
create policy categories_admin_write on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- --- collections --------------------------------------------------------------
drop policy if exists "collections_public_read" on public.collections;
create policy collections_public_read on public.collections
  for select using (true);

drop policy if exists "collections_admin_write" on public.collections;
create policy collections_admin_write on public.collections
  for all using (public.is_admin()) with check (public.is_admin());

-- --- products ----------------------------------------------------------------
drop policy if exists "products_public_read_published" on public.products;
create policy products_public_read_published on public.products
  for select using (is_published = true);

drop policy if exists "products_admin_all" on public.products;
create policy products_admin_all on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- --- product_images -----------------------------------------------------------
drop policy if exists "images_public_read_published" on public.product_images;
create policy images_public_read_published on public.product_images
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.is_published = true
    )
  );

drop policy if exists "images_admin_all" on public.product_images;
create policy images_admin_all on public.product_images
  for all using (public.is_admin()) with check (public.is_admin());

-- --- product_variants -----------------------------------------------------------
drop policy if exists "variants_public_read_published" on public.product_variants;
create policy variants_public_read_published on public.product_variants
  for select using (
    exists (
      select 1 from public.products p
      where p.id = product_id and p.is_published = true
    )
  );

drop policy if exists "variants_admin_all" on public.product_variants;
create policy variants_admin_all on public.product_variants
  for all using (public.is_admin()) with check (public.is_admin());

-- --- cart_items -----------------------------------------------------------------
drop policy if exists "cart_select_own" on public.cart_items;
create policy cart_select_own on public.cart_items
  for select using (auth.uid() = user_id);

drop policy if exists "cart_insert_own" on public.cart_items;
create policy cart_insert_own on public.cart_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "cart_update_own" on public.cart_items;
create policy cart_update_own on public.cart_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "cart_delete_own" on public.cart_items;
create policy cart_delete_own on public.cart_items
  for delete using (auth.uid() = user_id);

-- --- wishlists -------------------------------------------------------------------
drop policy if exists "wishlist_select_own" on public.wishlists;
create policy wishlist_select_own on public.wishlists
  for select using (auth.uid() = user_id);

drop policy if exists "wishlist_insert_own" on public.wishlists;
create policy wishlist_insert_own on public.wishlists
  for insert with check (auth.uid() = user_id);

drop policy if exists "wishlist_delete_own" on public.wishlists;
create policy wishlist_delete_own on public.wishlists
  for delete using (auth.uid() = user_id);

-- --- orders -----------------------------------------------------------------------
drop policy if exists "orders_select_own" on public.orders;
create policy orders_select_own on public.orders
  for select using (auth.uid() = user_id);

drop policy if exists "orders_admin_all" on public.orders;
create policy orders_admin_all on public.orders
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "orders_insert" on public.orders;
create policy orders_insert on public.orders
  for insert with check (auth.uid() = user_id or user_id is null);

-- --- order_items --------------------------------------------------------------------
drop policy if exists "order_items_select_own" on public.order_items;
create policy order_items_select_own on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "order_items_admin_all" on public.order_items;
create policy order_items_admin_all on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "order_items_insert" on public.order_items;
create policy order_items_insert on public.order_items
  for insert with check (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_id and (o.user_id = auth.uid() or o.user_id is null)
    )
  );

-- --- coupons ---------------------------------------------------------------------------
drop policy if exists "coupons_public_read_active" on public.coupons;
create policy coupons_public_read_active on public.coupons
  for select using (is_active = true);

drop policy if exists "coupons_admin_all" on public.coupons;
create policy coupons_admin_all on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

-- --- coupon_redemptions ---------------------------------------------------------------
drop policy if exists "redemptions_insert_own" on public.coupon_redemptions;
create policy redemptions_insert_own on public.coupon_redemptions
  for insert with check (auth.uid() = user_id or user_id is null);

drop policy if exists "redemptions_admin_all" on public.coupon_redemptions;
create policy redemptions_admin_all on public.coupon_redemptions
  for all using (public.is_admin()) with check (public.is_admin());

-- --- shipping_zones -----------------------------------------------------------------------
drop policy if exists "zones_public_read" on public.shipping_zones;
create policy zones_public_read on public.shipping_zones
  for select using (true);

drop policy if exists "zones_admin_all" on public.shipping_zones;
create policy zones_admin_all on public.shipping_zones
  for all using (public.is_admin()) with check (public.is_admin());

-- --- newsletter_subscribers ----------------------------------------------------------------
drop policy if exists "newsletter_public_insert" on public.newsletter_subscribers;
create policy newsletter_public_insert on public.newsletter_subscribers
  for insert with check (true);

drop policy if exists "newsletter_admin_all" on public.newsletter_subscribers;
create policy newsletter_admin_all on public.newsletter_subscribers
  for all using (public.is_admin()) with check (public.is_admin());

-- --- homepage_sections ------------------------------------------------------------------------
drop policy if exists "homepage_public_read" on public.homepage_sections;
create policy homepage_public_read on public.homepage_sections
  for select using (is_active = true);

drop policy if exists "homepage_admin_all" on public.homepage_sections;
create policy homepage_admin_all on public.homepage_sections
  for all using (public.is_admin()) with check (public.is_admin());

-- --- admin_settings ----------------------------------------------------------------------------
drop policy if exists "settings_public_read" on public.admin_settings;
create policy settings_public_read on public.admin_settings
  for select using (true);

drop policy if exists "settings_admin_all" on public.admin_settings;
create policy settings_admin_all on public.admin_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- STORAGE BUCKETS + POLICIES
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif']),
  ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('site-assets', 'site-assets', true, 5242880, array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars' or bucket_id = 'product-images' or bucket_id = 'site-assets');

drop policy if exists "avatars_user_upload" on storage.objects;
create policy avatars_user_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_user_update" on storage.objects;
create policy avatars_user_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_user_delete" on storage.objects;
create policy avatars_user_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "product_images_admin_write" on storage.objects;
create policy product_images_admin_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('product-images', 'site-assets')
    and public.is_admin()
  );

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy product_images_admin_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('product-images', 'site-assets')
    and public.is_admin()
  );

-- ============================================================================
-- DONE. Run seed.sql next, then create your admin user in Supabase Auth and:
--   select public.set_admin('you@example.com');
-- ============================================================================
set check_function_bodies = on;