/**
 * Data facade.
 *
 * Commerce is read from and written to Supabase Postgres: products, variants,
 * stock, cart, wishlist, coupons, shipping and orders. Authentication,
 * profiles and marketing content live here too.
 */
import { supabase, uploadToStorage, deleteFromStorage } from './supabase'
import { slugify } from './utils'
import {
  fetchProducts,
  fetchProductBySlug,
  fetchProductById,
  fetchProductsByIds,
  fetchFeaturedProducts,
  fetchRelatedProducts,
  fetchCatalogOptions,
  fetchCollections,
  fetchCollectionBySlug,
  fetchCollectionPage,
  mapProductRow,
} from './catalog'

export { isSupabaseConfigured, STORAGE_BUCKETS as STORAGE_BUCKET_NAMES } from './supabase'
export { mapProductRow }

const requireSupabase = () => {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

/* ------------------------------------------------------------------ */
/* Catalogue                                                           */
/* ------------------------------------------------------------------ */

export async function getProducts(options = {}) {
  if (!supabase) return { data: [], count: 0, pagination: null }
  try {
    return await fetchProducts(options)
  } catch (err) {
    console.error('getProducts', err)
    throw err
  }
}

export async function getProductBySlug(slug) {
  if (!supabase) return null
  try {
    return await fetchProductBySlug(slug)
  } catch (err) {
    console.error('getProductBySlug', err)
    return null
  }
}

export async function getProductById(id) {
  if (!supabase || !id) return null
  try {
    return await fetchProductById(id)
  } catch (err) {
    console.error('getProductById', err)
    return null
  }
}

export async function getProductsByIds(ids) {
  if (!supabase || !ids?.length) return []
  try {
    return await fetchProductsByIds(ids)
  } catch (err) {
    console.error('getProductsByIds', err)
    return []
  }
}

export async function getFeaturedProducts(limit = 8) {
  if (!supabase) return []
  try {
    return await fetchFeaturedProducts(limit)
  } catch (err) {
    console.error('getFeaturedProducts', err)
    return []
  }
}

export async function getRelatedProducts(product, limit = 4) {
  if (!supabase) return []
  try {
    return await fetchRelatedProducts(product, limit)
  } catch (err) {
    console.error('getRelatedProducts', err)
    return []
  }
}

export async function getCatalogOptions() {
  if (!supabase) return { options: [], sizes: [], colors: [] }
  try {
    return await fetchCatalogOptions()
  } catch (err) {
    console.error('getCatalogOptions', err)
    return { options: [], sizes: [], colors: [] }
  }
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export async function getCategories() {
  if (!supabase) return []
  const { data, error } = await supabase.from('categories').select('*').order('name')
  return error ? [] : data || []
}

export async function getCategoryById(id) {
  if (!supabase || !id) return null
  const { data } = await supabase.from('categories').select('*').eq('id', id).maybeSingle()
  return data || null
}

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

export async function getCollections(options = {}) {
  if (!supabase) return []
  try {
    return await fetchCollections(options)
  } catch (err) {
    console.error('getCollections', err)
    return []
  }
}

export async function getCollectionBySlug(slug) {
  if (!supabase) return null
  try {
    return await fetchCollectionBySlug(slug)
  } catch (err) {
    console.error('getCollectionBySlug', err)
    return null
  }
}

export async function getCollectionPage(slug, options = {}) {
  if (!supabase) return { data: [], count: 0, pagination: null }
  try {
    return await fetchCollectionPage(slug, options)
  } catch (err) {
    console.error('getCollectionPage', err)
    return []
  }
}

/* ------------------------------------------------------------------ */
/* Coupons                                                             */
/* ------------------------------------------------------------------ */

export async function validateCoupon(code, subtotal = 0) {
  if (!supabase || !code) return { valid: false, discount: 0, error: 'Saisissez un code promo' }
  const normalized = String(code).trim().toUpperCase()
  if (!normalized) return { valid: false, discount: 0, error: 'Saisissez un code promo' }

  const { data: coupon } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', normalized)
    .maybeSingle()

  if (!coupon) return { valid: false, discount: 0, error: 'Ce code promo n’est pas valide' }
  if (!coupon.is_active) return { valid: false, discount: 0, error: 'Ce code promo n’est plus actif' }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, discount: 0, error: 'Ce code promo a expiré' }
  }

  // A minimum order amount is optional: leave null/0 and the code works on
  // any product and any order total.
  if (Number(coupon.min_order) > 0 && Number(subtotal) < Number(coupon.min_order)) {
    return {
      valid: false,
      discount: 0,
      error: `Ce code nécessite un montant de commande d’au moins ${Number(coupon.min_order)} TND`,
    }
  }

  // The storefront has no customer accounts, so a redemption cannot be matched
  // to a person and a per-customer "used once" rule is not enforceable. The
  // global max_uses cap below is what actually limits a code.
  if (coupon.max_uses != null) {
    const { count } = await supabase
      .from('coupon_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
    if ((count || 0) >= coupon.max_uses) {
      return { valid: false, discount: 0, error: 'Ce code a atteint sa limite d’utilisation' }
    }
  }

  const value = Number(coupon.value)
  const raw = coupon.type === 'percent' ? (Number(subtotal) * value) / 100 : value
  const discount = Math.round(Math.min(raw, Number(subtotal)) * 100) / 100

  return { valid: true, discount, coupon, error: null }
}

/* ------------------------------------------------------------------ */
/* Shipping                                                            */
/* ------------------------------------------------------------------ */

export async function getShippingZones({ includeInactive = false } = {}) {
  if (!supabase) return []
  let query = supabase.from('shipping_zones').select('*').order('name')
  if (!includeInactive) query = query.eq('is_active', true)
  const { data, error } = await query
  return error ? [] : data || []
}

const DEFAULT_ZONE_NAMES = ['default', 'all tunisia', 'tunisia']

/**
 * Resolves the delivery price for a governorate. Zones are matched by name;
 * anything unmatched falls back to a zone literally called "Default" and then
 * to the cheapest active zone, so a missing zone never silently charges 0.
 */
export function resolveShippingCost(governorate, zones = []) {
  const active = zones.filter((zone) => zone.is_active !== false)
  if (!active.length) return 0

  const wanted = String(governorate || '').trim().toLowerCase()
  const exact = active.find((zone) => String(zone.name || '').trim().toLowerCase() === wanted)
  if (exact) return Number(exact.delivery_price) || 0

  const fallback =
    active.find((zone) => DEFAULT_ZONE_NAMES.includes(String(zone.name || '').trim().toLowerCase())) ||
    [...active].sort((a, b) => Number(a.delivery_price) - Number(b.delivery_price))[0]
  return Number(fallback?.delivery_price) || 0
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

/**
 * Asks the `order-notification` Edge Function to email the store.
 *
 * Best effort by design: the order is already committed, so a failure here must
 * never be surfaced as a failed checkout. Returns `{ sent: boolean }` so the
 * confirmation screen can be honest about whether the email was delivered.
 */
export async function sendOrderNotification(order) {
  if (!supabase || !order?.id) return { sent: false, error: 'Commande introuvable' }
  const { data, error } = await supabase.functions.invoke('order-notification', {
    body: { order_id: order.id },
  })
  if (error) {
    console.error('sendOrderNotification', error)
    return { sent: false, error: error.message }
  }
  return data || { sent: false }
}

export async function getOrderById(orderId) {
  if (!supabase || !orderId) return null
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', orderId)
    .maybeSingle()
  if (error) return null
  return data
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

/**
 * Places an order.
 *
 * Prices are always re-read from the database — the totals sent by the browser
 * are ignored — and the customer's name and phone number are required because
 * they are the only way the store can fulfil a cash-on-delivery order.
 */
export async function createOrder({
  userId = null,
  customerName,
  customerEmail,
  phone,
  governorate,
  city,
  address,
  postalCode = null,
  additionalInfo = '',
  items = [],
  couponCode = null,
  paymentMethod = 'cash_on_delivery',
}) {
  const client = requireSupabase()

  const name = String(customerName || '').trim()
  const phoneNumber = String(phone || '').trim()
  const governorateName = String(governorate || '').trim()
  const cityName = String(city || '').trim()
  const streetAddress = String(address || '').trim()

  if (!name) throw new Error('Le nom complet est obligatoire')
  if (!phoneNumber) throw new Error('Le numéro de téléphone est obligatoire')
  if (name.length > 120) throw new Error('Le nom complet est trop long')
  if (!/^[+()\-\s\d]{6,24}$/.test(phoneNumber)) throw new Error('Saisissez un numéro de téléphone valide')
  if (!governorateName) throw new Error('Le gouvernorat est obligatoire')
  if (!cityName) throw new Error('La ville est obligatoire')
  if (!streetAddress) throw new Error("L'adresse est obligatoire")
  if (!items.length) throw new Error('Votre panier est vide')

  // Re-price server side. Nothing the browser sent about money is trusted.
  const productIds = [...new Set(items.map((item) => item.product_id).filter(Boolean))]
  const { data: productRows, error: productError } = await client
    .from('products')
    .select('id, name, price, sale_price, effective_price, stock, product_images ( url, position )')
    .in('id', productIds)
  if (productError) throw productError

  const productsById = new Map((productRows || []).map((row) => [row.id, row]))
  const variantIds = items.map((item) => item.variant_id).filter(Boolean)
  const { data: variantRows } = variantIds.length
    ? await client.from('product_variants').select('id, product_id, color, size, sku, stock, price').in('id', variantIds)
    : { data: [] }
  const variantsById = new Map((variantRows || []).map((row) => [row.id, row]))

  const lines = []
  for (const item of items) {
    const product = productsById.get(item.product_id)
    if (!product) throw new Error("Un article de votre panier n'est plus disponible")

    const variant = item.variant_id ? variantsById.get(item.variant_id) : null
    if (item.variant_id && !variant) throw new Error("Une taille ou une couleur sélectionnée n'est plus disponible")

    const quantity = Math.max(1, Math.min(99, Number(item.quantity) || 1))
    const unitPrice = round2(variant?.price ?? product.effective_price ?? product.price)

    // Availability is checked before anything is written.
    if (variant && (variant.stock ?? 0) < quantity) {
      throw new Error(`${product.name} (${variant.size} / ${variant.color}) est en rupture de stock`)
    }
    if (!variant && (product.stock ?? 0) < quantity) {
      throw new Error(`${product.name} est en rupture de stock`)
    }

    const image =
      (product.product_images || [])
        .slice()
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.url || null

    lines.push({
      product_id: product.id,
      variant_id: variant?.id || null,
      product_name: product.name,
      color: variant?.color || null,
      size: variant?.size || null,
      image_url: image,
      quantity,
      unit_price: unitPrice,
      total_price: round2(unitPrice * quantity),
    })
  }

  const subtotal = round2(lines.reduce((sum, line) => sum + line.total_price, 0))

  let discount = 0
  let appliedCoupon = null
  if (couponCode) {
    const result = await validateCoupon(couponCode, subtotal)
    if (result.valid) {
      discount = result.discount
      appliedCoupon = result.coupon
    }
  }

  // Delivery cost is resolved from `shipping_zones`, never taken from the
  // request. A browser-supplied shipping figure is attacker-controlled input.
  const { data: zoneRows } = await client
    .from('shipping_zones')
    .select('name, delivery_price, is_active')
  const shipping = round2(resolveShippingCost(governorate, zoneRows || []))
  const total = round2(subtotal - discount + shipping)

  const { data: orderNumber, error: numberError } = await client.rpc('next_order_number')
  if (numberError) throw numberError

  const { data: order, error: orderError } = await client
    .from('orders')
    .insert({
      user_id: userId,
      order_number: orderNumber,
      customer_name: name,
      customer_email: String(customerEmail || '').trim().toLowerCase(),
      phone: phoneNumber,
      governorate,
      city,
      address,
      postal_code: postalCode ? String(postalCode).trim() : null,
      additional_info: additionalInfo,
      subtotal,
      shipping_cost: shipping,
      discount,
      total,
      payment_method: paymentMethod,
      payment_status: 'pending',
      order_status: 'pending',
      coupon_code: appliedCoupon?.code || null,
    })
    .select()
    .single()
  if (orderError) throw orderError

  const { error: itemsError } = await client.from('order_items').insert(
    lines.map((line) => ({ ...line, order_id: order.id })),
  )
  if (itemsError) {
    // Do not leave a headless order behind if its lines failed to write.
    await client.from('orders').delete().eq('id', order.id)
    throw itemsError
  }

  // Everything past this point is best effort: the order exists, so a failure
  // here must not be reported to the customer as a failed checkout.
  //
  // Stock is moved by the `commit_order_stock` RPC, which reads this order's own
  // items and is idempotent. The anon role has no update policy on
  // products/product_variants, so there is no browser-side alternative.
  const { error: stockError } = await client.rpc('commit_order_stock', { p_order_id: order.id })
  if (stockError) {
    console.error('commit_order_stock failed', stockError)
  }

  if (appliedCoupon) {
    await client.from('coupon_redemptions').insert({
      coupon_id: appliedCoupon.id,
      user_id: userId,
      order_id: order.id,
    })
  }

  await client.rpc('increment_product_sales', {
    product_ids: lines.map((line) => line.product_id),
    amounts: lines.map((line) => line.quantity),
  })

  return { ...order, items: lines }
}

/* ------------------------------------------------------------------ */
/* Homepage, newsletter signup, settings                               */
/* ------------------------------------------------------------------ */

export async function getHomepageSections() {
  if (!supabase) return {}
  const { data, error } = await supabase.from('homepage_sections').select('*').eq('is_active', true)
  if (error) return {}
  const map = {}
  ;(data || []).forEach((section) => {
    map[section.section_key] = section
  })
  return map
}

export async function subscribeNewsletter(email) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase
    .from('newsletter_subscribers')
    .insert({ email: String(email).trim().toLowerCase() })
  if (error) throw error
  return true
}

const EMPTY_SETTINGS = { about_text: '', contact_email: '', contact_phone: '', social: {} }

/**
 * Public read of the site settings. `admin_settings` has a `using (true)`
 * select policy, so the storefront can read the same social links the admin
 * edits in Paramètres without signing in.
 */
export async function getSettings() {
  if (!supabase) return { ...EMPTY_SETTINGS }
  const { data, error } = await supabase.from('admin_settings').select('*').maybeSingle()
  return error || !data ? { ...EMPTY_SETTINGS } : data
}

export async function adminGetSettings() {
  if (!supabase) return { ...EMPTY_SETTINGS }
  const { data, error } = await supabase.from('admin_settings').select('*').maybeSingle()
  return error || !data ? { ...EMPTY_SETTINGS } : data
}

export async function adminSaveSettings(payload) {
  if (!supabase) return
  const { data } = await supabase.from('admin_settings').select('id').maybeSingle()
  if (data) {
    await supabase.from('admin_settings').update(payload).eq('id', data.id)
  } else {
    await supabase.from('admin_settings').insert(payload)
  }
}

/* ------------------------------------------------------------------ */
/* Admin: products                                                     */
/* ------------------------------------------------------------------ */

const PRODUCT_SELECT_LOCAL = `
  *,
  category:categories ( id, name, slug ),
  collection:collections ( id, name, slug, image_url ),
  product_images ( id, product_id, url, alt, position ),
  product_variants ( id, product_id, color, size, sku, stock, price )
`

export async function adminListProducts({ search = '', includeUnpublished = true } = {}) {
  if (!supabase) return []
  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT_LOCAL)
    .order('created_at', { ascending: false })
  if (!includeUnpublished) query = query.eq('is_published', true)
  if (search) query = query.ilike('name', `%${search}%`)
  const { data, error } = await query
  return error ? [] : (data || []).map(mapProductRow)
}

export async function adminGetProduct(id) {
  if (!supabase || !id) return null
  const { data, error } = await supabase.from('products').select(PRODUCT_SELECT_LOCAL).eq('id', id).maybeSingle()
  if (error) return null
  return mapProductRow(data)
}

const PRODUCT_COLUMNS = [
  'name',
  'slug',
  'description',
  'price',
  'sale_price',
  'discount_percent',
  'category_id',
  'collection_id',
  'sku',
  'stock',
  'materials',
  'care_instructions',
  'size_chart',
  'is_featured',
  'is_published',
]

function productPayload(input) {
  const payload = {}
  for (const column of PRODUCT_COLUMNS) {
    if (input[column] !== undefined) payload[column] = input[column]
  }
  payload.slug = input.slug || slugify(input.name)
  payload.price = Number(input.price) || 0
  payload.sale_price = input.sale_price === '' || input.sale_price == null ? null : Number(input.sale_price)
  if (input.discount_percent !== undefined) {
    payload.discount_percent = Math.min(100, Math.max(0, Number(input.discount_percent) || 0))
  }
  if (input.stock !== undefined) payload.stock = Math.max(0, Number(input.stock) || 0)
  if (payload.category_id === '') payload.category_id = null
  if (payload.collection_id === '') payload.collection_id = null
  return payload
}

export async function adminCreateProduct(input) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase
    .from('products')
    .insert(productPayload(input))
    .select('id')
    .single()
  if (error) throw error
  await adminSaveVariants(data.id, input.variants)
  await adminSaveImages(data.id, input.images)
  return data.id
}

export async function adminUpdateProduct(id, input) {
  if (!supabase || !id) return
  const { data: existing, error: fetchError } = await supabase
    .from('products')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (fetchError) throw fetchError
  if (!existing) {
    throw new Error("Ce produit n'existe plus. Retournez à la liste, rechargez la page, puis réessayez.")
  }
  const { data: updated, error } = await supabase
    .from('products')
    .update(productPayload(input))
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (!updated) {
    throw new Error("Ce produit n'existe plus. Retournez à la liste, rechargez la page, puis réessayez.")
  }
  if (input.variants) await adminSaveVariants(id, input.variants)
  if (input.images) await adminSaveImages(id, input.images)
}

export async function adminDeleteProduct(id) {
  if (!supabase || !id) return
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

/** Replaces the variant set, keeping rows whose id still matches a submitted one. */
async function adminSaveVariants(productId, variants) {
  if (!supabase || !Array.isArray(variants)) return
  const rows = variants
    .filter((variant) => variant && variant.size)
    .map((variant) => {
      const row = {
        product_id: productId,
        color: variant.color || 'Black',
        size: variant.size,
        sku: variant.sku || null,
        stock: Math.max(0, Number(variant.stock) || 0),
        price: variant.price === '' || variant.price == null ? null : Number(variant.price),
      }
      if (variant.id) row.id = variant.id
      return row
    })
  if (!rows.length) return

  const keepIds = rows.map((row) => row.id).filter(Boolean)
  const { data: existing } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId)
  const removeIds = (existing || []).map((row) => row.id).filter((id) => !keepIds.includes(id))
  if (removeIds.length) await supabase.from('product_variants').delete().in('id', removeIds)

  const { error } = await supabase.from('product_variants').upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

async function adminSaveImages(productId, images) {
  if (!supabase || !Array.isArray(images)) return
  const rows = images
    .filter((image) => image && image.url)
    .map((image, index) => {
      const row = {
        product_id: productId,
        url: image.url,
        alt: image.alt || '',
        position: image.position ?? index,
      }
      if (image.id) row.id = image.id
      return row
    })
  if (!rows.length) return

  const keepIds = rows.map((row) => row.id).filter(Boolean)
  const { data: existing } = await supabase
    .from('product_images')
    .select('id')
    .eq('product_id', productId)
  const removeIds = (existing || []).map((row) => row.id).filter((id) => !keepIds.includes(id))
  if (removeIds.length) await supabase.from('product_images').delete().in('id', removeIds)

  const { error } = await supabase.from('product_images').upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

export async function uploadProductImage(file) {
  if (!supabase) throw new Error('Supabase is not configured')
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  return uploadToStorage('product-images', path, file)
}

export async function deleteProductImage(id) {
  if (!supabase || !id) return
  await supabase.from('product_images').delete().eq('id', id)
}

/**
 * Uploads a banner/section/collection image chosen from the device into the
 * public `site-assets` bucket and returns its public URL. The bucket is limited
 * to 5 MB and to jpeg/png/webp/svg by the storage policies in schema.sql.
 */
export async function uploadSiteAsset(file) {
  if (!supabase) throw new Error('Supabase is not configured')
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `site/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  return uploadToStorage('site-assets', path, file)
}

/* ------------------------------------------------------------------ */
/* Admin: categories, collections, coupons, shipping                   */
/* ------------------------------------------------------------------ */

export async function adminListCategories() {
  if (!supabase) return []
  const { data, error } = await supabase.from('categories').select('*').order('name')
  return error ? [] : data || []
}

export async function adminCreateCategory(payload) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase
    .from('categories')
    .insert({ ...payload, slug: payload.slug || slugify(payload.name) })
  if (error) throw error
}

export async function adminUpdateCategory(id, payload) {
  if (!supabase) return
  const { error } = await supabase.from('categories').update(payload).eq('id', id)
  if (error) throw error
}

export async function adminDeleteCategory(id) {
  if (!supabase) return
  await supabase.from('categories').delete().eq('id', id)
}

export async function adminListCollections() {
  if (!supabase) return []
  const { data, error } = await supabase.from('collections').select('*').order('created_at', { ascending: false })
  return error ? [] : data || []
}

export async function adminCreateCollection(payload) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase
    .from('collections')
    .insert({ ...payload, slug: payload.slug || slugify(payload.name) })
  if (error) throw error
}

export async function adminUpdateCollection(id, payload) {
  if (!supabase) return
  const { error } = await supabase.from('collections').update(payload).eq('id', id)
  if (error) throw error
}

export async function adminDeleteCollection(id) {
  if (!supabase) return
  await supabase.from('collections').delete().eq('id', id)
}

export async function adminListCoupons() {
  if (!supabase) return []
  const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
  return error ? [] : data || []
}

export async function adminCreateCoupon(payload) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase
    .from('coupons')
    .insert({ ...payload, code: String(payload.code || '').trim().toUpperCase(), value: Number(payload.value) || 0 })
  if (error) throw error
}

export async function adminUpdateCoupon(id, payload) {
  if (!supabase) return
  const { error } = await supabase.from('coupons').update(payload).eq('id', id)
  if (error) throw error
}

export async function adminDeleteCoupon(id) {
  if (!supabase) return
  await supabase.from('coupons').delete().eq('id', id)
}

export async function adminSaveShippingZone(id, payload) {
  if (!supabase) return
  if (id) {
    const { error } = await supabase
      .from('shipping_zones')
      .update({
        name: payload.name,
        delivery_price: Number(payload.delivery_price) || 0,
        estimated_days: Number(payload.estimated_days) || 0,
        is_active: Boolean(payload.is_active),
      })
      .eq('id', id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('shipping_zones').insert({
      name: payload.name,
      delivery_price: Number(payload.delivery_price) || 0,
      estimated_days: Number(payload.estimated_days) || 0,
      is_active: Boolean(payload.is_active),
    })
    if (error) throw error
  }
}

export async function adminDeleteShippingZone(id) {
  if (!supabase) return
  await supabase.from('shipping_zones').delete().eq('id', id)
}

/* ------------------------------------------------------------------ */
/* Admin: orders                                                       */
/* ------------------------------------------------------------------ */

export async function adminListOrders({ status = 'all', search = '', limit = 200 } = {}) {
  if (!supabase) return []
  let query = supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (status && status !== 'all') query = query.eq('order_status', status)
  if (search) {
    const term = String(search).trim().replace(/[%,()]/g, ' ')
    query = query.or(
      `order_number.ilike.%${term}%,customer_name.ilike.%${term}%,customer_email.ilike.%${term}%,phone.ilike.%${term}%`,
    )
  }
  const { data, error } = await query
  return error ? [] : data || []
}

export async function adminGetOrder(id) {
  if (!supabase || !id) return null
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) return null
  return data
}

const ORDER_STATUSES_ALLOWED = [
  'pending',
  'confirmed',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
]

export async function adminUpdateOrder(id, { order_status, payment_status } = {}) {
  if (!supabase || !id) return
  const patch = {}
  if (order_status) {
    if (!ORDER_STATUSES_ALLOWED.includes(order_status)) throw new Error('Statut de commande inconnu')
    patch.order_status = order_status
  }
  if (payment_status) {
    if (!['pending', 'paid', 'failed', 'refunded'].includes(payment_status)) {
      throw new Error('Statut de paiement inconnu')
    }
    patch.payment_status = payment_status
  }
  if (!Object.keys(patch).length) return
  const { error } = await supabase.from('orders').update(patch).eq('id', id)
  if (error) throw error
}

/**
 * Deletes every order. Order items and coupon redemptions are removed by the
 * database (on delete cascade), so this is a full reset of the order history.
 */
export async function adminClearAllOrders() {
  if (!supabase) return { error: 'Supabase is not configured' }
  const { error } = await supabase.from('orders').delete().gt('created_at', '1970-01-01')
  if (error) return { error: error.message }
  return { ok: true }
}

/** Headline numbers for the dashboard. */
export async function adminGetStats() {
  const empty = {
    orders: 0,
    revenue: 0,
    costs: 0,
    netIncome: 0,
    pending: 0,
    products: 0,
    outOfStock: 0,
    lowStock: 0,
    customers: 0,
  }
  if (!supabase) return empty

  const [orders, items, products, customers] = await Promise.all([
    supabase.from('orders').select('id, total, order_status, payment_status'),
    supabase
      .from('order_items')
      .select('quantity, orders!inner(order_status, payment_status), products(price)'),
    supabase.from('products').select('id, stock'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ])

  const rows = orders.data || []
  const revenue = rows
    .filter((row) => row.order_status !== 'cancelled' && row.payment_status !== 'refunded')
    .reduce((sum, row) => sum + (Number(row.total) || 0), 0)

  // Net income: the selling prices customers actually paid, minus what it
  // cost you to make every unit sold. Cost comes from products.price (the
  // internal cost price); deleted products contribute zero.
  const itemRows = (items.data || []).filter(
    (item) =>
      item.orders &&
      item.orders.order_status !== 'cancelled' &&
      item.orders.payment_status !== 'refunded',
  )
  const costs = itemRows.reduce(
    (sum, item) => sum + (Number(item.products?.price) || 0) * Number(item.quantity || 0),
    0,
  )

  const productRows = products.data || []

  return {
    orders: rows.length,
    revenue: round2(revenue),
    costs: round2(costs),
    netIncome: round2(revenue - costs),
    pending: rows.filter((row) => row.order_status === 'pending').length,
    products: productRows.length,
    outOfStock: productRows.filter((row) => (row.stock ?? 0) <= 0).length,
    lowStock: productRows.filter((row) => (row.stock ?? 0) > 0 && (row.stock ?? 0) <= 5).length,
    customers: customers.count || 0,
  }
}

/* ------------------------------------------------------------------ */
/* Admin: profiles, homepage                                           */
/* ------------------------------------------------------------------ */

export async function adminListCustomers() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  return error ? [] : data || []
}

export async function adminUpdateCustomerRole(id, role) {
  if (!supabase) return
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
  if (error) throw error
}

export async function adminSaveHomepage(sections) {
  if (!supabase) return
  for (const section of sections) {
    const { error } = await supabase
      .from('homepage_sections')
      .upsert(section, { onConflict: 'section_key' })
    if (error) throw error
  }
}

/* ------------------------------------------------------------------ */
/* Storage helpers                                                     */
/* ------------------------------------------------------------------ */

export { deleteFromStorage }
