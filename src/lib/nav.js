// Footer shop links are driven by a small helper so they can be extended later.
// Categories are fetched live from Supabase on the Shop page; this is for the
// static footer columns only.
export function getCategoryLinks() {
  return [
    { to: '/shop?category=t-shirts', label: 'T-shirts' },
    { to: '/shop?category=hoodies', label: 'Sweats à capuche' },
    { to: '/shop?category=pants', label: 'Pantalons' },
    { to: '/shop?category=jackets', label: 'Vestes' },
    { to: '/shop?category=accessories', label: 'Accessoires' },
  ]
}