import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import {
  createOrder,
  getShippingZones,
  resolveShippingCost,
  isSupabaseConfigured,
  sendOrderNotification,
} from '../lib/api'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { formatPrice, getErrorMessage, TN_GOVERNORATES } from '../lib/utils'
import { EmptyState } from '../components/ErrorState'
import { IconTruck, IconBox, IconCheck, IconMail } from '../components/icons'

const FIELD = 'input h-12 w-full'

/**
 * Checkout.
 *
 * There is no payment gateway and no customer account: the order is placed
 * against cash on delivery, so the customer's name, phone number, street
 * address and governorate are mandatory — they are the only way the store can
 * confirm and deliver it.
 *
 * Prices are re-read from the database by `createOrder`, so the figures shown
 * here are for display only and cannot be manipulated from the browser.
 */
export default function Checkout() {
  useDocumentMeta('Commande — COBRA TN')
  const navigate = useNavigate()

  const {
    items,
    subtotal,
    discount,
    coupon,
    loaded,
    updateQuantity,
    remove,
    clear,
  } = useCart()

  const [zones, setZones] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [touched, setTouched] = useState({})
  const submittedOnce = useRef(false)

  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    governorate: '',
    city: '',
    address: '',
    postalCode: '',
  })

  useEffect(() => {
    if (loaded && items.length === 0) navigate('/cart', { replace: true })
  }, [loaded, items.length, navigate])

  useEffect(() => {
    let cancelled = false
    getShippingZones()
      .then((rows) => {
        if (!cancelled) setZones(rows)
      })
      .catch((err) => console.error('shipping zones failed', err))
    return () => {
      cancelled = true
    }
  }, [])

  const shipping = useMemo(
    () => resolveShippingCost(form.governorate, zones),
    [form.governorate, zones],
  )
  const total = useMemo(
    () => Math.max(0, Math.round((subtotal - discount + shipping) * 100) / 100),
    [subtotal, discount, shipping],
  )

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  /* ---------------------------------------------------------------- */
  /* Validation                                                        */
  /* ---------------------------------------------------------------- */

  const errors = useMemo(() => {
    const next = {}
    const name = form.customerName.trim()
    const phone = form.phone.trim()

    if (!name) next.customerName = 'Le nom complet est obligatoire'
    else if (name.length < 3) next.customerName = 'Saisissez votre nom complet'
    else if (name.length > 120) next.customerName = 'Le nom est trop long'

    if (!phone) next.phone = 'Le numéro de téléphone est obligatoire'
    else if (!/^[+()\-\s\d]{6,24}$/.test(phone)) next.phone = 'Saisissez un numéro de téléphone valide'

    if (!form.governorate) next.governorate = 'Sélectionnez votre gouvernorat'
    if (!form.city.trim()) next.city = 'La ville est obligatoire'
    if (!form.address.trim()) next.address = 'L’adresse est obligatoire'

    return next
  }, [form])

  const showError = (key) => (touched[key] || submittedOnce.current) ? errors[key] || '' : ''

  const isValid = Object.keys(errors).length === 0

  const markAllTouched = () => {
    submittedOnce.current = true
    setTouched({
      customerName: true,
      phone: true,
      governorate: true,
      city: true,
      address: true,
      postalCode: true,
    })
  }

  /* ---------------------------------------------------------------- */
  /* Submit                                                            */
  /* ---------------------------------------------------------------- */

  const handleSubmit = async (event) => {
    event.preventDefault()
    markAllTouched()
    setFormError('')

    if (!isValid) {
      setFormError('Veuillez corriger les champs en rouge.')
      return
    }
    if (!items.length) return

    setSubmitting(true)
    try {
      const order = await createOrder({
        userId: null,
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        governorate: form.governorate,
        city: form.city.trim(),
        address: form.address.trim(),
        postalCode: form.postalCode.trim() || null,
        items: items.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
        })),
        couponCode: coupon?.code || null,
      })

      await clear()

      // The order is committed, so a failed email is never shown as a failure.
      // Its real outcome is recorded so the confirmation screen stays honest.
      let emailed = false
      try {
        const result = await sendOrderNotification(order)
        emailed = Boolean(result?.sent)
      } catch (err) {
        console.error('order email failed', err)
      }

      /* Display-only snapshot for the confirmation screen. */
      try {
        sessionStorage.setItem(
          'cobra_last_order',
          JSON.stringify({ ...order, emailed, at: new Date().toISOString() }),
        )
      } catch {
        /* private mode */
      }

      navigate('/order-success', { replace: true })
    } catch (err) {
      setFormError(getErrorMessage(err))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="container-page pb-24 pt-32">
        <EmptyState
          title="Commande indisponible"
          description="Supabase n’est pas encore connecté. Ajoutez l’URL de votre projet et la clé anon dans le fichier .env."
          action="Retour à la boutique"
          onAction={() => navigate('/shop')}
        />
      </div>
    )
  }

  if (!loaded) {
    return (
      <div className="container-page pb-24 pt-32">
        <EmptyState title="Chargement de la commande…" />
      </div>
    )
  }

  return (
    <div className="container-page pb-32 pt-24 lg:pt-32">
      <p className="label text-neutral-400">Paiement à la livraison</p>
      <h1 className="section-title">Confirmez votre commande</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-600">
        Payez le livreur à la réception de votre commande. Renseignez votre nom, votre numéro de téléphone, votre
        adresse et votre gouvernorat : nous vous appellerons sur ce numéro pour confirmer avant l’envoi.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          {/* ---------------- Contact ---------------- */}
          <section className="border border-black/15 p-6">
            <h2 className="text-base font-extrabold uppercase tracking-wide">Contact</h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="checkout-name">
                  Nom et prénom <span className="text-red-600">*</span>
                </label>
                <input
                  id="checkout-name"
                  name="name"
                  autoComplete="name"
                  value={form.customerName}
                  onChange={(e) => setField('customerName', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, customerName: true }))}
                  aria-invalid={Boolean(showError('customerName'))}
                  aria-describedby={showError('customerName') ? 'err-name' : undefined}
                  className={`${FIELD} ${showError('customerName') ? 'border-red-500' : ''}`}
                  placeholder="ex. Mohamed Ben Ali"
                  required
                />
                {showError('customerName') && (
                  <p id="err-name" className="mt-1.5 text-[11px] text-red-600">
                    {showError('customerName')}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="label" htmlFor="checkout-phone">
                  Numéro de téléphone <span className="text-red-600">*</span>
                </label>
                <input
                  id="checkout-phone"
                  name="tel"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                  aria-invalid={Boolean(showError('phone'))}
                  aria-describedby={showError('phone') ? 'err-phone' : undefined}
                  className={`${FIELD} ${showError('phone') ? 'border-red-500' : ''}`}
                  placeholder="ex. +216 20 123 456"
                  required
                />
                {showError('phone') && (
                  <p id="err-phone" className="mt-1.5 text-[11px] text-red-600">
                    {showError('phone')}
                  </p>
                )}
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-neutral-500">
                  <IconMail className="h-3 w-3" /> Nous appelons ce numéro pour confirmer votre commande.
                </p>
              </div>
            </div>
          </section>

          {/* ---------------- Delivery ---------------- */}
          <section className="mt-6 border border-black/15 p-6">
            <h2 className="text-base font-extrabold uppercase tracking-wide">Adresse de livraison</h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="checkout-governorate">
                  Gouvernorat <span className="text-red-600">*</span>
                </label>
                <select
                  id="checkout-governorate"
                  name="governorate"
                  value={form.governorate}
                  onChange={(e) => setField('governorate', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, governorate: true }))}
                  aria-invalid={Boolean(showError('governorate'))}
                  className={`${FIELD} ${showError('governorate') ? 'border-red-500' : ''}`}
                  required
                >
                  <option value="">Sélectionnez un gouvernorat</option>
                  {TN_GOVERNORATES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                {showError('governorate') && (
                  <p className="mt-1.5 text-[11px] text-red-600">{showError('governorate')}</p>
                )}
              </div>

              <div>
                <label className="label" htmlFor="checkout-city">
                  Ville <span className="text-red-600">*</span>
                </label>
                <input
                  id="checkout-city"
                  name="address-level2"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(e) => setField('city', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, city: true }))}
                  aria-invalid={Boolean(showError('city'))}
                  className={`${FIELD} ${showError('city') ? 'border-red-500' : ''}`}
                  placeholder="ex. Sousse"
                  required
                />
                {showError('city') && (
                  <p className="mt-1.5 text-[11px] text-red-600">{showError('city')}</p>
                )}
              </div>

              <div>
                <label className="label" htmlFor="checkout-postal">
                  Code postal
                </label>
                <input
                  id="checkout-postal"
                  name="postal-code"
                  autoComplete="postal-code"
                  value={form.postalCode}
                  onChange={(e) => setField('postalCode', e.target.value)}
                  className={FIELD}
                  placeholder="Facultatif"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label" htmlFor="checkout-address">
                  Rue et adresse <span className="text-red-600">*</span>
                </label>
                <input
                  id="checkout-address"
                  name="street-address"
                  autoComplete="street-address"
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, address: true }))}
                  aria-invalid={Boolean(showError('address'))}
                  className={`${FIELD} ${showError('address') ? 'border-red-500' : ''}`}
                  placeholder="Rue, immeuble, étage"
                  required
                />
                {showError('address') && (
                  <p className="mt-1.5 text-[11px] text-red-600">{showError('address')}</p>
                )}
              </div>
            </div>
          </section>

          {/* ---------------- Items ---------------- */}
          <section className="mt-6">
            <h2 className="text-xs font-extrabold uppercase tracking-wide3">
              Vos articles ({items.length})
            </h2>
            <ul className="mt-4 divide-y divide-black/5 border border-black/10">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 p-4">
                  <img
                    src={item.image_url || item.product?.images?.[0]?.url}
                    alt={item.product?.name || ''}
                    className="h-16 w-14 shrink-0 border border-black/10 object-cover"
                  />
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="truncate font-semibold uppercase">{item.product?.name}</p>
                    <p className="mt-0.5 text-neutral-500">
                      {[item.color, item.size].filter(Boolean).join(' / ') || 'Taille unique'}
                    </p>
                    <p className="mt-1 font-bold">{formatPrice(item.unit_price)}</p>
                  </div>
                  <div className="flex shrink-0 items-center border border-black/15">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label="Diminuer la quantité"
                      className="px-3 py-1.5 hover:bg-neutral-100"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-xs font-semibold">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      aria-label="Augmenter la quantité"
                      className="px-3 py-1.5 hover:bg-neutral-100"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 hover:text-black"
                  >
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ---------------- Summary ---------------- */}
        <aside className="h-fit border border-black/10 bg-neutral-50 p-6 lg:sticky lg:top-28">
          <h2 className="text-xs font-extrabold uppercase tracking-wide3">Récapitulatif de la commande</h2>

          {coupon && (
            <div className="mt-5 flex items-center justify-between bg-black p-3 text-white">
              <span className="text-xs font-bold uppercase tracking-widest">{coupon.code}</span>
              <span className="text-[10px] opacity-80">appliqué</span>
            </div>
          )}

          <dl className="mt-5 space-y-3 border-t border-black/10 pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Sous-total</dt>
              <dd className="font-bold">{formatPrice(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-red-600">
                <dt>Remise</dt>
                <dd className="font-bold">− {formatPrice(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-neutral-500">Livraison</dt>
              <dd className="font-semibold">
                {shipping > 0 ? formatPrice(shipping) : 'Offerte'}
              </dd>
            </div>
            <div className="flex justify-between border-t border-black/10 pt-3 text-base">
              <dt className="font-extrabold uppercase">Total</dt>
              <dd className="font-extrabold">{formatPrice(total)}</dd>
            </div>
          </dl>

          {formError && (
            <div
              role="alert"
              className="mt-5 border border-red-300 bg-red-50 p-3 text-[11px] text-red-700"
            >
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !items.length}
            className="btn-primary mt-6 w-full disabled:opacity-40"
          >
            {submitting ? 'Confirmation…' : 'Confirmer et continuer'}
          </button>

          <p className="mt-3 text-center text-[11px] leading-relaxed text-neutral-500">
            En confirmant, vous acceptez que le paiement s’effectue en espèces auprès du livreur, à la livraison.
          </p>

          <ul className="mt-6 space-y-3 border-t border-black/10 pt-5 text-[11px] text-neutral-600">
            <li className="flex items-center gap-3">
              <IconCheck className="h-4 w-4 shrink-0" /> Votre commande est enregistrée dès que vous confirmez.
            </li>
            <li className="flex items-center gap-3">
              <IconMail className="h-4 w-4 shrink-0" /> Nous appelons votre numéro pour confirmer avant l’envoi.
            </li>
            <li className="flex items-center gap-3">
              <IconTruck className="h-4 w-4 shrink-0" /> Livraison partout en Tunisie, sous 1 à 5 jours.
            </li>
            <li className="flex items-center gap-3">
              <IconBox className="h-4 w-4 shrink-0" /> Paiement à la livraison. Aucune donnée de carte n’est demandée.
            </li>
          </ul>

          <Link to="/cart" className="btn-secondary mt-6 w-full">
            Retour au panier
          </Link>
        </aside>
      </form>
    </div>
  )
}
