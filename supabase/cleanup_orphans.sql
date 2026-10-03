-- Purges image and size rows whose product no longer exists.
-- Run this once in the Supabase SQL editor (Dashboard > SQL) to clear any
-- rows that trip the "product_images_product_id_fkey" foreign-key error.

delete from public.product_images
where product_id not in (select id from public.products);

delete from public.product_variants
where product_id not in (select id from public.products);