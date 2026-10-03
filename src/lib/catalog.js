/**
 * Catalogue reads against Supabase Postgres.
 *
 * Rows are normalised into the shape the UI has always consumed:
 *   - `id` is the product UUID (cart_items / wishlists / order_items all
 *     reference it as a foreign key, so it must NOT be a slug)
 *   - `slug` is the URL segment
 *   - `effective_price` is the generated column, so the client never has to
 *     recompute the sale price
 */
import { supabase } from './supabase'

const PRODUCT_SELECT = `
  *,
  category:categories ( id, name, slug ),
  collection:collections ( id, name, slug, image_url ),
  product_images ( id, product_id, url, alt, position ),
  product_variants ( id, product_id, color, size, sku, stock, price )
`

/** Values a size/colour filter should offer, derived from live variants. */
function deriveOptions(variants) {
  const sizes = []
  const colors = []
  for (const variant of variants) {
    if (variant.size && !sizes.includes(variant.size)) sizes.push(variant.size)
    if (variant.color && !colors.includes(variant.color)) colors.push(variant.color)
  }
  return {
    options: [
      { name: 'Size', values: sizes },
      { name: 'Color', values: colors },
    ],
    sizes,
    colors,
  }
}

function mapVariant(variant) {
  const price = variant.price == null ? null : Number(variant.price)
  return {
    ...variant,
    price,
    available: (variant.stock ?? 0) > 0,
  }
}

/** Normalises one joined product row. */
export function mapProductRow(row) {
  if (!row) return null

  const images = [...(row.product_images || [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((img) => ({ id: img.id, url: img.url, alt: img.alt || row.name, position: img.position }))

  const variants = (row.product_variants || []).map(mapVariant)
  const { options, sizes, colors } = deriveOptions(variants)

  const price = Number(row.price ?? 0)
  const salePrice = row.sale_price == null ? null : Number(row.sale_price)
  const discountPercent = Math.min(100, Math.max(0, Number(row.discount_percent) || 0))

  // The generated `effective_price` column is the source of truth. The local
  // fallback mirrors it so serialized rows never show the cost (price).
  const base = salePrice == null ? price : salePrice
  const effectivePrice =
    row.effective_price != null
      ? Number(row.effective_price)
      : discountPercent > 0
        ? Math.round(base * (1 - discountPercent / 100) * 100) / 100
        : base

  // A product with no variant rows is treated as a single unlabelled variant so
  // the cart and the product page always have something to work with.
  const hasVariants = variants.length > 0
  const productVariants = hasVariants
    ? variants
    : [
        {
          id: null,
          product_id: row.id,
          color: null,
          size: null,
          sku: row.sku,
          stock: row.stock ?? 0,
          price: null,
          available: (row.stock ?? 0) > 0,
        },
      ]

  return {
    ...row,
    price,
    sale_price: salePrice,
    effective_price: effectivePrice,
    on_sale: salePrice != null && salePrice < price,
    stock: row.stock ?? 0,
    available: (row.stock ?? 0) > 0,
    is_active: Boolean(row.is_published),
    images,
    variants: productVariants,
    options,
    sizes,
    colors,
  }
}

function byId(rows) {
  return rows.map(mapProductRow)
}

async function resolveCategoryId(category) {
  if (!category || category === 'all') return null
  const { data } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', category)
    .maybeSingle()
  return data?.id || null
}

async function resolveCollectionId(collection) {
  if (!collection || collection === 'all') return null
  const { data } = await supabase
    .from('collections')
    .select('id')
    .eq('slug', collection)
    .maybeSingle()
  return data?.id || null
}

const SORTS = {
  newest: { column: 'created_at', ascending: false },
  oldest: { column: 'created_at', ascending: true },
  price_asc: { column: 'effective_price', ascending: true },
  price_desc: { column: 'effective_price', ascending: false },
  name: { column: 'name', ascending: true },
  featured: { column: 'is_featured', ascending: false },
  sales: { column: 'sales_count', ascending: false },
}

/**
 * Variant filters are resolved to a set of product ids first: an embedded
 * `!inner` filter would also trim the returned `product_variants` array, and
 * the UI needs every variant to render the picker.
 */
async function productIdsMatchingVariants({ sizes, colors, availability }) {
  let query = supabase.from('product_variants').select('product_id')
  if (sizes?.length) query = query.in('size', sizes)
  if (colors?.length) query = query.in('color', colors)
  if (availability === 'in_stock') query = query.gt('stock', 0)
  const { data, error } = await query.limit(5000)
  if (error) throw error
  return [...new Set((data || []).map((row) => row.product_id))]
}

export async function fetchProducts({
  category,
  collection,
  search,
  sort = 'newest',
  priceRange,
  sizes,
  colors,
  availability,
  page = 1,
  limit = 20,
  includeUnpublished = false,
} = {}) {
  if (!supabase) return { data: [], count: 0, pagination: null }

  const sizeList = toArray(sizes)
  const colorList = toArray(colors)
  const needsVariantFilter = sizeList.length > 0 || colorList.length > 0 || availability === 'in_stock'

  let query = supabase.from('products').select(PRODUCT_SELECT, { count: 'exact' })

  if (!includeUnpublished) query = query.eq('is_published', true)

  const categoryId = await resolveCategoryId(category)
  if (categoryId) query = query.eq('category_id', categoryId)

  const collectionId = await resolveCollectionId(collection)
  if (collectionId) query = query.eq('collection_id', collectionId)

  if (search && String(search).trim()) {
    const term = String(search).trim().replace(/[%,()]/g, ' ')
    query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%,slug.ilike.%${term}%`)
  }

  if (priceRange) {
    const [min, max] = priceRange
    if (typeof min === 'number' && min > 0) query = query.gte('effective_price', min)
    if (typeof max === 'number' && max > 0) query = query.lte('effective_price', max)
  }

  if (needsVariantFilter) {
    const ids = await productIdsMatchingVariants({ sizes: sizeList, colors: colorList, availability })
    if (!ids.length) return { data: [], count: 0, pagination: null }
    query = query.in('id', ids)
  } else if (availability === 'out_of_stock') {
    query = query.lte('stock', 0)
  }

  const sortSpec = SORTS[sort] || SORTS.newest
  query = query.order(sortSpec.column, { ascending: sortSpec.ascending })

  const from = (Math.max(1, page) - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) throw error

  const total = count ?? data?.length ?? 0
  return {
    data: byId(data || []),
    count: total,
    pagination: {
      page: Math.max(1, page),
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNextPage: from + limit < total,
      hasPreviousPage: Math.max(1, page) > 1,
    },
  }
}

function toArray(value) {
  if (!value) return []
  return Array.isArray(value) ? value.filter(Boolean) : [value]
}

export async function fetchProductBySlug(slug) {
  if (!supabase || !slug) return null
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('slug', slug)
    .maybeSingle()
  if (error) return null
  return mapProductRow(data)
}

export async function fetchProductById(id) {
  if (!supabase || !id) return null
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) return null
  return mapProductRow(data)
}

export async function fetchProductsByIds(ids) {
  const list = toArray(ids)
  if (!supabase || !list.length) return []
  const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).in('id', list)
  if (error) return []
  return byId(data || [])
}

export async function fetchFeaturedProducts(limit = 8) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return byId(data || [])
}

/** Same category first, topped up with anything else published. */
export async function fetchRelatedProducts(product, limit = 4) {
  if (!supabase || !product) return []
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('is_published', true)
    .neq('id', product.id)
    .order('sales_count', { ascending: false })
    .limit(limit + 4)
  if (error) return []
  const rows = data || []
  const sameCategory = rows.filter((row) => row.category_id && row.category_id === product.category_id)
  const rest = rows.filter((row) => !sameCategory.includes(row))
  return byId([...sameCategory, ...rest].slice(0, limit))
}

export async function fetchCatalogOptions() {
  const empty = { options: [], sizes: [], colors: [] }
  if (!supabase) return empty
  const { data, error } = await supabase
    .from('product_variants')
    .select('size, color')
    .limit(5000)
  if (error) return empty
  return deriveOptions(data || [])
}

export async function fetchCollections({ limit = 50, featuredOnly = false, includeInactive = false } = {}) {
  if (!supabase) return []
  let query = supabase.from('collections').select('*').order('created_at', { ascending: false })
  if (!includeInactive) query = query.eq('is_active', true)
  if (featuredOnly) query = query.eq('is_featured', true)
  query = query.limit(limit)
  const { data, error } = await query
  return error ? [] : data || []
}

export async function fetchCollectionBySlug(slug) {
  if (!supabase || !slug) return null
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  return error ? null : data
}

export async function fetchCollectionPage(slug, { sort = 'newest', limit = 40 } = {}) {
  if (!supabase || !slug) return { data: [], count: 0, pagination: null }
  const { data: collection } = await fetchCollectionBySlug(slug)
  if (!collection) return { data: [], count: 0, pagination: null }
  return fetchProducts({ collection: collection.slug, sort, page: 1, limit })
}
