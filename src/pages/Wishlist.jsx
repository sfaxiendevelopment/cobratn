import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWishlist } from '../contexts/WishlistContext'
import { useCart } from '../contexts/CartContext'
import { useUI } from '../contexts/UIContext'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { getProductImage, formatPrice } from '../lib/utils'
import { IconHeart, IconHeartFilled, IconBag, IconArrowRight } from '../components/icons'
import { EmptyState } from '../components/ErrorState'

export default function Wishlist() {
  useDocumentMeta('Liste de souhaits — COBRA TN')
  const navigate = useNavigate()
  const { products, toggle, loaded } = useWishlist()
  const { add, openCart } = useCart()
  const { toast } = useUI()
  const [busyId, setBusyId] = useState(null)

  const items = products || []

  const handleAdd = async (item) => {
    setBusyId(item.id)
    try {
      const availableVariant = (item.variants || []).find((variant) => variant.available)
      await add(item, { variantId: availableVariant?.id ?? null, quantity: 1 })
      toast(`${item.name} ajouté au panier`)
      openCart()
    } catch (err) {
      toast(err?.message || 'Cette taille ou cette couleur n’est pas disponible.')
    } finally {
      setBusyId(null)
    }
  }

  if (!loaded) return <div className="container-page pb-24 pt-32"><EmptyState title="Chargement de la liste de souhaits…" /></div>

  if (items.length === 0) {
    return (
      <div className="container-page pb-24 pt-32">
        <div className="mx-auto max-w-md text-center">
          <IconHeart className="mx-auto h-12 w-12 text-neutral-200" />
          <h1 className="mt-6 section-title">Rien d’enregistré pour l’instant</h1>
          <p className="mt-3 text-xs text-neutral-500">Touchez le cœur sur un produit pour le garder ici.</p>
          <Link to="/shop" className="btn-primary mt-8 inline-flex">Découvrir la boutique →</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-page pb-24 pt-24 lg:pb-32 lg:pt-32">
      <div className="flex items-end justify-between border-b border-black/10 pb-6">
        <div>
          <p className="label text-neutral-400">Gardés pour plus tard</p>
          <h1 className="section-title">Votre liste de souhaits</h1>
        </div>
        <p className="text-xs text-neutral-500">{items.length} article{items.length === 1 ? '' : 's'}</p>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((product) => {
          const availableVariant = (product.variants || []).find((variant) => variant.available) || null
          const soldOut = !availableVariant
          const price = Number(product.effective_price ?? product.price ?? 0)
          const busy = busyId === product.id
          return (
            <article key={product.id} className="group relative">
              <Link to={`/product/${product.slug}`} className="block">
                <div className="relative aspect-[3/4] overflow-hidden border border-black/10 bg-neutral-100">
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => (e.currentTarget.src = '/images/placeholder-product-front.svg')}
                  />
                  <span className="absolute left-3 top-3 bg-black px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-white">
                    {soldOut ? 'Épuisé' : 'Nouveau'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggle(product.id)
                    }}
                    aria-label={`Retirer ${product.name} de la liste de souhaits`}
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center border border-black/10 bg-white text-black transition-transform hover:scale-110"
                  >
                    <IconHeartFilled className="h-4 w-4" />
                  </button>
                </div>
                <div className="pt-3">
                  <h3 className="truncate text-sm font-bold uppercase">{product.name}</h3>
                  <p className="mt-1 text-xs font-semibold">
                    <span>{formatPrice(price)}</span>
                  </p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => handleAdd(product)}
                disabled={soldOut || busy}
                className="mt-3 flex w-full items-center justify-center gap-2 border border-black py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <IconBag className="h-4 w-4" /> {soldOut ? 'Épuisé' : busy ? 'Ajout…' : 'Ajouter au panier'}
              </button>
            </article>
          )
        })}
      </div>

      <div className="mt-12 flex justify-center">
        <button type="button" onClick={() => navigate('/shop')} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-black">
          Découvrir plus de pièces <IconArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
