import { useEffect, useState } from 'react'
import { AdminPage, AdminCard, AdminButton, Field, adminInput } from './AdminUI'
import { adminListCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory } from '../lib/api'
import { useUI } from '../contexts/UIContext'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { slugify, getErrorMessage } from '../lib/utils'
import { IconX, IconCheck } from '../components/icons'
import { TableSkeleton } from '../components/LoadingSkeleton'
import { EmptyRow } from './AdminUI'

export default function Categories() {
  useDocumentMeta('Catégories — COBRA TN Admin')
  const { toast } = useUI()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', description: '' })
  const [editing, setEditing] = useState(null)

  const reload = () => adminListCategories().then((c) => setCategories(c))

  useEffect(() => {
    adminListCategories().then((c) => {
      setCategories(c)
      setLoading(false)
    })
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    try {
      if (editing) {
        await adminUpdateCategory(editing, { name: form.name.trim(), description: form.description, slug: slugify(form.name) })
        toast('Catégorie modifiée')
      } else {
        await adminCreateCategory({ name: form.name.trim(), description: form.description })
        toast('Catégorie créée')
      }
      setForm({ name: '', description: '' })
      setEditing(null)
      reload()
    } catch (err) {
      toast(getErrorMessage(err), 'error')
    }
  }

  const startEdit = (c) => {
    setEditing(c.id)
    setForm({ name: c.name, description: c.description || '' })
  }

  const cancel = () => {
    setEditing(null)
    setForm({ name: '', description: '' })
  }

  const remove = async (c) => {
    if (!window.confirm(`Supprimer la catégorie « ${c.name} » ?`)) return
    await adminDeleteCategory(c.id)
    toast('Catégorie supprimée')
    reload()
  }

  return (
    <AdminPage eyebrow="Taxonomie" title="Catégories" subtitle="Regroupez les produits côte à côte dans les filtres de la boutique.">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <AdminCard title={editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Nom">
              <input className={adminInput} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tee-shirts" required />
            </Field>
            <Field label="Description" hint="Affichée dans les puces de filtrage de la boutique.">
              <textarea rows={3} className={`${adminInput} h-auto py-3`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Facultatif" />
            </Field>
            <div className="flex gap-2">
              <AdminButton type="submit">{editing ? 'Enregistrer' : 'Ajouter une catégorie'}</AdminButton>
              {editing && <AdminButton type="button" variant="ghost" onClick={cancel}>Annuler</AdminButton>}
            </div>
          </form>
        </AdminCard>

        <AdminCard title={`Toutes les catégories (${categories.length})`}>
          {loading ? (
            <TableSkeleton rows={5} cols={3} />
          ) : categories.length === 0 ? (
            <EmptyRow>Aucune catégorie. Ajoutez la première.</EmptyRow>
          ) : (
            <ul className="divide-y divide-neutral-800">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">{c.name}</p>
                    <p className="truncate text-[10px] text-neutral-500">/{c.slug}{c.description ? ` · ${c.description}` : ''}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => startEdit(c)} aria-label="Modifier" className="flex h-8 w-8 items-center justify-center border border-neutral-700 text-neutral-300 hover:border-neutral-400 hover:text-white">
                      <IconCheck className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => remove(c)} aria-label="Supprimer" className="flex h-8 w-8 items-center justify-center border border-red-600/40 text-red-400 hover:bg-red-600 hover:text-white">
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