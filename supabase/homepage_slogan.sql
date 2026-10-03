-- =============================================================================
-- COBRA TN — force the brand slogan back to English (homepage sections)
-- =============================================================================
-- The storefront UI is French, but these specific marketing lines are meant to
-- stay in English:
--   "MORE THAN CLOTHES." / "IT'S A MINDSET."
--   "Modern clothing built for people who move with purpose."
--
-- The hero and brand_story sections are stored in the database and override the
-- React fallbacks, so a live database edited while the site was French will keep
-- showing the old French copy. Running this script restores the English copy.
--
-- Safe to run more than once. It only touches title/subtitle/description and
-- never changes image_url, button_text, button_link, is_active or ordering.
-- =============================================================================

update public.homepage_sections
   set title = 'MORE THAN\nCLOTHES.',
       subtitle = 'IT''S A MINDSET.',
       description = 'Modern clothing built for people who move with purpose.'
 where section_key = 'hero';

update public.homepage_sections
   set subtitle = 'MORE THAN CLOTHES.',
       description = 'It''s a mindset.'
 where section_key = 'brand_story';

-- Verify
select section_key, title, subtitle, description
  from public.homepage_sections
 order by section_key;
