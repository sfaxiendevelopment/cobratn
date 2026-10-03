import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { AdminPage, AdminCard, Badge, AdminButton, Field, adminInput } from './AdminUI'
import { adminGetOrder, adminUpdateOrder, sendOrderNotification } from '../lib/api'
import { useUI } from '../contexts/UIContext'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import {
  formatPrice,
  formatDateTime,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  orderStatusLabel,
  paymentStatusLabel,
  getErrorMessage,
} from '../lib/utils'
import { IconChevronLeft, IconCheck } from '../components/icons'
import { OrderSkeleton } from '../components/LoadingSkeleton'
import { ErrorState } from '../components/ErrorState'

function orderStatusTone(status) {
  if (status === 'delivered' || status === 'shipped') return 'green'
  if (status === 'cancelled' || status === 'returned') return 'red'
  if (status === 'preparing' || status === 'confirmed') return 'black'
  return 'amber'
}

function paymentStatusTone(status) {
  if (status === 'paid') return 'green'
  if (status === 'failed' || status === 'refunded') return 'red'
  return 'amber'
}

function paymentMethodLabel(value) {
  return PAYMENT_METHODS.find((entry) => entry.value === value)?.label || value
}

export default function OrderDetail() {
  useDocumentMeta('Détail de la commande — COBRA TN Admin')
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useUI()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailNote, setEmailNote] = useState('')
  const [orderStatus, setOrderStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setNotFound(false)
    try {
      const row = await adminGetOrder(id)
      if (!row) {
        setNotFound(true)
        return
      }
      setOrder(row)
      setOrderStatus(row.order_status)
      setPaymentStatus(row.payment_status)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!id) {
      setNotFound(true)
      setLoading(false)
      return
    }
    load()
  }, [id, load])

  const save = async (patch) => {
    setSaving(true)
    setError('')
    try {
      await adminUpdateOrder(id, patch)
      const fresh = await adminGetOrder(id)
      if (fresh) {
        setOrder(fresh)
        setOrderStatus(fresh.order_status)
        setPaymentStatus(fresh.payment_status)
      }
      toast('Commande mise à jour')
    } catch (err) {
      const message = getErrorMessage(err)
      setError(message)
      toast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!order) return
    await save({ order_status: orderStatus, payment_status: paymentStatus })
  }

  const dirty = order && (orderStatus !== order.order_status || paymentStatus !== order.payment_status)

  const resendEmail = async () => {
    if (!order || sendingEmail) return
    setSendingEmail(true)
    setEmailNote('')
    try {
      const result = await sendOrderNotification(order)
      if (result?.sent) {
        setEmailNote(
          `Email envoyé à ${result.to || order.customer_email}${result.transport ? ` via ${result.transport}` : ''}.`,
        )
      } else {
        setEmailNote(`Envoi impossible : ${result?.error || 'erreur inconnue'}`)
      }
    } catch (err) {
      setEmailNote(`Envoi impossible : ${getErrorMessage(err)}`)
    } finally {
      setSendingEmail(false)
    }
  }

  const items = order?.items || []
  const itemCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)

  return (
    <AdminPage
      eyebrow="Ventes"
      title={order?.order_number || 'Détail de la commande'}
      subtitle={order ? `Passée le ${formatDateTime(order.created_at)}` : undefined}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {order && (
            <AdminButton
              variant="ghost"
              onClick={resendEmail}
              disabled={sendingEmail}
              title="Renvoyer l'email de confirmation de la commande à l'adresse de la boutique"
            >
              {sendingEmail ? 'Envoi…' : "Renvoyer l'email"}
            </AdminButton>
          )}
          <AdminButton variant="ghost" onClick={() => navigate('/admin/orders')}>
            <IconChevronLeft className="h-4 w-4" /> Toutes les commandes
          </AdminButton>
        </div>
      }
    >
      {error && (
        <p className="mb-4 border border-red-600/40 bg-red-600/5 p-3 text-xs text-red-300" role="alert">
          {error}
        </p>
      )}

      {emailNote && (
        <p
          className={`mb-4 border p-3 text-xs ${
            emailNote.startsWith('Email envoyé')
              ? 'border-green-600/40 bg-green-600/5 text-green-300'
              : 'border-amber-600/40 bg-amber-600/5 text-amber-300'
          }`}
        >
          {emailNote}
        </p>
      )}

      {loading ? (
        <OrderSkeleton />
      ) : notFound || !order ? (
        <ErrorState message="Commande introuvable." onRetry={() => navigate('/admin/orders')} />
      ) : (
        <div className="space-y-6">
          {/* The name and phone are what the store calls the customer with, so
              they get the loudest treatment on the page. */}
          <section className="border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest2 text-neutral-500">Appeler ce client</p>
            <p className="mt-2 text-2xl font-black uppercase tracking-wide text-white">{order.customer_name}</p>
            <a
              href={`tel:${String(order.phone || '').replace(/[^\d+]/g, '')}`}
              className="mt-2 block text-3xl font-black tracking-wide text-white underline decoration-neutral-700 underline-offset-4 hover:decoration-white"
            >
              {order.phone}
            </a>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone={orderStatusTone(order.order_status)}>{orderStatusLabel(order.order_status)}</Badge>
              <Badge tone={paymentStatusTone(order.payment_status)}>{paymentStatusLabel(order.payment_status)}</Badge>
              <Badge tone="neutral">{paymentMethodLabel(order.payment_method)}</Badge>
              <Badge tone="neutral">
                {itemCount} article{itemCount === 1 ? '' : 's'}
              </Badge>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-6">
              <AdminCard title="Articles">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-neutral-800 text-[9px] uppercase tracking-widest text-neutral-500">
                        <th className="py-2 pr-3 font-bold">Produit</th>
                        <th className="py-2 pr-3 font-bold">Taille</th>
                        <th className="py-2 pr-3 font-bold">Couleur</th>
                        <th className="py-2 pr-3 font-bold">Qté</th>
                        <th className="py-2 pr-3 font-bold">PU</th>
                        <th className="py-2 font-bold">Total ligne</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-xs text-neutral-500">
                            Cette commande ne contient aucun article.
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item.id || `${item.product_name}-${item.size}-${item.color}`}>
                            <td className="py-3 pr-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={item.image_url || '/images/placeholder-product-front.svg'}
                                  alt=""
                                  className="h-12 w-10 shrink-0 border border-neutral-800 object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = '/images/placeholder-product-front.svg'
                                  }}
                                />
                                <p className="text-xs font-bold text-white">{item.product_name}</p>
                              </div>
                            </td>
                            <td className="py-3 pr-3 text-xs text-neutral-400">{item.size || '—'}</td>
                            <td className="py-3 pr-3 text-xs text-neutral-400">{item.color || '—'}</td>
                            <td className="py-3 pr-3 text-xs text-neutral-400">{item.quantity}</td>
                            <td className="py-3 pr-3 text-xs text-neutral-400">{formatPrice(item.unit_price)}</td>
                            <td className="py-3 text-xs font-bold text-white">{formatPrice(item.total_price)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </AdminCard>

              <AdminCard title="Totaux">
                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-neutral-400">Sous-total</dt>
                    <dd className="font-bold text-white">{formatPrice(order.subtotal)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-neutral-400">Remise{order.coupon_code ? ` (${order.coupon_code})` : ''}</dt>
                    <dd className="font-bold text-red-400">− {formatPrice(order.discount)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-neutral-400">Livraison</dt>
                    <dd className="font-bold text-white">{formatPrice(order.shipping_cost)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-neutral-800 pt-3">
                    <dt className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Total à payer</dt>
                    <dd className="text-xl font-black text-white">{formatPrice(order.total)}</dd>
                  </div>
                </dl>
                {order.coupon_code && (
                  <p className="mt-4 text-[11px] text-neutral-500">
                    Le code promo <span className="font-bold text-white">{order.coupon_code}</span> a été appliqué à cette commande.
                  </p>
                )}
              </AdminCard>
            </div>

            <div className="space-y-6">
              <AdminCard title="Mettre à jour le statut">
                <form onSubmit={submit} className="space-y-4">
                  <Field label="Statut de la commande">
                    <select
                      className={adminInput}
                      value={orderStatus}
                      onChange={(e) => setOrderStatus(e.target.value)}
                    >
                      {ORDER_STATUSES.map((entry) => (
                        <option key={entry.value} value={entry.value}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Statut du paiement">
                    <select
                      className={adminInput}
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                    >
                      {PAYMENT_STATUSES.map((entry) => (
                        <option key={entry.value} value={entry.value}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="flex gap-2">
                    <AdminButton type="submit" disabled={saving || !dirty}>
                      {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
                    </AdminButton>
                    {dirty && (
                      <AdminButton
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setOrderStatus(order.order_status)
                          setPaymentStatus(order.payment_status)
                        }}
                      >
                        Réinitialiser
                      </AdminButton>
                    )}
                  </div>
                </form>
              </AdminCard>

              <AdminCard title="Client">
                <div className="space-y-3 text-xs">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Nom</p>
                    <p className="mt-1 text-base font-bold text-white">{order.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Téléphone</p>
                    <a href={`tel:${String(order.phone || '').replace(/[^\d+]/g, '')}`} className="mt-1 block text-lg font-bold text-white hover:underline">
                      {order.phone}
                    </a>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Email</p>
                    {order.customer_email ? (
                      <a href={`mailto:${order.customer_email}`} className="mt-1 block text-neutral-300 hover:underline">
                        {order.customer_email}
                      </a>
                    ) : (
                      <p className="mt-1 text-neutral-500">Non renseigné</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Paiement</p>
                    <p className="mt-1 text-neutral-300">
                      {paymentMethodLabel(order.payment_method)} · {paymentStatusLabel(order.payment_status)}
                    </p>
                  </div>
                </div>
              </AdminCard>

              <AdminCard title="Adresse de livraison">
                <address className="text-xs not-italic leading-relaxed text-neutral-300">
                  {order.address}
                  <br />
                  {order.city}, {order.governorate}
                  {order.postal_code ? ` ${order.postal_code}` : ''}
                  <br />
                  {order.country}
                </address>
                {order.additional_info && (
                  <p className="mt-4 border border-neutral-800 p-3 text-[11px] text-neutral-400">
                    <span className="font-bold uppercase tracking-widest text-neutral-500">Remarque</span>
                    <br />
                    {order.additional_info}
                  </p>
                )}
              </AdminCard>

              {order.user_id && (
                <Link
                  to="/admin/customers"
                  className="flex items-center justify-between gap-3 border border-neutral-800 bg-neutral-900 px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-300 hover:border-neutral-500 hover:text-white"
                >
                  Voir les comptes
                  <IconCheck className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  )
}
