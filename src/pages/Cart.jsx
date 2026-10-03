import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { formatPrice } from '../lib/utils'
import { IconPlus, IconMinus, IconX, IconBag, IconArrowRight, IconCheck } from '../components/icons'
import { EmptyState } from '../components/ErrorState'

const PLACEHOLDER = '/images/placeholder-product-front.svg'

export default function Cart() {
  useDocumentMeta('Votre panier — COBRA TN')
  const {
    items,
    updateQuantity,
    remove,
    subtotal,
    discount,
    totals,
    coupon,
    applyCode,
    clearCodes,
    loaded,
    busy,
  } = useCart()
  const navigate = useNavigate()

  const [code, setCode] = useState('')
  const [codeBusy, setCodeBusy] = useState(false)
  const [codeError, setCodeError] = useState('')

  const submitCode = async (event) => {
    event.preventDefault()
    const value = code.trim()
    if (!value) {
      setCodeError('Saisissez un code promo')
      return
    }

    setCodeBusy(true)
    setCodeError('')
    try {
      const result = await applyCode(value)
      if (result?.valid) {
        setCode('')
      } else {
        setCodeError(result?.error || 'Ce code promo n’est pas valide')
      }
    } catch (err) {
      setCodeError(err?.message || 'Impossible de vérifier ce code. Veuillez réessayer.')
    } finally {
      setCodeBusy(false)
    }
  }

  if (!loaded) return <div className="container-page pb-24 pt-32"><EmptyState title="Chargement du panier…" /></div>

  if (items.length === 0) {
    return (
      <div className="container-page pb-24 pt-32">
        <div className="mx-auto max-w-md">
          <div className="text-center">
            <IconBag className="mx-auto h-12 w-12 text-neutral-200" />
            <h1 className="mt-6 section-title">Votre panier est vide</h1>
            <p className="mt-3 text-xs text-neutral-500">Découvrez notre dernière collection.</p>
            <button type="button" onClick={() => navigate('/shop')} className="btn-primary mt-8">
              Acheter maintenant →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-page pb-24 pt-24 lg:pb-32 lg:pt-32">
      <div className="flex items-end justify-between border-b border-black/10 pb-6">
        <div>
          <p className="label text-neutral-400">Votre sélection</p>
          <h1 className="section-title">Panier</h1>
        </div>
        <p className="text-xs text-neutral-500">{items.length} article{items.length === 1 ? '' : 's'}</p>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        {/* Lines */}
        <ul className="divide-y divide-black/10">
          {items.map((item) => {
            const price = Number(item.unit_price ?? item.product?.effective_price ?? 0)
            const key = item.id || `${item.product_id}::${item.variant_id}`
            const image = item.image_url || item.product?.images?.[0]?.url || PLACEHOLDER
            const name = item.product?.name || 'Produit'
            const details = [item.color, item.size].filter(Boolean).join(' · ')
            return (
              <li key={key} className="flex gap-4 py-6 sm:gap-6">
                <Link to={`/product/${item.product?.slug}`} className="block h-36 w-28 shrink-0 overflow-hidden border border-black/10 bg-neutral-100 sm:h-40 sm:w-32">
                  <img src={image} alt={name} loading="lazy" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.src = PLACEHOLDER)} />
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/product/${item.product?.slug}`} className="text-sm font-bold uppercase tracking-wide hover:opacity-60">
                        {name}
                      </Link>
                      {details && <p className="mt-1 text-xs text-neutral-500">{details}</p>}
                      <p className="mt-1 text-xs font-semibold">{formatPrice(price)} l’unité</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(key)}
                      disabled={busy}
                      aria-label={`Retirer ${name}`}
                      className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center border border-black/10 text-neutral-500 transition-colors hover:border-black hover:text-black disabled:opacity-40"
                    >
                      <IconX className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <div className="flex items-center border border-black/15">
                      <button
                        type="button"
                        onClick={() => updateQuantity(key, item.quantity - 1)}
                        disabled={busy || item.quantity <= 1}
                         aria-label="Diminuer la quantité"
                        className="px-3 py-2 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <IconMinus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-10 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(key, item.quantity + 1)}
                        disabled={busy}
                        aria-label="Augmenter la quantité"
                        className="px-3 py-2 hover:bg-neutral-100 disabled:opacity-40"
                      >
                        <IconPlus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-base font-extrabold">{formatPrice(price * item.quantity)}</span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        {/* Summary */}
        <aside className="h-fit border border-black/10 bg-neutral-50 p-6 lg:sticky lg:top-28">
          <h2 className="text-xs font-extrabold uppercase tracking-wide3">Récapitulatif de la commande</h2>

          {/* Promo code */}
          {coupon ? (
            <div className="mt-5 flex items-center justify-between gap-3 bg-black p-3 text-white">
              <span className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <IconCheck className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{coupon.code}</span>
              </span>
              <button type="button" onClick={clearCodes} className="shrink-0 text-[10px] underline underline-offset-4 hover:opacity-60">
                Retirer
              </button>
            </div>
          ) : (
            <form onSubmit={submitCode} className="mt-5">
              <label className="label" htmlFor="promo">Code promo</label>
              <div className="flex">
                <input
                  id="promo"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value)
                    if (codeError) setCodeError('')
                  }}
                  placeholder="Saisissez le code"
                  disabled={codeBusy}
                  className="input border-r-0"
                />
                <button type="submit" disabled={codeBusy} className="h-12 shrink-0 border border-black bg-black px-5 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50">
                  {codeBusy ? '…' : 'Appliquer'}
                </button>
              </div>
              {codeError && <p className="mt-2 text-[11px] font-semibold text-red-600">{codeError}</p>}
            </form>
          )}

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Sous-total</dt>
              <dd className="font-bold">{formatPrice(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-red-600">
                <dt>Remise{coupon ? ` (${coupon.code})` : ''}</dt>
                <dd className="font-bold">− {formatPrice(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-neutral-500">Livraison</dt>
              <dd className="font-bold">Calculée à la commande</dd>
            </div>
            <div className="flex justify-between border-t border-black/10 pt-3 text-base">
              <dt className="font-extrabold uppercase">Total</dt>
              <dd className="font-extrabold">{formatPrice(totals.total)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">
            Livraison non incluse. Le montant exact de la livraison est calculé lors de la commande, selon le
            gouvernorat que vous choisissez.
          </p>

          <button type="button" onClick={() => navigate('/checkout')} className="btn-primary mt-6 w-full">
            Passer la commande
          </button>
          <Link to="/shop" className="mt-4 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-black">
            Continuer mes achats <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        </aside>
      </div>
    </div>
  )
}
