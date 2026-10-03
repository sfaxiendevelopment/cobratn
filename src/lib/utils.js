export const TND = (n) =>
  new Intl.NumberFormat('fr-TN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0)

export function formatPrice(value) {
  return `${TND(value)} TND`
}

export function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('fr-TN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('fr-TN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function getErrorMessage(error) {
  const msg = error?.message || ''
  if (msg.includes('already registered')) return 'Un compte existe déjà avec cette adresse email.'
  if (msg.includes('Invalid login')) return 'Adresse email ou mot de passe incorrect.'
  if (msg.includes('Email not confirmed')) return 'Veuillez d’abord confirmer votre adresse email.'
  if (msg.includes('Password should be at least')) return 'Le mot de passe doit contenir au moins 6 caractères.'
  if (msg.includes('duplicate key value')) return 'Cette entrée existe déjà.'
  if (msg.includes('violates foreign key constraint')) {
    return 'Cet élément fait référence à des données qui n’existent plus (par exemple une image ou une taille pointant vers un produit supprimé). Rechargez la page, puis exécutez le SQL de nettoyage des orphelins ci-dessous.'
  }
  if (msg.includes('Failed to fetch')) return 'Erreur réseau. Veuillez réessayer.'
  return msg || 'Une erreur est survenue. Veuillez réessayer.'
}

export function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export const SIZES = ['S', 'M', 'L', 'XL', 'XXL']

export const COLORS = ['Black', 'White', 'Gray', 'Green', 'Beige', 'Bordeaux']

const SWATCH_HEX = {
  black: '#000000',
  white: '#ffffff',
  grey: '#9ca3af',
  gray: '#9ca3af',
  green: '#2e7d32',
  beige: '#e8d8b8',
  bordeaux: '#800020',
}

export function swatchFor(color) {
  const value = String(color || '').trim().toLowerCase()
  return SWATCH_HEX[value] || color
}

/** Resolves any stored colour (hex, or a legacy name like `Bordeaux`) to `#rrggbb`. */
export function hexFor(color) {
  const raw = String(color || '').trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw
  if (/^#[0-9a-f]{3}$/.test(raw)) {
    const [, r, g, b] = raw
    return `#${r}${r}${g}${g}${b}${b}`
  }
  if (/^[0-9a-f]{6}$/.test(raw)) return `#${raw}`
  return SWATCH_HEX[raw] || '#000000'
}

/*
 * Colours are picked as a hex in the product form, so the storefront has to
 * turn that code back into a name the shopper recognises.
 */
const NAMED_COLORS = [
  ['#000000', 'Black'],
  ['#1f2937', 'Charcoal'],
  ['#808080', 'Gray'],
  ['#9ca3af', 'Gray'],
  ['#ffffff', 'White'],
  ['#f5f5f4', 'Off White'],
  ['#e8d8b8', 'Beige'],
  ['#a16207', 'Olive'],
  ['#2e7d32', 'Green'],
  ['#0f766e', 'Teal'],
  ['#1e3a8a', 'Navy'],
  ['#2563eb', 'Blue'],
  ['#7c3aed', 'Purple'],
  ['#ec4899', 'Pink'],
  ['#e11d48', 'Red'],
  ['#800020', 'Bordeaux'],
  ['#7f1d1d', 'Bordeaux'],
  ['#78350f', 'Brown'],
]

/** Normalises `#abc` to `#aabbcc`, or returns null when it is not a hex. */
function normalizeHex(color) {
  const raw = String(color || '').trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw
  if (/^#[0-9a-f]{3}$/.test(raw)) {
    const [, r, g, b] = raw
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return null
}

const rgbOf = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]

/** Names a shade that sits close to no known colour, from its hue and lightness. */
function genericColorName(hex) {
  const [r, g, b] = rgbOf(hex).map((v) => v / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2
  const delta = max - min
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))

  let hue = 0
  if (delta > 0) {
    if (max === r) hue = ((g - b) / delta) % 6
    else if (max === g) hue = (b - r) / delta + 2
    else hue = (r - g) / delta + 4
    hue = Math.round(hue * 60)
    if (hue < 0) hue += 360
  }

  // A barely-tinted shade reads better as a neutral than as a faint hue,
  // so near-greys are named by lightness instead.
  if (saturation < 0.18) {
    if (lightness > 0.92) return 'White'
    if (lightness > 0.78) return 'Off White'
    if (lightness < 0.08) return 'Black'
    if (lightness < 0.25) return 'Charcoal'
    return 'Gray'
  }
  if (saturation < 0.32 && lightness > 0.6 && hue >= 20 && hue < 70) return 'Beige'
  if (hue < 15 || hue >= 345) return 'Red'
  if (hue < 45) return 'Orange'
  if (hue < 70) return 'Yellow'
  if (hue < 160) return 'Green'
  if (hue < 200) return 'Teal'
  if (hue < 255) return 'Blue'
  if (hue < 290) return 'Purple'
  return 'Pink'
}

/** A shopper-facing name for a stored colour: `Black`, `Beige`, `Navy`… */
export function colorName(color) {
  const raw = String(color || '').trim()
  if (!raw) return ''
  const hex = normalizeHex(raw)
  // A legacy name such as `Black` is already readable.
  if (!hex) return raw.charAt(0).toUpperCase() + raw.slice(1)

  const exact = NAMED_COLORS.find(([reference]) => reference === hex)
  return exact ? exact[1] : genericColorName(hex)
}

export const TN_GOVERNORATES = [
  'Tunis',
  'Ariana',
  'Ben Arous',
  'Manouba',
  'Nabeul',
  'Zaghouan',
  'Bizerte',
  'Béja',
  'Jendouba',
  'Le Kef',
  'Siliana',
  'Sousse',
  'Monastir',
  'Mahdia',
  'Sfax',
  'Kairouan',
  'Kasserine',
  'Sidi Bouzid',
  'Gabès',
  'Médenine',
  'Tozeur',
  'Kébili',
  'Tataouine',
  'Gafsa',
]

export const ORDER_STATUSES = [
  { value: 'pending', label: 'En attente' },
  { value: 'confirmed', label: 'Confirmée' },
  { value: 'preparing', label: 'Préparation' },
  { value: 'shipped', label: 'Expédiée' },
  { value: 'delivered', label: 'Livrée' },
  { value: 'cancelled', label: 'Annulée' },
  { value: 'returned', label: 'Retournée' },
]

export const PAYMENT_STATUSES = [
  { value: 'pending', label: 'En attente' },
  { value: 'paid', label: 'Payée' },
  { value: 'failed', label: 'Échouée' },
  { value: 'refunded', label: 'Remboursée' },
]

export const PAYMENT_METHODS = [
  { value: 'cash_on_delivery', label: 'Paiement à la livraison' },
  { value: 'card', label: 'Carte (en ligne)' },
  { value: 'bank_transfer', label: 'Virement bancaire' },
]

const ORDER_STATUS_LABELS = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'Préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  returned: 'Retournée',
}

const PAYMENT_STATUS_LABELS = {
  pending: 'En attente',
  paid: 'Payée',
  failed: 'Échouée',
  refunded: 'Remboursée',
}

/** Turns a raw API status value into its French label. */
export function orderStatusLabel(value) {
  const key = String(value || '').trim().toLowerCase()
  return ORDER_STATUS_LABELS[key] || key.replace(/_/g, ' ')
}

/** Turns a raw API payment status value into its French label. */
export function paymentStatusLabel(value) {
  const key = String(value || '').trim().toLowerCase()
  return PAYMENT_STATUS_LABELS[key] || key.replace(/_/g, ' ')
}

export function discountPercentage(price, salePrice) {
  if (!salePrice || salePrice >= price) return 0
  return Math.round(((price - salePrice) / price) * 100)
}

export function getProductImage(product, _variant) {
  const images = product?.images || []
  if (images.length) return images[0].url
  return '/images/placeholder-product-front.svg'
}

export function getProductHoverImage(product) {
  const images = product?.images || []
  return images.length > 1 ? images[1].url : ''
}

/**
 * Turns a social URL from Paramètres into a short label, so the home page and
 * the contact page both show `@cobra.tn` instead of the full link.
 */
export function socialHandle(url, fallback) {
  const path = String(url || '')
    .split(/[?#]/)[0]
    .replace(/^https?:\/\/[^/]+/i, '')
    .split('/')
    .filter(Boolean)
    .pop()
  if (!path) return fallback
  // Numeric ids and script names (`profile.php`) are not handles. A dotted
  // name like `cobra.tn` is, so only real file extensions are rejected.
  if (/^\d+$/.test(path) || /\.(php|aspx?|jsp|html?)$/i.test(path)) return fallback
  return path.startsWith('@') ? path : `@${path}`
}