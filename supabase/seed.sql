-- ============================================================================
-- COBRA TN — DEMO SEED DATA
-- Run AFTER schema.sql. Everything here is clearly marked as demo content and
-- can be deleted freely once real products arrive.
-- Image URLs below point at the /public/images placeholders bundled in the repo.
-- ============================================================================

-- --- Admin settings -----------------------------------------------------------
insert into public.admin_settings (id, about_text, contact_email, contact_phone, social)
values (
  '11111111-1111-1111-1111-111111111111',
  'COBRA TN was born on the streets of Tunis. More than clothes, it''s a mindset. Every piece is built for people who move with purpose — premium monochrome streetwear with an identity you can feel.',
  'cobratn0@gmail.com',
  '+216 20 000 000',
  '{"instagram": "https://instagram.com/cobra.tn", "tiktok": "https://tiktok.com/@cobra.tn", "youtube": "https://youtube.com/@cobra.tn", "x": "https://x.com/cobra_tn"}'::jsonb
)
on conflict (id) do nothing;

-- --- Categories ---------------------------------------------------------------
insert into public.categories (name, slug, description) values
  ('T-Shirts', 't-shirts', 'Essential tees with a heavy drop-shoulder fit.'),
  ('Hoodies', 'hoodies', 'Oversized, heavyweight hooded sweatshirts.'),
  ('Pants', 'pants', 'Cargo pants and relaxed joggers.'),
  ('Jackets', 'jackets', 'Bombers, overshirts and urban outerwear.'),
  ('Accessories', 'accessories', 'Caps, beanies and finishing pieces.')
on conflict (slug) do nothing;

-- --- Collections ----------------------------------------------------------------
insert into public.collections (name, slug, description, image_url, is_featured, is_active) values
  ('New Drop', 'new-drop', 'The latest arrivals.', '/images/placeholder-collection.svg', true, true),
  ('Essentials', 'essentials', 'Everyday core pieces.', '/images/placeholder-collection.svg', true, true),
  ('Limited Edition', 'limited-edition', 'Rare batches. Never restocked.', '/images/placeholder-collection.svg', true, true),
  ('Summer 2026', 'summer-2026', 'Lightweight fits for the Tunisian heat.', '/images/placeholder-collection.svg', false, true),
  ('Winter 2026', 'winter-2026', 'Heavy layers for the cold season.', '/images/placeholder-collection.svg', false, true)
on conflict (slug) do nothing;

-- --- Shipping zones (all 24 Tunisian governorates) -------------------------------
insert into public.shipping_zones (name, delivery_price, estimated_days, is_active) values
  ('Tunis', 5, 1, true),
  ('Ariana', 5, 1, true),
  ('Ben Arous', 5, 1, true),
  ('Manouba', 5, 1, true),
  ('Nabeul', 7, 2, true),
  ('Zaghouan', 8, 2, true),
  ('Bizerte', 8, 2, true),
  ('Béja', 8, 2, true),
  ('Jendouba', 10, 3, true),
  ('Le Kef', 10, 3, true),
  ('Siliana', 10, 3, true),
  ('Sousse', 7, 2, true),
  ('Monastir', 7, 2, true),
  ('Mahdia', 8, 2, true),
  ('Sfax', 8, 2, true),
  ('Kairouan', 10, 2, true),
  ('Kasserine', 12, 3, true),
  ('Sidi Bouzid', 12, 3, true),
  ('Gabès', 12, 3, true),
  ('Médenine', 14, 4, true),
  ('Tozeur', 14, 4, true),
  ('Kébili', 14, 4, true),
  ('Tataouine', 15, 4, true),
  ('Gafsa', 12, 3, true)
on conflict (id) do nothing;

-- --- Coupons -----------------------------------------------------------------------
insert into public.coupons (code, type, value, min_order, max_uses, expires_at, is_active) values
  ('COBRA10', 'percent', 10, 0, 1000, to_timestamp('2030-12-31', 'YYYY-MM-DD'), true),
  ('WELCOME15', 'percent', 15, 100, 500, to_timestamp('2030-12-31', 'YYYY-MM-DD'), true)
on conflict (code) do nothing;

-- --- Homepage sections ---------------------------------------------------------------
insert into public.homepage_sections
  (section_key, title, subtitle, description, image_url, button_text, button_link, is_active)
values
  ('hero', 'MORE THAN\nCLOTHES.', 'IT''S A MINDSET.', 'Modern clothing built for people who move with purpose.',
   '/images/placeholder-hero.svg', 'SHOP NOW', '/shop', true),
  ('new_arrivals', 'NEW ARRIVALS', '', '', '', '', '/shop', true),
  ('featured_collection', 'THE NEW COLLECTION', '', 'Designed for everyday movement. Built with a focus on quality, comfort and identity.',
   '/images/placeholder-editorial.svg', 'EXPLORE COLLECTION', '/collections/new-drop', true),
  ('brand_story', 'COBRA TN', 'MORE THAN CLOTHES.', 'It''s a mindset.',
   '/images/placeholder-story.svg', '', '/about', true),
  ('instagram', 'FOLLOW COBRA TN', '@cobra.tn', '', '', '', 'https://instagram.com/cobra.tn', true),
  ('newsletter', 'STAY IN THE LOOP', '', 'Get updates about new collections, drops and special releases.', '', 'SUBSCRIBE', '', true)
on conflict (section_key) do nothing;

-- ============================================================================
-- DEMO PRODUCTS (delete these rows whenever you are ready for real products)
-- ============================================================================

insert into public.products
  (name, slug, description, price, sale_price, category_id, collection_id, sku, stock, materials,
   care_instructions, is_featured, is_published)
values
  ('COBRA Essential T-Shirt', 'cobra-essential-t-shirt',
   'The everyday heavyweight tee. Drop-shoulder cut, 240gsm combed cotton, tonal chest print. The foundation of the wardrobe.',
   55, null, (select id from categories where slug='t-shirts'), (select id from collections where slug='essentials'),
   'CBT-TEE-001', 60, '100% Combed Cotton, 240gsm',
   'Machine wash cold. Do not bleach. Do not tumble dry.', true, true),

  ('COBRA Oversized Hoodie', 'cobra-oversized-hoodie',
   'Heavy 420gsm fleece hoodie with a boxy oversized silhouette, double-layer hood and kangaroo pocket.',
   89, 79, (select id from categories where slug='hoodies'), (select id from collections where slug='essentials'),
   'CBT-HD-002', 45, '80% Cotton / 20% Polyester, 420gsm',
   'Machine wash cold, inside out. Do not iron print.', true, true),

  ('COBRA Cargo Pants', 'cobra-cargo-pants',
   'Relaxed cargo pants with utilitarian pockets, adjustable cuffs and a durable cotton twill build.',
   75, null, (select id from categories where slug='pants'), (select id from collections where slug='new-drop'),
   'CBT-PT-003', 38, '100% Cotton Twill',
   'Machine wash cold. Iron low.', false, true),

  ('COBRA Urban Jacket', 'cobra-urban-jacket',
   'Water-resistant urban jacket with a tonal COBRA back print, full zip and hidden chest pocket.',
   129, null, (select id from categories where slug='jackets'), (select id from collections where slug='new-drop'),
   'CBT-JK-004', 25, 'Polyester shell / Cotton lining',
   'Machine wash cold. Do not use fabric softener.', false, true),

  ('COBRA Cap', 'cobra-cap',
   'Structured 6-panel cap with embroidered cobra logo and an adjustable strap back.',
   35, null, (select id from categories where slug='accessories'), (select id from collections where slug='essentials'),
   'CBT-AC-005', 80, 'Cotton twill / Polyester mesh',
   'Spot clean only.', false, true),

  ('COBRA Beware Tee', 'cobra-beware-tee',
   'Statement tee with a large back print. 240gsm cotton, pre-shrunk.',
   59, 49, (select id from categories where slug='t-shirts'), (select id from collections where slug='limited-edition'),
   'CBT-TEE-006', 30, '100% Combed Cotton, 240gsm',
   'Machine wash cold, inside out.', false, true),

  ('COBRA Jogger', 'cobra-jogger',
   'Tapered fleece joggers with ribbed cuffs and a drawcord waist.',
   65, null, (select id from categories where slug='pants'), (select id from collections where slug='summer-2026'),
   'CBT-PT-007', 42, '80% Cotton / 20% Polyester',
   'Machine wash cold.', false, true),

  ('COBRA Bomber', 'cobra-bomber',
   'Classic bomber silhouette in a matte black shell with tonal embroidery.',
   149, null, (select id from categories where slug='jackets'), (select id from collections where slug='winter-2026'),
   'CBT-JK-008', 20, 'Nylon shell / Satin lining',
   'Professional dry clean only.', false, true),

  ('COBRA Beanie', 'cobra-beanie',
   'Ribbed knitted beanie with woven leather-style COBRA badge.',
   30, null, (select id from categories where slug='accessories'), (select id from collections where slug='winter-2026'),
   'CBT-AC-009', 70, '100% Acrylic',
   'Hand wash cold.', false, true),

  ('COBRA Heavy Tee', 'cobra-heavy-tee',
   'An extra-heavy oversized tee with dropped shoulders and a boxy hem.',
   62, null, (select id from categories where slug='t-shirts'), (select id from collections where slug='new-drop'),
   'CBT-TEE-010', 55, '100% Cotton, 260gsm',
   'Machine wash cold.', true, true)
on conflict (slug) do nothing;

-- --- Product images ----------------------------------------------------------------
insert into public.product_images (product_id, url, position)
select id, '/images/placeholder-product-front.svg', 0
from public.products
on conflict do nothing;

insert into public.product_images (product_id, url, position)
select id, '/images/placeholder-product-back.svg', 1
from public.products
on conflict do nothing;

-- --- Product variants (cartesian color x size for each demo product) ----------------
with sizes(s) as (values ('S'), ('M'), ('L'), ('XL'), ('XXL')),
colors(c) as (values ('Black'), ('White'), ('Gray'))
insert into public.product_variants (product_id, color, size, stock)
select p.id, colors.c, sizes.s, 20
from public.products p
cross join colors
cross join sizes
where p.slug in ('cobra-essential-t-shirt', 'cobra-oversized-hoodie', 'cobra-beware-tee', 'cobra-heavy-tee')
on conflict (product_id, color, size) do nothing;

with sizes(s) as (values ('S'), ('M'), ('L'), ('XL')),
colors(c) as (values ('Black'), ('Gray'))
insert into public.product_variants (product_id, color, size, stock)
select p.id, colors.c, sizes.s, 15
from public.products p
cross join colors
cross join sizes
where p.slug in ('cobra-cargo-pants', 'cobra-urban-jacket', 'cobra-jogger', 'cobra-bomber')
on conflict (product_id, color, size) do nothing;

-- Caps / beanies are one-size.
insert into public.product_variants (product_id, color, size, stock)
select p.id, c, 'One Size', 30
from public.products p
cross join (values ('Black'), ('White')) as v(c)
where p.slug in ('cobra-cap', 'cobra-beanie')
on conflict (product_id, color, size) do nothing;

-- Normalize product-level stock to the total available across variants.
update public.products p
set stock = coalesce((select sum(v.stock) from public.product_variants v where v.product_id = p.id), 0)
where p.slug in (
  'cobra-essential-t-shirt', 'cobra-oversized-hoodie', 'cobra-cargo-pants',
  'cobra-urban-jacket', 'cobra-cap', 'cobra-beware-tee', 'cobra-jogger',
  'cobra-bomber', 'cobra-beanie', 'cobra-heavy-tee'
);

-- ============================================================================
-- To promote your first user to admin, sign up on the website then run:
--   select public.set_admin('your-email@example.com');
-- ============================================================================