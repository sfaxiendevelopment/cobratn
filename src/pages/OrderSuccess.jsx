import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { formatPrice, formatDateTime } from '../lib/utils'
import { IconCheck, IconMail, IconTruck, IconHome } from '../components/icons'

/**
 * Order confirmation.
 *
 * The order is already committed to the database, so this screen renders a
 * session-storage snapshot written by Checkout. It is a receipt for what the
 * shopper just submitted — not a live order record, and not tracking.
 */
export default function OrderSuccess() {
  useDocumentMeta('Commande confirmée — COBRA TN')
  const [order, setOrder] = useState(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('cobra_last_order')
      if (raw) setOrder(JSON.parse(raw))
    } catch {
      /* private mode, or a hand-typed URL */
    }
  }, [])

  if (!order) {
    return (
      <div className="container-page pb-24 pt-32">
        <div className="mx-auto max-w-md text-center">
          <IconCheck className="mx-auto h-12 w-12 text-black" />
          <h1 className="mt-6 section-title">Commande confirmée</h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            Merci pour votre commande. Nous vous appellerons sous peu pour la confirmer.
          </p>
          <Link to="/shop" className="btn-primary mt-8">
            Continuer mes achats
          </Link>
        </div>
      </div>
    )
  }

  const items = order.items || []

  return (
    <div className="container-page pb-32 pt-24 lg:pt-32">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <IconCheck className="mx-auto h-12 w-12 text-black" />
          <p className="label mt-6 text-neutral-400">Merci</p>
          <h1 className="section-title">Votre commande est confirmée</h1>
          <p className="mt-4 text-sm leading-relaxed text-neutral-600">
            Nous avons bien reçu votre commande. Nous vous appellerons au numéro indiqué pour confirmer les
            détails avant l’envoi.
          </p>

          <div className="mt-8 border border-black bg-black px-6 py-5 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-widest2 opacity-70">
              Numéro de commande
            </p>
            <p className="mt-1 text-2xl font-extrabold tracking-wide">{order.order_number}</p>
          </div>
        </div>

        {/* Reassure the shopper that what was recorded is what they typed. */}
        <section className="mt-8 border border-black/15 p-6">
          <h2 className="text-xs font-extrabold uppercase tracking-wide3">Vos informations</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Nom et prénom</dt>
              <dd className="font-semibold">{order.customer_name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Téléphone</dt>
              <dd className="font-semibold">{order.phone}</dd>
            </div>
            {order.customer_email && (
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Email</dt>
                <dd className="truncate font-semibold">{order.customer_email}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Livraison à</dt>
              <dd className="text-right font-semibold">
                {order.address}, {order.city}, {order.governorate}
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-6 border border-black/15 p-6">
          <h2 className="text-xs font-extrabold uppercase tracking-wide3">
            {items.length} article{items.length === 1 ? '' : 's'}
          </h2>
          <ul className="mt-4 divide-y divide-black/5">
            {items.map((item, index) => (
              <li key={`${item.product_id || 'x'}-${item.variant_id || index}`} className="flex gap-4 py-4">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.product_name || ''}
                    className="h-20 w-16 shrink-0 border border-black/10 object-cover"
                  />
                )}
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-semibold uppercase">{item.product_name}</p>
                  <p className="mt-0.5 text-neutral-500">
                    {[item.color, item.size].filter(Boolean).join(' / ') || 'Taille unique'}
                  </p>
                  <p className="mt-1 text-neutral-500">Quantité : {item.quantity}</p>
                </div>
                <p className="shrink-0 text-xs font-bold">{formatPrice(item.total_price)}</p>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2 border-t border-black/10 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Sous-total</dt>
              <dd className="font-semibold">{formatPrice(order.subtotal)}</dd>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-red-600">
                <dt>Remise{order.coupon_code ? ` (${order.coupon_code})` : ''}</dt>
                <dd className="font-semibold">− {formatPrice(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-neutral-500">Livraison</dt>
              <dd className="font-semibold">
                {Number(order.shipping_cost) > 0 ? formatPrice(order.shipping_cost) : 'Offerte'}
              </dd>
            </div>
            <div className="flex justify-between border-t border-black/10 pt-3 text-base">
              <dt className="font-extrabold uppercase">Total à la livraison</dt>
              <dd className="font-extrabold">{formatPrice(order.total)}</dd>
            </div>
          </dl>

          <p className="mt-4 text-[11px] text-neutral-500">
            Payez en espèces au livreur à la réception de votre commande.
          </p>
        </section>

        {order.created_at && (
          <p className="mt-4 text-center text-[11px] text-neutral-500">
            Passée le {formatDateTime(order.created_at)}
          </p>
        )}

        <ul className="mt-8 space-y-3 border-y border-black/10 py-6 text-[11px] text-neutral-600">
          <li className="flex items-center gap-3">
            <IconMail className="h-4 w-4 shrink-0" />
            {order.emailed
              ? 'Une copie de cette commande a été envoyée par email à la boutique.'
              : 'Conservez votre numéro de commande — la boutique vous confirmera par téléphone.'}
          </li>
          <li className="flex items-center gap-3">
            <IconTruck className="h-4 w-4 shrink-0" /> Livraison partout en Tunisie, généralement sous 1 à 5 jours.
          </li>
        </ul>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/shop" className="btn-primary">
            <IconHome className="h-4 w-4" />
            Continuer mes achats
          </Link>
        </div>
      </div>
    </div>
  )
}
