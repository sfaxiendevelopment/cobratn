import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useCart } from '../contexts/CartContext'
import { formatPrice, getProductImage } from '../lib/utils'
import { IconX, IconPlus, IconMinus, IconBag } from './icons'

export default function CartDrawer() {
  const { open, closeCart, items, updateQuantity, remove, subtotal } = useCart()
  const navigate = useNavigate()

  useEffect(() => {
    document.body.classList.toggle('lock-scroll', open)
    return () => document.body.classList.remove('lock-scroll')
  }, [open])

  if (!open) return null

  const go = (path) => {
    closeCart()
    navigate(path)
  }

  return (
    <div className="fixed inset-0 z-[100]">
<button
        type="button"
        aria-label="Fermer le panier"
        className="absolute inset-0 h-full w-full bg-black/60 animate-fade-in"
        onClick={closeCart}
      />

      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-label="Panier"
      >
        <header className="flex items-center justify-between border-b border-black/10 px-6 py-5">
          <h2 className="text-sm font-extrabold uppercase tracking-wide3">
            Votre panier <span className="ml-1 text-neutral-400">({items.reduce((s, i) => s + i.quantity, 0)})</span>
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Fermer le panier"
            className="flex h-9 w-9 items-center justify-center border border-black/10 transition-colors hover:bg-black hover:text-white"
          >
            <IconX className="h-4 w-4" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <IconBag className="h-10 w-10 text-neutral-300" />
            <p className="text-base font-extrabold uppercase tracking-wide3">Votre panier est vide</p>
            <p className="text-xs text-neutral-500">Découvrez notre dernière collection.</p>
            <button type="button" className="btn-primary mt-2" onClick={() => go('/shop')}>
              Voir la boutique
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-black/5 overflow-y-auto">
              {items.map((item) => {
                const price = Number(item.variant?.price || item.product?.effective_price || item.unit_price || 0)
                const key = item.id || `${item.product_id}::${item.variant_id}`
                return (
                  <li key={key} className="flex gap-4 px-6 py-5">
                    <Link to={`/product/${item.product?.slug}`} onClick={closeCart} className="block h-28 w-24 shrink-0 overflow-hidden bg-neutral-100">
                      <img
                        src={getProductImage(item.product)}
                        alt={item.product?.name || ''}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(e) => (e.currentTarget.src = '/images/placeholder-product-front.svg')}
                      />
                    </Link>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/product/${item.product?.slug}`} onClick={closeCart} className="text-xs font-semibold uppercase hover:opacity-60">
                          {item.product?.name || item.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => remove(key)}
                          aria-label={`Retirer ${item.product?.name}`}
                          className="text-neutral-400 transition-colors hover:text-black"
                        >
                          <IconX className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-neutral-500">
                        {item.variant?.color || item.color || ''} {item.variant?.size || item.size ? ` / ${item.variant?.size || item.size}` : ''}
                      </p>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="flex items-center border border-black/15">
                          <button type="button" onClick={() => updateQuantity(key, item.quantity - 1)} aria-label="Diminuer la quantité" className="px-2 py-1.5 text-xs hover:bg-neutral-100">
                            <IconMinus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-semibold">{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(key, item.quantity + 1)} aria-label="Augmenter la quantité" className="px-2 py-1.5 text-xs hover:bg-neutral-100">
                            <IconPlus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-sm font-bold">{formatPrice(price * item.quantity)}</span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            <footer className="space-y-4 border-t border-black/10 bg-neutral-50 px-6 py-6">
              <div className="flex justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide3">Sous-total</span>
                <span className="text-sm font-extrabold">{formatPrice(subtotal)}</span>
              </div>
              <p className="text-[11px] text-neutral-500">Frais de livraison calculés à la caisse.</p>
              <button type="button" className="btn-primary w-full" onClick={() => go('/checkout')}>
                Passer la commande
              </button>
              <button type="button" className="btn-secondary w-full" onClick={() => go('/cart')}>
                Voir le panier
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}