import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useCart } from '../contexts/CartContext'
import { useWishlist } from '../contexts/WishlistContext'
import { useUI } from '../contexts/UIContext'
import { formatPrice, getProductImage, getProductHoverImage, swatchFor, colorName } from '../lib/utils'
import { IconHeart, IconHeartFilled, IconEye, IconBag, IconArrowRight, IconX, IconCheck } from './icons'

function ProductImage({ product, className, eager = false }) {
  const main = getProductImage(product)
  const hover = getProductHoverImage(product)
  const [err, setErr] = useState(false)
  const src = err ? '/images/placeholder-product-front.svg' : main
  return (
    <div className={`relative aspect-[4/5] overflow-hidden bg-neutral-100 ${className}`}>
      <img
        src={src}
        alt={product.name}
        loading={eager ? 'eager' : 'lazy'}
        onError={() => setErr(true)}
        className="pcard-img pcard-img-primary h-full w-full object-cover"
      />
      {hover && (
        <img
          src={hover}
          alt=""
          aria-hidden="true"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
          className="pcard-img pcard-img-hover absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  )
}

export default function ProductCard({ product, eager = false, className = '' }) {
  const { add, openCart } = useCart()
  const { has, toggle } = useWishlist()
  const { openQuickView, toast } = useUI()
  const [adding, setAdding] = useState(false)

  const displayPrice = Number(product.effective_price ?? product.sale_price ?? product.price ?? 0)
  const stocked = (product.stock ?? 0) > 0
  const colors = [...new Set((product.variants || []).map((v) => v.color).filter(Boolean))].slice(0, 5)

  const defaultVariant = (product.variants || []).find((v) => v.stock > 0) || (product.variants || [])[0]

  const handleAdd = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!stocked) return
    setAdding(true)
    try {
      await add(product, {
        color: defaultVariant?.color,
        size: defaultVariant?.size,
        variantId: defaultVariant?.id,
      })
      toast(`${product.name} a été ajouté au panier`)
      openCart()
    } finally {
      setAdding(false)
    }
  }

  const handleWishlist = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggle(product.id)
  }

  const wished = has(product.id)

  return (
    <div className={`pcard group ${className}`}>
      <Link
        to={`/product/${product.slug}`}
        className="block"
        aria-label={product.name}
      >
        <div className="relative">
          <ProductImage product={product} eager={eager} />

          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {!stocked && (
              <span className="bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-black border border-black">
                Rupture de stock
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleWishlist}
            aria-label={wished ? `Retirer ${product.name} des souhaits` : `Ajouter ${product.name} aux souhaits`}
            aria-pressed={wished}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center border border-black/10 bg-white/90 transition-all duration-300 hover:bg-black hover:text-white"
          >
            {wished ? (
              <IconHeartFilled className="h-4 w-4" />
            ) : (
              <IconHeart className="h-4 w-4" />
            )}
          </button>

          {/* Quick actions */}
          <div className="absolute inset-x-0 bottom-0 flex translate-y-full flex-col transition-transform duration-300 group-hover:translate-y-0 max-lg:hidden">
            <div className="flex border-t border-black/10 bg-white">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); openQuickView(product) }}
                className="flex flex-1 items-center justify-center gap-2 py-3 text-[10px] font-semibold uppercase tracking-widest text-black transition-colors hover:bg-neutral-100"
              >
                <IconEye className="h-3.5 w-3.5" /> Aperçu rapide
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!stocked || adding}
                className="flex flex-1 items-center justify-center gap-2 border-l border-black/10 bg-black py-3 text-[10px] font-semibold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800"
              >
                <IconBag className="h-3.5 w-3.5" /> {adding ? 'Ajout…' : 'Ajouter au panier'}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-3">
          <h3 className="text-[13px] font-semibold text-black transition-colors group-hover:opacity-60">
            {product.name}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[13px] font-bold text-black">{formatPrice(displayPrice)}</span>
          </div>
          {colors.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              {colors.map((c) => (
                <span
                  key={c}
                  title={colorName(c)}
                  className="h-3 w-3 rounded-full border border-black/15"
                  style={{ background: swatchFor(c) }}
                />
              ))}
            </div>
          )}
        </div>
      </Link>
    </div>
  )
}

export function QuickViewModal() {
  const { quickViewProduct, closeQuickView, toast } = useUI()
  const { add, openCart } = useCart()
  const { has, toggle } = useWishlist()

  const [color, setColor] = useState(null)
  const [size, setSize] = useState(null)
  const [qty, setQty] = useState(1)

  const product = quickViewProduct
  useEffect(() => {
    setColor(null)
    setSize(null)
    setQty(1)
  }, [product?.id])

  if (!quickViewProduct) return null

  const colors = [...new Set((product.variants || []).map((v) => v.color).filter(Boolean))]
  const activeColor = color || colors[0] || null
  const sizes = [
    ...new Set(
      (product.variants || [])
        .filter((v) => (v.color || null) === activeColor)
        .map((v) => v.size)
        .filter(Boolean),
    ),
  ]
  const activeSize = size || (sizes.includes('M') ? 'M' : sizes[0])
  const variant =
    (product.variants || []).find((v) => (v.color || null) === activeColor && (v.size || null) === activeSize) ||
    (product.variants || []).find((v) => (v.color || null) === activeColor) ||
    (product.variants || [])[0]

  const displayPrice = Number(product.effective_price ?? product.sale_price ?? product.price ?? 0)
  const stocked = (variant?.stock ?? product.stock ?? 0) > 0

  const handleAdd = async () => {
    if (!stocked || !variant) return
    await add(product, { color: variant.color, size: variant.size, variantId: variant.id, quantity: qty })
    toast(`${product.name} a été ajouté au panier`)
    closeQuickView()
    openCart()
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
      onClick={closeQuickView}
    >
      <div
        className="grid max-h-[92vh] w-full max-w-3xl grid-cols-1 overflow-y-auto bg-white md:grid-cols-2 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[4/5] bg-neutral-100 md:aspect-auto">
          <ProductImage product={product} eager />
          <button
            type="button"
            onClick={closeQuickView}
            aria-label="Fermer l'aperçu rapide"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center border border-black/10 bg-white transition-colors hover:bg-black hover:text-white"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col p-6 lg:p-8">
          <h3 className="text-xl font-extrabold uppercase tracking-wide text-black">{product.name}</h3>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-lg font-bold text-black">{formatPrice(displayPrice)}</span>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="label">Couleur</span>
              <span className="text-xs font-medium text-neutral-500">{colorName(activeColor)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setColor(c); setSize(null) }}
                  className={`h-7 w-7 rounded-full border ${activeColor === c ? 'border-black ring-1 ring-black' : 'border-black/15'}`}
                  style={{ background: swatchFor(c) }}
                  title={colorName(c)}
                  aria-label={`Couleur ${colorName(c)}`}
                />
              ))}
            </div>
          </div>

          {sizes.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="label">Taille</span>
                <span className="text-xs text-neutral-500">{variant?.sku || ''}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const v = (product.variants || []).find(
                    (x) => (x.color || null) === activeColor && (x.size || null) === s,
                  )
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={!v?.stock}
                      onClick={() => setSize(s)}
                      className={`border px-4 py-2 text-xs font-semibold uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                        activeSize === s ? 'border-black bg-black text-white' : 'border-black/20 hover:border-black'
                      }`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center border border-black/20">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2.5 text-sm" aria-label="Diminuer la quantité">−</button>
              <span className="w-10 text-center text-sm font-semibold">{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)} className="px-3 py-2.5 text-sm" aria-label="Augmenter la quantité">+</button>
            </div>
            <span className={`text-xs font-semibold uppercase tracking-widest ${stocked ? 'text-green-700' : 'text-red-600'}`}>
              {stocked ? (variant?.stock <= 5 ? 'Stock faible' : 'En stock') : 'Rupture de stock'}
            </span>
          </div>

          <button type="button" onClick={handleAdd} disabled={!stocked} className="btn-primary mt-6 w-full">
            {stocked ? 'Ajouter au panier' : 'Rupture de stock'}
          </button>

          <button type="button" onClick={() => { toggle(product.id) }} className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-neutral-600 hover:text-black">
            {has(product.id) ? <IconCheck className="h-3.5 w-3.5" /> : <IconHeart className="h-3.5 w-3.5" />}
            {has(product.id) ? 'Dans les souhaits' : 'Ajouter aux souhaits'}
          </button>

          <Link
            to={`/product/${product.slug}`}
            onClick={closeQuickView}
            className="mt-4 flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-black underline underline-offset-4 hover:opacity-60"
          >
            Voir les détails <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}