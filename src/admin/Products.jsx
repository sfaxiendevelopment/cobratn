import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminPage, AdminCard, Badge, Toggle, EmptyRow, AdminButton, adminInput } from './AdminUI'
import {
  adminListProducts,
  adminListCategories,
  adminUpdateProduct,
  adminDeleteProduct,
} from '../lib/api'
import { useUI } from '../contexts/UIContext'
import { useDocumentMeta, useDebounce } from '../hooks/useDocumentMeta'
import { formatPrice, getProductImage, getErrorMessage } from '../lib/utils'
import { TableSkeleton } from '../components/LoadingSkeleton'
import { IconPlus, IconSearch, IconTrash } from '../components/icons'

const LOW_STOCK_AT = 5

/**
 * `adminUpdateProduct` rewrites every product column it is given, so a partial
 * patch (the publish toggle) has to re-send the current values.
 */
function toProductInput(p) {
  return {
    name: p.name,
    slug: p.slug,
    description: p.description ?? '',
    price: p.price,
    sale_price: p.sale_price,
    category_id: p.category_id ?? '',
    collection_id: p.collection_id ?? '',
    sku: p.sku ?? '',
    stock: p.stock,
    is_featured: Boolean(p.is_featured),
    is_published: Boolean(p.is_published),
  }
}

function isSlugConflict(err) {
  const message = String(err?.message || '')
  return message.includes('slug') || message.includes('duplicate key value')
}

export default function Products() {
  useDocumentMeta('Produits — COBRA TN Admin')
  const { toast } = useUI()

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [status, setStatus] = useState('all')
  const [busyId, setBusyId] = useState(null)

  const debouncedSearch = useDebounce(search, 300)

  const load = useCallback(async (term) => {
    setLoading(true)
    setError('')
    try {
      const [rows, cats] = await Promise.all([
        adminListProducts({ search: term, includeUnpublished: true }),
        adminListCategories(),
      ])
      setProducts(rows)
      setCategories(cats)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(debouncedSearch)
  }, [debouncedSearch, load])

  const visible = useMemo(
    () =>
      products.filter((p) => {
        if (categoryId !== 'all' && p.category_id !== categoryId) return false
        if (status === 'published' && !p.is_published) return false
        if (status === 'draft' && p.is_published) return false
        if (status === 'out' && (p.stock ?? 0) > 0) return false
        if (status === 'low' && !((p.stock ?? 0) > 0 && (p.stock ?? 0) <= LOW_STOCK_AT)) return false
        return true
      }),
    [products, categoryId, status],
  )

  const reload = () => load(debouncedSearch)

  const togglePublished = async (product, next) => {
    setBusyId(product.id)
    try {
      await adminUpdateProduct(product.id, { ...toProductInput(product), is_published: next })
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, is_published: next } : p)))
      toast(next ? `${product.name} est maintenant en ligne` : `${product.name} est maintenant un brouillon`)
    } catch (err) {
      toast(isSlugConflict(err) ? "Impossible d'enregistrer : l'identifiant URL du produit est déjà utilisé." : getErrorMessage(err), 'error')
      reload()
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (product) => {
    if (!window.confirm(`Supprimer « ${product.name} » ? Cela supprime aussi ses images et ses variantes.`)) return
    setBusyId(product.id)
    try {
      await adminDeleteProduct(product.id)
      setProducts((prev) => prev.filter((p) => p.id !== product.id))
      toast('Produit supprimé')
    } catch (err) {
      toast(getErrorMessage(err), 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <AdminPage
      eyebrow="Catalogue"
      title="Produits"
      subtitle={`${visible.length} sur ${products.length} produit${products.length === 1 ? '' : 's'} — stockés dans Supabase Postgres.`}
      actions={
        <Link to="/admin/products/new">
          <AdminButton>
            <IconPlus className="h-4 w-4" /> Nouveau produit
          </AdminButton>
        </Link>
      }
    >
      <AdminCard>
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
            <input
              className={`${adminInput} pl-9`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un nom de produit…"
              aria-label="Rechercher des produits"
            />
          </div>
          <select
            className={`${adminInput} md:w-52`}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-label="Filtrer par catégorie"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className={`${adminInput} md:w-44`}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filtrer par statut"
          >
            <option value="all">Tous les statuts</option>
            <option value="published">Publiés</option>
            <option value="draft">Brouillons</option>
            <option value="low">Stock faible</option>
            <option value="out">Rupture de stock</option>
          </select>
        </div>
      </AdminCard>

      <div className="mt-6">
        {error ? (
          <AdminCard>
            <p className="text-xs text-red-400">{error}</p>
          </AdminCard>
        ) : loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : visible.length === 0 ? (
          <AdminCard>
            <EmptyRow>Aucun produit ne correspond à ce filtre.</EmptyRow>
          </AdminCard>
        ) : (
          <AdminCard title="Catalogue">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-neutral-800 text-[9px] uppercase tracking-widest text-neutral-500">
                    <th className="py-2 pr-3 font-bold">Produit</th>
                    <th className="py-2 pr-3 font-bold">Catégorie</th>
                    <th className="py-2 pr-3 font-bold">Prix</th>
                    <th className="py-2 pr-3 font-bold">Stock</th>
                    <th className="py-2 pr-3 font-bold">En ligne</th>
                    <th className="py-2 pr-3 font-bold">Ventes</th>
                    <th className="py-2 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {visible.map((p) => {
                    const stock = p.stock ?? 0
                    const busy = busyId === p.id
                    return (
                      <tr key={p.id} className="hover:bg-neutral-900">
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={getProductImage(p)}
                              alt=""
                              className="h-11 w-9 shrink-0 border border-neutral-800 object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/images/placeholder-product-front.svg'
                              }}
                            />
                            <div className="min-w-0">
                              <Link to={`/admin/products/${p.id}`} className="block truncate text-xs font-bold text-white hover:underline">
                                {p.name}
                              </Link>
                              <p className="truncate text-[10px] text-neutral-500">
                                /{p.slug}
                                {p.is_featured ? ' · À la une' : ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-xs text-neutral-400">{p.category?.name || '—'}</td>
                        <td className="py-3 pr-3 text-xs">
                          <div>
                            <span className="font-bold text-white">{formatPrice(p.effective_price ?? p.price)}</span>
                            <span className="ml-1 text-[10px] text-neutral-500">vente</span>
                            {Number(p.discount_percent) > 0 && (
                              <Badge tone="red">-{Number(p.discount_percent)}%</Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-neutral-500">
                            coût {formatPrice(p.price)}
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-xs">
                          <span className="font-bold text-white">{stock}</span>
                          {stock <= 0 ? (
                            <Badge tone="red">Rupture</Badge>
                          ) : stock <= LOW_STOCK_AT ? (
                            <Badge tone="amber">Faible</Badge>
                          ) : null}
                        </td>
                        <td className="py-3 pr-3">
                          <Toggle
                            checked={Boolean(p.is_published)}
                            disabled={busy}
                            onChange={(next) => togglePublished(p, next)}
                          />
                        </td>
                        <td className="py-3 pr-3 text-xs text-neutral-400">{p.sales_count ?? 0}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/admin/products/${p.id}`}
                              className="border border-neutral-700 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-widest text-neutral-300 hover:border-neutral-500 hover:text-white"
                            >
                              Modifier
                            </Link>
                            <button
                              type="button"
                              onClick={() => remove(p)}
                              disabled={busy}
                              aria-label={`Supprimer ${p.name}`}
                              className="flex h-8 w-8 items-center justify-center border border-red-600/40 text-red-400 transition-colors hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <IconTrash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </AdminCard>
        )}
      </div>
    </AdminPage>
  )
}
