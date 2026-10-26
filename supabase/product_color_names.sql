-- Add readable French color names to existing product variants.
alter table public.product_variants
  add column if not exists color_name text not null default '';

update public.product_variants
set color_name = case lower(trim(color))
  when '#000000' then 'Noir'
  when 'black' then 'Noir'
  when 'noir' then 'Noir'
  when '#ffffff' then 'Blanc'
  when 'white' then 'Blanc'
  when 'blanc' then 'Blanc'
  when '#f5f5f4' then 'Blanc cassé'
  when '#808080' then 'Gris'
  when '#9ca3af' then 'Gris'
  when 'gray' then 'Gris'
  when 'grey' then 'Gris'
  when 'gris' then 'Gris'
  when '#1f2937' then 'Anthracite'
  when 'charcoal' then 'Anthracite'
  when 'off white' then 'Blanc cassé'
  when '#7f1d1d' then 'Bordeaux'
  when '#800020' then 'Bordeaux'
  when 'bordeaux' then 'Bordeaux'
  when '#14532d' then 'Vert'
  when '#2e7d32' then 'Vert'
  when 'green' then 'Vert'
  when 'vert' then 'Vert'
  when '#0f766e' then 'Turquoise'
  when 'teal' then 'Turquoise'
  when '#1e3a8a' then 'Bleu marine'
  when 'navy' then 'Bleu marine'
  when '#2563eb' then 'Bleu'
  when 'blue' then 'Bleu'
  when '#7c3aed' then 'Violet'
  when 'purple' then 'Violet'
  when '#ec4899' then 'Rose'
  when 'pink' then 'Rose'
  when '#78350f' then 'Marron'
  when 'brown' then 'Marron'
  when '#e11d48' then 'Rouge'
  when 'red' then 'Rouge'
  when '#a16207' then 'Olive'
  when '#e8d8b8' then 'Beige'
  else case
    when color_name <> '' then color_name
    when trim(color) ~* '^#?[0-9a-f]{3}([0-9a-f]{3})?$' then 'Couleur personnalisée'
    else initcap(trim(color))
  end
end
where trim(color_name) = '';
