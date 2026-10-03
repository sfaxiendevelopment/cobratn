import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { getProductsByIds } from '../lib/api'

const WishlistContext = createContext(null)
const GUEST_KEY = 'cobra_wishlist'

function readGuest() {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(GUEST_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return []
  }
}

function writeGuest(ids) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(ids))
  } catch {
    /* private mode / quota — the list simply will not persist */
  }
}

/**
 * The storefront has no customer accounts, so the wishlist is a plain list of
 * product UUIDs in localStorage. It is per-browser and per-device: clearing
 * site data empties it, and it does not follow the customer to another device.
 */
export function WishlistProvider({ children }) {
  const [ids, setIds] = useState([])
  const [products, setProducts] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    const stored = readGuest()
    setIds(stored)

    // Products that have since been unpublished or deleted are dropped, so the
    // shopper never sees a broken card.
    getProductsByIds(stored)
      .then((rows) => {
        if (cancelled) return
        setProducts(rows.filter((p) => p.is_published))
      })
      .catch((err) => console.error('wishlist load failed', err))
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const has = useCallback((id) => ids.includes(id), [ids])

  /** `product` may be a full product or just an id. Returns the new state. */
  const toggle = useCallback(
    async (product) => {
      const id = product?.id ?? product
      if (!id) return false

      if (ids.includes(id)) {
        writeGuest(readGuest().filter((entry) => entry !== id))
        setIds((current) => current.filter((entry) => entry !== id))
        setProducts((current) => current.filter((entry) => entry.id !== id))
        return false
      }

      writeGuest([...readGuest(), id])
      setIds((current) => [...current, id])
      if (product?.variants) setProducts((current) => [product, ...current])
      else {
        try {
          const rows = await getProductsByIds([id])
          setProducts((current) => [...rows, ...current])
        } catch (err) {
          console.error('wishlist add failed', err)
        }
      }
      return true
    },
    [ids],
  )

  const value = useMemo(() => ({ ids, products, count: ids.length, has, toggle, loaded }), [ids, products, has, toggle, loaded])

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  return useContext(WishlistContext)
}
