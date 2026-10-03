import { useEffect, useState } from 'react'
import { AdminPage, AdminCard, Badge, Toggle, AdminButton, Field, adminInput, EmptyRow } from './AdminUI'
import { getShippingZones, adminSaveShippingZone, adminDeleteShippingZone } from '../lib/api'
import { useUI } from '../contexts/UIContext'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { formatPrice, getErrorMessage, TN_GOVERNORATES } from '../lib/utils'
import { IconX, IconCheck, IconPlus } from '../components/icons'
import { TableSkeleton } from '../components/LoadingSkeleton'

const EMPTY_FORM = {
  name: '',
  delivery_price: '',
  estimated_days: '2',
  is_active: true,
}

const FALLBACK_NAMES = ['default', 'all tunisia', 'tunisia']

function isFallback(name) {
  return FALLBACK_NAMES.includes(String(name || '').trim().toLowerCase())
}

export default function Shipping() {
  useDocumentMeta('Livraison — COBRA TN Admin')
  const { toast } = useUI()

  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [governorate, setGovernorate] = useState('')

  const reload = async () => {
    setLoading(true)
    try {
      setZones(await getShippingZones({ includeInactive: true }))
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

  const startEdit = (zone) => {
    setEditing(zone.id)
    setError('')
    setForm({
      name: zone.name || '',
      delivery_price: String(zone.delivery_price ?? 0),
      estimated_days: String(zone.estimated_days ?? 0),
      is_active: zone.is_active !== false,
    })
  }

  const cancel = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) {
      setError('Le nom de la zone est obligatoire — il est comparé au gouvernorat lors du paiement.')
      return
    }
    if (Number(form.delivery_price) < 0) {
      setError('Le prix de livraison ne peut pas être négatif.')
      return
    }

    setBusy(true)
    setError('')
    try {
      await adminSaveShippingZone(editing, {
        name,
        delivery_price: Number(form.delivery_price) || 0,
        estimated_days: Number(form.estimated_days) || 0,
        is_active: form.is_active,
      })
      toast(editing ? 'Zone mise à jour' : 'Zone créée')
      setGovernorate('')
      cancel()
      await reload()
    } catch (err) {
      const message = getErrorMessage(err)
      setError(message)
      toast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (zone) => {
    if (!window.confirm(`Supprimer la zone « ${zone.name} » ? Les commandes vers cette zone utiliseront le prix par défaut.`)) return
    try {
      await adminDeleteShippingZone(zone.id)
      if (editing === zone.id) cancel()
      toast('Zone supprimée')
      await reload()
    } catch (err) {
      toast(getErrorMessage(err), 'error')
    }
  }

  const applyGovernorate = (value) => {
    if (!value) return
    setGovernorate('')
    setEditing(null)
    setForm({ name: value, delivery_price: '', estimated_days: '2', is_active: true })
  }

  return (
    <AdminPage
      eyebrow="Paramètres"
      title="Livraison"
      subtitle={`${zones.length} zone${zones.length === 1 ? '' : 's'} enregistrée${zones.length === 1 ? '' : 's'} dans Supabase Postgres.`}
    >
      <AdminCard title="Comment les zones sont associées">
        <p className="max-w-3xl text-xs leading-relaxed text-neutral-400">
          Le paiement transmet le gouvernorat du client, et le prix de livraison provient de la zone active dont le{' '}
          <span className="font-bold text-white">nom correspond exactement à ce gouvernorat</span> (sans distinction de
          casse). Une zone littéralement nommée <span className="font-bold text-white">Default</span> sert de repli pour tout
          gouvernorat sans zone dédiée — et s&rsquo;il n&rsquo;existe aucune zone Default, c&rsquo;est la zone active la moins
          chère qui est utilisée, afin qu&rsquo;un gouvernorat non trouvé ne soit jamais facturé 0 TND.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <Field label="Ajouter rapidement un gouvernorat" className="w-full sm:w-64">
            <select className={adminInput} value={governorate} onChange={(e) => applyGovernorate(e.target.value)}>
              <option value="">Choisir un gouvernorat…</option>
              {TN_GOVERNORATES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <p className="pb-2 text-[11px] text-neutral-500">Remplit le nom de la zone pour vous — définissez ensuite le prix.</p>
        </div>
      </AdminCard>

      {error && (
        <p className="mt-4 border border-red-600/40 bg-red-600/5 p-3 text-xs text-red-300" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        <AdminCard title={editing ? 'Modifier la zone' : 'Nouvelle zone'}>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Nom" hint="Nom du gouvernorat, ou « Default » pour la zone de repli.">
              <input
                className={adminInput}
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Sousse"
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prix de livraison (TND)">
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={adminInput}
                  value={form.delivery_price}
                  onChange={(e) => set({ delivery_price: e.target.value })}
                  required
                />
              </Field>
              <Field label="Délai estimé (jours)">
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={adminInput}
                  value={form.estimated_days}
                  onChange={(e) => set({ estimated_days: e.target.value })}
                />
              </Field>
            </div>
            <div className="flex items-center justify-between gap-4 border border-neutral-800 p-3">
              <div>
                <p className="text-xs font-bold text-white">Actif</p>
                <p className="text-[11px] text-neutral-500">Les zones inactives sont ignorées lors du calcul de la livraison.</p>
              </div>
              <Toggle checked={form.is_active} onChange={(next) => set({ is_active: next })} />
            </div>
            <div className="flex gap-2">
              <AdminButton type="submit" disabled={busy}>
                {busy ? 'Enregistrement…' : editing ? 'Enregistrer' : <><IconPlus className="h-4 w-4" /> Ajouter une zone</>}
              </AdminButton>
              {editing && (
                <AdminButton type="button" variant="ghost" onClick={cancel} disabled={busy}>
                  Annuler
                </AdminButton>
              )}
            </div>
          </form>
        </AdminCard>

        <AdminCard title={`Toutes les zones (${zones.length})`}>
          {loading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : zones.length === 0 ? (
            <EmptyRow>Aucune zone pour le moment. Ajoutez-en une pour que la livraison ne soit pas offerte.</EmptyRow>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-neutral-800 text-[9px] uppercase tracking-widest text-neutral-500">
                    <th className="py-2 pr-3 font-bold">Zone</th>
                    <th className="py-2 pr-3 font-bold">Livraison</th>
                    <th className="py-2 pr-3 font-bold">Jours</th>
                    <th className="py-2 pr-3 font-bold">État</th>
                    <th className="py-2 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {zones.map((zone) => (
                    <tr key={zone.id} className="hover:bg-neutral-900">
                      <td className="py-3 pr-3 text-xs font-bold text-white">
                        {zone.name}
                        {isFallback(zone.name) && <Badge tone="black">Repli</Badge>}
                      </td>
                      <td className="py-3 pr-3 text-xs text-neutral-300">{formatPrice(zone.delivery_price)}</td>
                      <td className="py-3 pr-3 text-xs text-neutral-400">{zone.estimated_days}</td>
                      <td className="py-3 pr-3">
                        {zone.is_active === false ? <Badge tone="neutral">Inactif</Badge> : <Badge tone="green">Actif</Badge>}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(zone)}
                            aria-label={`Modifier ${zone.name}`}
                            className="flex h-8 w-8 items-center justify-center border border-neutral-700 text-neutral-300 hover:border-neutral-400 hover:text-white"
                          >
                            <IconCheck className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(zone)}
                            aria-label={`Supprimer ${zone.name}`}
                            className="flex h-8 w-8 items-center justify-center border border-red-600/40 text-red-400 hover:bg-red-600 hover:text-white"
                          >
                            <IconX className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>
    </AdminPage>
  )
}
