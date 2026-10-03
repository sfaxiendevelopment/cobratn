import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { getProductsByIds, validateCoupon } from '../lib/api'

const CartContext = createContext(null)
const GUEST_KEY = 'cobra_guest_cart'
const COUPON_KEY = 'cobra_coupon'

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

function readGuestCart() {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(GUEST_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.product_id) : []
  } catch {
    return []
  }
}

function writeGuestCart(items) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(items))
    window.dispatchEvent(new Event('storage'))
  } catch {
    /* private mode / quota — the cart simply will not persist */
  }
}

function readCoupon() {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(window.localStorage.getItem(COUPON_KEY) || 'null')
  } catch {
    return null
  }
}

function writeCoupon(coupon) {
  if (typeof window === 'undefined') return
  try {
    if (coupon) window.localStorage.setItem(COUPON_KEY, JSON.stringify(coupon))
    else window.localStorage.removeItem(COUPON_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Turns stored `{ product_id, variant_id, quantity }` references into full
 * lines. Products that have since been unpublished or deleted are dropped so
 * the shopper never sees a broken line and is not charged for it.
 */
async function hydrate(references) {
  if (!references.length) return []
  const products = await getProductsByIds([...new Set(references.map((r) => r.product_id))])
  const byId = new Map(products.map((product) => [product.id, product]))

  return references
    .map((reference) => {
      const product = byId.get(reference.product_id)
      if (!product || !product.is_published) return null
      const variant = reference.variant_id
        ? (product.variants || []).find((v) => v.id === reference.variant_id) || null
        : null
      return {
        // A guest line has no database row, so it gets a stable synthetic id
        // derived from the variant (or the product when it has no variants).
        id: reference.id || `guest:${reference.variant_id || reference.product_id}`,
        product_id: reference.product_id,
        variant_id: variant?.id || null,
        quantity: reference.quantity || 1,
        product,
        variant,
        unit_price: variant?.price ?? product.effective_price ?? 0,
        color: variant?.color || null,
        size: variant?.size || null,
        image_url: product.images?.[0]?.url || null,
      }
    })
    .filter(Boolean)
}

/**
 * The storefront has no customer accounts, so the cart lives entirely in
 * localStorage and is never written to the database. An order is created from
 * these references at checkout.
 */
export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [coupon, setCoupon] = useState(() => readCoupon())
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [lastAdded, setLastAdded] = useState(null)

  const refresh = useCallback(async () => {
    const stored = readGuestCart()
    try {
      setItems(await hydrate(stored))
    } catch (err) {
      console.error('cart hydration failed', err)
      setItems([])
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const add = useCallback(
    async (product, { color, size, variantId, quantity = 1 } = {}) => {
      if (!product?.id) throw new Error('Ce produit n’est pas disponible.')

      // A product with no variant rows still needs an addable option.
      const hasVariants = (product.variants || []).some((v) => v.id)
      let targetVariantId = variantId || null

      if (hasVariants) {
        if (!targetVariantId) {
          throw new Error(
            color || size ? 'Cette taille ou cette couleur n’est pas disponible.' : 'Veuillez choisir une taille.',
          )
        }
        const chosen = (product.variants || []).find((v) => v.id === targetVariantId)
        if (!chosen) throw new Error('Cette taille ou cette couleur n’est pas disponible.')
        if (!chosen.available) throw new Error('Cette taille ou cette couleur est épuisée.')
      }

      const amount = Math.max(1, Number(quantity) || 1)

      const current = readGuestCart()
      const key = targetVariantId || product.id
      const existing = current.find(
        (item) => (item.variant_id || item.product_id) === key,
      )
      if (existing) {
        existing.quantity = (existing.quantity || 0) + amount
      } else {
        current.push({ product_id: product.id, variant_id: targetVariantId, quantity: amount })
      }
      writeGuestCart(current)
      setItems(await hydrate(current))

      const variant = (product.variants || []).find((v) => v.id === targetVariantId)
      setLastAdded({
        product,
        color: color || variant?.color,
        size: size || variant?.size,
        quantity: amount,
      })
    },
    [],
  )

  const updateQuantity = useCallback(async (itemId, quantity) => {
    const value = Math.max(1, Number(quantity) || 1)
    setBusy(true)
    try {
      const current = readGuestCart()
      const target = current.find((item) => `guest:${item.variant_id || item.product_id}` === itemId)
      if (target) {
        target.quantity = value
        writeGuestCart(current)
        setItems(await hydrate(current))
      }
    } finally {
      setBusy(false)
    }
  }, [])

  const remove = useCallback(async (itemId) => {
    setBusy(true)
    try {
      const current = readGuestCart()
      const next = current.filter((item) => `guest:${item.variant_id || item.product_id}` !== itemId)
      writeGuestCart(next)
      setItems(await hydrate(next))
    } finally {
      setBusy(false)
    }
  }, [])

  const clear = useCallback(async () => {
    writeGuestCart([])
    writeCoupon(null)
    setCoupon(null)
    setItems([])
    setLastAdded(null)
  }, [])

  const applyCode = useCallback(
    async (code) => {
      const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
      const result = await validateCoupon(code, subtotal)
      if (result.valid) {
        const next = { code: result.coupon.code, type: result.coupon.type, value: Number(result.coupon.value) }
        writeCoupon(next)
        setCoupon(next)
      }
      return result
    },
    [items],
  )

  const clearCodes = useCallback(() => {
    writeCoupon(null)
    setCoupon(null)
  }, [])

  const count = useMemo(() => items.reduce((sum, item) => sum + (item.quantity || 0), 0), [items])
  const subtotal = useMemo(
    () => round2(items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)),
    [items],
  )

  // Re-validate on load so an expired or over-limit code never survives a reload.
  useEffect(() => {
    if (!coupon || !items.length) return
    let cancelled = false
      validateCoupon(coupon.code, subtotal).then((result) => {
      if (cancelled) return
      if (!result.valid) clearCodes()
    })
    return () => {
      cancelled = true
    }
  }, [coupon, items.length, subtotal, clearCodes])

  const discount = useMemo(() => {
    if (!coupon || !subtotal) return 0
    const raw = coupon.type === 'percent' ? (subtotal * Number(coupon.value)) / 100 : Number(coupon.value)
    return round2(Math.min(raw, subtotal))
  }, [coupon, subtotal])

  const totals = useMemo(
    () => ({
      subtotal,
      discount,
      tax: 0,
      duty: 0,
      // Delivery is added at checkout, where the governorate is known.
      shipping: 0,
      total: round2(subtotal - discount),
      currencyCode: 'TND',
    }),
    [subtotal, discount],
  )

  const value = useMemo(
    () => ({
      items,
      count,
      subtotal,
      discount,
      total: totals.total,
      totals,
      coupon,
      discountCodes: coupon ? [coupon.code] : [],
      loaded,
      open,
      busy,
      lastAdded,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
      setLastAdded,
      add,
      updateQuantity,
      remove,
      clear,
      refresh,
      applyCode,
      clearCodes,
    }),
    [
      items, count, subtotal, discount, totals, coupon, loaded, open, busy,
      lastAdded, add, updateQuantity, remove, clear, refresh, applyCode, clearCodes,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  return useContext(CartContext)
}
