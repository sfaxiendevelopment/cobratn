import { useEffect, useState } from 'react'
import { AdminPage, AdminCard, Badge, Toggle, AdminButton, Field, adminInput, EmptyRow } from './AdminUI'
import {
  adminListCoupons,
  adminCreateCoupon,
  adminUpdateCoupon,
  adminDeleteCoupon,
} from '../lib/api'
import { useUI } from '../contexts/UIContext'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { formatPrice, formatDate, getErrorMessage } from '../lib/utils'
import { IconX, IconCheck, IconPlus } from '../components/icons'
import { TableSkeleton } from '../components/LoadingSkeleton'

/** Basket used for the live "what does this code save" preview. */
const EXAMPLE_BASKET = 200

const EMPTY_FORM = {
  code: '',
  type: 'percent',
  value: '',
  min_order: '',
  max_uses: '',
  expires_at: '',
  is_active: true,
}

/** A fresh form, with the expiry pre-filled to today + 3 days (editable). */
const freshForm = () => {
  const date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  return {
    ...EMPTY_FORM,
    expires_at: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`,
  }
}

const toInputDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function isExpired(coupon) {
  return Boolean(coupon.expires_at) && new Date(coupon.expires_at) < new Date()
}

function describe(coupon) {
  const value = Number(coupon.value) || 0
  if (coupon.type === 'percent') return `-${value} %`
  return `-${formatPrice(value)}`
}

export default function Coupons() {
  useDocumentMeta('Codes promo — COBRA TN Admin')
  const { toast } = useUI()

  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(freshForm)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reload = async () => {
    setLoading(true)
    try {
      setCoupons(await adminListCoupons())
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  const startEdit = (coupon) => {
    setEditing(coupon.id)
    setError('')
    setForm({
      code: coupon.code || '',
      type: coupon.type === 'fixed' ? 'fixed' : 'percent',
      value: String(coupon.value ?? ''),
      min_order: Number(coupon.min_order) > 0 ? String(coupon.min_order) : '',
      max_uses: coupon.max_uses == null ? '' : String(coupon.max_uses),
      expires_at: toInputDate(coupon.expires_at),
      is_active: coupon.is_active !== false,
    })
  }

  const cancel = () => {
    setEditing(null)
    setForm(freshForm())
    setError('')
  }

  const submit = async (event) => {
    event.preventDefault()

    const code = String(form.code || '').trim().toUpperCase()
    const value = Number(form.value)

    if (!code) {
      setError('Un code promo est obligatoire.')
      return
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Saisissez une remise supérieure à zéro.')
      return
    }
    if (form.type === 'percent' && value > 100) {
      setError('Une remise en pourcentage ne peut pas dépasser 100 %.')
      return
    }
    if (form.expires_at && Number.isNaN(new Date(form.expires_at).getTime())) {
      setError('La date d&rsquo;expiration n&rsquo;est pas valide.')
      return
    }

    const payload = {
      code,
      type: form.type,
      value,
      min_order: Number(form.min_order) || 0,
      max_uses: form.max_uses === '' ? null : Number(form.max_uses) || null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active,
    }

    setBusy(true)
    setError('')
    try {
      if (editing) {
        await adminUpdateCoupon(editing, payload)
        toast('Code promo mis à jour')
      } else {
        await adminCreateCoupon(payload)
        toast('Code promo créé')
      }
      cancel()
      await reload()
    } catch (err) {
      const message = String(err?.message || '').includes('code')
        ? `Le code « ${code} » est déjà utilisé.`
        : getErrorMessage(err)
      setError(message)
      toast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (coupon) => {
    if (!window.confirm(`Supprimer le code promo « ${coupon.code} » ?`)) return
    try {
      await adminDeleteCoupon(coupon.id)
      if (editing === coupon.id) cancel()
      toast('Code promo supprimé')
      await reload()
    } catch (err) {
      toast(getErrorMessage(err), 'error')
    }
  }

  const preview = (type, rawValue, rawMin) => {
    const value = Number(rawValue) || 0
    const minOrder = Number(rawMin) || 0
    if (value <= 0) return null
    if (type === 'fixed') {
      return `Économisez ${formatPrice(Math.min(value, EXAMPLE_BASKET))} sur un panier de ${formatPrice(EXAMPLE_BASKET)}.`
    }
    return `Économisez ${formatPrice((EXAMPLE_BASKET * value) / 100)} sur un panier de ${formatPrice(EXAMPLE_BASKET)}${
      minOrder > 0 ? ` (sous-total minimum de ${formatPrice(minOrder)})` : ''
    }.`
  }

  return (
    <AdminPage
      eyebrow="Ventes"
      title="Codes promo"
      subtitle={`${coupons.length} code${coupons.length === 1 ? '' : 's'} promo, validé${coupons.length === 1 ? '' : 's'} lors du paiement.`}
    >
      {error && (
        <p className="mb-4 border border-red-600/40 bg-red-600/5 p-3 text-xs text-red-300" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <AdminCard title={editing ? 'Modifier le code promo' : 'Nouveau code promo'}>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Code" hint="Saisi par le client lors du paiement. Enregistré en majuscules.">
              <input
                className={`${adminInput} uppercase`}
                value={form.code}
                onChange={(e) => set({ code: e.target.value })}
                placeholder="SUMMER20"
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type">
                <select className={adminInput} value={form.type} onChange={(e) => set({ type: e.target.value })}>
                  <option value="percent">Pourcentage</option>
                  <option value="fixed">Montant fixe</option>
                </select>
              </Field>
              <Field label={form.type === 'percent' ? 'Pourcentage de remise' : 'Montant de la remise (TND)'}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={adminInput}
                  value={form.value}
                  onChange={(e) => set({ value: e.target.value })}
                  required
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Commande minimum (TND)"
                hint="Laissez vide pour que le code fonctionne sur N&rsquo;IMPORTE quel produit et quel montant de commande. Saisissez un montant si vous voulez imposer un minimum."
              >
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={adminInput}
                  value={form.min_order}
                  onChange={(e) => set({ min_order: e.target.value })}
                  placeholder="Aucun minimum"
                />
              </Field>
              <Field
                label="Limite d&rsquo;utilisations"
                hint="Ex. 10 = utilisable 10 fois au total, soit environ 10 clients. Vide = nombre d&rsquo;utilisations illimité. Dans tous les cas, chaque client ne peut utiliser un code qu&rsquo;une fois."
              >
                <input
                  type="number"
                  min="1"
                  step="1"
                  className={adminInput}
                  value={form.max_uses}
                  onChange={(e) => set({ max_uses: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Expire le" hint="Par défaut dans 3 jours. Vide signifie que le code n&rsquo;expire jamais.">
              <input
                type="datetime-local"
                className={adminInput}
                value={form.expires_at}
                onChange={(e) => set({ expires_at: e.target.value })}
              />
            </Field>
            {preview(form.type, form.value, form.min_order) && (
              <p className="border border-neutral-800 p-3 text-[11px] text-neutral-400">
                {preview(form.type, form.value, form.min_order)}
              </p>
            )}
            <div className="flex items-center justify-between gap-4 border border-neutral-800 p-3">
              <div>
                <p className="text-xs font-bold text-white">Actif</p>
                <p className="text-[11px] text-neutral-500">Les codes inactifs sont refusés lors du paiement.</p>
              </div>
              <Toggle checked={form.is_active} onChange={(next) => set({ is_active: next })} />
            </div>
            <div className="flex gap-2">
              <AdminButton type="submit" disabled={busy}>
                {busy ? 'Enregistrement…' : editing ? 'Enregistrer' : <><IconPlus className="h-4 w-4" /> Ajouter un code</>}
              </AdminButton>
              {editing && (
                <AdminButton type="button" variant="ghost" onClick={cancel} disabled={busy}>
                  Annuler
                </AdminButton>
              )}
            </div>
          </form>
        </AdminCard>

        <AdminCard title={`Tous les codes promo (${coupons.length})`}>
          {loading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : coupons.length === 0 ? (
            <EmptyRow>Aucun code promo pour le moment.</EmptyRow>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-neutral-800 text-[9px] uppercase tracking-widest text-neutral-500">
                    <th className="py-2 pr-3 font-bold">Code</th>
                    <th className="py-2 pr-3 font-bold">Remise</th>
                    <th className="py-2 pr-3 font-bold">Conditions</th>
                    <th className="py-2 pr-3 font-bold">Expire le</th>
                    <th className="py-2 pr-3 font-bold">État</th>
                    <th className="py-2 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {coupons.map((coupon) => {
                    const value = Number(coupon.value) || 0
                    const savings =
                      coupon.type === 'percent'
                        ? `Soit ${formatPrice((EXAMPLE_BASKET * value) / 100)} de remise sur une commande de ${formatPrice(EXAMPLE_BASKET)}`
                        : `Soit ${formatPrice(value)} de remise`
                    return (
                      <tr key={coupon.id} className="hover:bg-neutral-900">
                        <td className="py-3 pr-3 text-xs font-bold text-white">{coupon.code}</td>
                        <td className="py-3 pr-3 text-xs">
                          <span className="font-bold text-white">{describe(coupon)}</span>
                          <p className="text-[10px] text-neutral-500">{savings}</p>
                        </td>
                        <td className="py-3 pr-3 text-[11px] text-neutral-400">
                          {Number(coupon.min_order) > 0 ? (
                            <p>Min. {formatPrice(coupon.min_order)}</p>
                          ) : (
                            <p>Aucun minimum</p>
                          )}
                          <p className="text-neutral-500">
                            {coupon.max_uses == null ? 'Utilisations illimitées' : `${coupon.max_uses} utilisations max`}
                          </p>
                        </td>
                        <td className="py-3 pr-3 text-xs text-neutral-400">
                          {coupon.expires_at ? formatDate(coupon.expires_at) : 'Jamais'}
                        </td>
                        <td className="py-3 pr-3">
                          {coupon.is_active === false ? (
                            <Badge tone="neutral">Inactif</Badge>
                          ) : isExpired(coupon) ? (
                            <Badge tone="red">Expiré</Badge>
                          ) : (
                            <Badge tone="green">Actif</Badge>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(coupon)}
                              aria-label={`Modifier ${coupon.code}`}
                              className="flex h-8 w-8 items-center justify-center border border-neutral-700 text-neutral-300 hover:border-neutral-400 hover:text-white"
                            >
                              <IconCheck className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(coupon)}
                              aria-label={`Supprimer ${coupon.code}`}
                              className="flex h-8 w-8 items-center justify-center border border-red-600/40 text-red-400 hover:bg-red-600 hover:text-white"
                            >
                              <IconX className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>
    </AdminPage>
  )
}
