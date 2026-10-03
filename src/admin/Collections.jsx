import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminPage, AdminCard, Badge, Toggle, AdminButton, Field, adminInput, EmptyRow } from './AdminUI'
import ImagePicker from './ImagePicker'
import {
  adminListCollections,
  adminCreateCollection,
  adminUpdateCollection,
  adminDeleteCollection,
} from '../lib/api'
import { useUI } from '../contexts/UIContext'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { slugify, getErrorMessage } from '../lib/utils'
import { IconX, IconCheck, IconPlus } from '../components/icons'
import { TableSkeleton } from '../components/LoadingSkeleton'

const EMPTY_FORM = {
  name: '',
  slug: '',
  description: '',
  image_url: '',
  is_featured: false,
  is_active: true,
}

export default function Collections() {
  useDocumentMeta('Collections — COBRA TN Admin')
  const { toast } = useUI()

  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reload = async () => {
    setLoading(true)
    try {
      setCollections(await adminListCollections())
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

  const startEdit = (collection) => {
    setEditing(collection.id)
    setError('')
    setForm({
      name: collection.name || '',
      slug: collection.slug || '',
      description: collection.description || '',
      image_url: collection.image_url || '',
      is_featured: Boolean(collection.is_featured),
      is_active: collection.is_active !== false,
    })
  }

  const cancel = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) {
      setError('Le nom de la collection est obligatoire.')
      return
    }

    const payload = {
      name: form.name.trim(),
      slug: slugify(form.slug || form.name),
      description: form.description,
      image_url: form.image_url.trim(),
      is_featured: form.is_featured,
      is_active: form.is_active,
    }

    setBusy(true)
    setError('')
    try {
      if (editing) {
        await adminUpdateCollection(editing, payload)
        toast('Collection mise à jour')
      } else {
        await adminCreateCollection(payload)
        toast('Collection créée')
      }
      cancel()
      await reload()
    } catch (err) {
      const message = String(err?.message || '').includes('slug')
        ? `Le slug « ${payload.slug} » est déjà utilisé par une autre collection.`
        : getErrorMessage(err)
      setError(message)
      toast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (collection) => {
    if (!window.confirm(`Supprimer la collection « ${collection.name} » ? Ses produits restent au catalogue.`)) return
    try {
      await adminDeleteCollection(collection.id)
      if (editing === collection.id) cancel()
      toast('Collection supprimée')
      await reload()
    } catch (err) {
      toast(getErrorMessage(err), 'error')
    }
  }

  return (
    <AdminPage
      eyebrow="Catalogue"
      title="Collections"
      subtitle={`${collections.length} collection${collections.length === 1 ? '' : 's'} enregistrée${collections.length === 1 ? '' : 's'} dans Supabase Postgres.`}
    >
      {error && (
        <p className="mb-4 border border-red-600/40 bg-red-600/5 p-3 text-xs text-red-300" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <AdminCard title={editing ? 'Modifier la collection' : 'Nouvelle collection'}>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Nom">
              <input
                className={adminInput}
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Nouvelle série"
                required
              />
            </Field>
            <Field label="Slug" hint={`/collections/${form.slug || slugify(form.name) || '…'}`}>
              <input
                className={adminInput}
                value={form.slug}
                onChange={(e) => set({ slug: e.target.value })}
                placeholder="généré automatiquement à partir du nom"
              />
            </Field>
            <Field label="Description" hint="Affichée sur la page de la collection.">
              <textarea
                rows={3}
                className={`${adminInput} h-auto py-3`}
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="Facultatif"
              />
            </Field>
            <ImagePicker
              label="Image de la collection"
              hint="Choisissez un fichier depuis votre appareil (JPEG, PNG, WebP ou SVG, 5 Mo max)."
              value={form.image_url}
              onChange={(url) => set({ image_url: url })}
            />
            <div className="flex items-center justify-between gap-4 border border-neutral-800 p-3">
              <div>
                <p className="text-xs font-bold text-white">Active</p>
                <p className="text-[11px] text-neutral-500">Les collections masquées ne sont pas affichées dans la boutique.</p>
              </div>
              <Toggle checked={form.is_active} onChange={(next) => set({ is_active: next })} />
            </div>
            <div className="flex items-center justify-between gap-4 border border-neutral-800 p-3">
              <div>
                <p className="text-xs font-bold text-white">À la une</p>
                <p className="text-[11px] text-neutral-500">Mise en avant sur la page des collections.</p>
              </div>
              <Toggle checked={form.is_featured} onChange={(next) => set({ is_featured: next })} />
            </div>
            <div className="flex gap-2">
              <AdminButton type="submit" disabled={busy}>
                {busy ? 'Enregistrement…' : editing ? 'Enregistrer' : <><IconPlus className="h-4 w-4" /> Ajouter une collection</>}
              </AdminButton>
              {editing && (
                <AdminButton type="button" variant="ghost" onClick={cancel} disabled={busy}>
                  Annuler
                </AdminButton>
              )}
            </div>
          </form>
        </AdminCard>

        <AdminCard title={`Toutes les collections (${collections.length})`}>
          {loading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : collections.length === 0 ? (
            <EmptyRow>Aucune collection pour le moment. Ajoutez la première.</EmptyRow>
          ) : (
            <ul className="divide-y divide-neutral-800">
              {collections.map((collection) => (
                <li key={collection.id} className="flex items-center gap-4 py-3">
                  <img
                    src={collection.image_url || '/images/placeholder-collection.svg'}
                    alt=""
                    className="h-12 w-10 shrink-0 border border-neutral-800 object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/images/placeholder-collection.svg'
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <Link to={`/collections/${collection.slug}`} className="text-xs font-bold text-white hover:underline">
                      {collection.name}
                    </Link>
                    <p className="truncate text-[10px] text-neutral-500">
                      /{collection.slug}
                      {collection.is_featured ? ' · À la une' : ''}
                    </p>
                    {collection.description && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-neutral-400">{collection.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {collection.is_active === false ? <Badge tone="neutral">Masquée</Badge> : <Badge tone="green">En ligne</Badge>}
                    <button
                      type="button"
                      onClick={() => startEdit(collection)}
                      aria-label={`Modifier ${collection.name}`}
                      className="flex h-8 w-8 items-center justify-center border border-neutral-700 text-neutral-300 hover:border-neutral-400 hover:text-white"
                    >
                      <IconCheck className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(collection)}
                      aria-label={`Supprimer ${collection.name}`}
                      className="flex h-8 w-8 items-center justify-center border border-red-600/40 text-red-400 hover:bg-red-600 hover:text-white"
                    >
                      <IconX className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>
    </AdminPage>
  )
}
