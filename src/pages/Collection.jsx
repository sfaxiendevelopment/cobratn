import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getCollectionBySlug, getCollectionPage, isSupabaseConfigured } from '../lib/api'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import ProductGrid from '../components/ProductGrid'
import { ErrorState, EmptyState } from '../components/ErrorState'
import { IconChevronDown } from '../components/icons'

const SORTS = [
  { value: 'newest', label: 'Nouveautés' },
  { value: 'featured', label: 'À la une' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'sales', label: 'Les plus populaires' },
]

const EMPTY = { data: [], count: 0, pagination: null }

export default function Collection() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  useDocumentMeta(collection ? `${collection.name} — COBRA TN` : 'Collection — COBRA TN', collection?.description || undefined)

  const sort = params.get('sort') || 'newest'
  const [collection, setCollection] = useState(null)
  const [products, setProducts] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(false)

  const setSort = useCallback(
    (value) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (!value || value === 'newest') next.delete('sort')
          else next.set('sort', value)
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  useEffect(() => {
    if (!isSupabaseConfigured || !slug) {
      setLoading(false)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    setError(false)
    setCollection(null)
    setProducts(EMPTY)
    ;(async () => {
      try {
        const rows = await getCollectionBySlug(slug)
        if (cancelled) return
        if (!rows) {
          setNotFound(true)
          setLoading(false)
          return
        }
        setCollection(rows)
        const page = await getCollectionPage(slug, { sort, limit: 40 })
        if (cancelled) return
        setProducts(
          Array.isArray(page) || !page
            ? EMPTY
            : { data: page.data || [], count: page.count ?? 0, pagination: page.pagination || null },
        )
        setLoading(false)
      } catch {
        if (cancelled) return
        setError(true)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug, sort])

  if (!isSupabaseConfigured) {
    return (
      <div className="container-page pb-24 pt-32">
        <ErrorState message="Supabase n'est pas encore configuré. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY à votre .env." />
      </div>
    )
  }

  if (loading) return <div className="container-page pb-24 pt-32"><ProductGrid loading skeletonCount={8} /></div>

  if (error) {
    return (
      <div className="container-page pb-24 pt-32">
        <ErrorState message="Cette collection n'a pas pu être chargée." onRetry={() => navigate(0)} />
      </div>
    )
  }

  if (notFound || !collection) {
    return (
      <div className="container-page pb-24 pt-32">
        <ErrorState message="Collection introuvable." onRetry={() => navigate('/collections')} />
      </div>
    )
  }

  return (
    <div className="pb-24 pt-24 lg:pb-32 lg:pt-32">
      {/* Banner */}
      <section className="relative flex min-h-[320px] items-center overflow-hidden bg-black lg:min-h-[420px]">
        <div className="absolute inset-0">
          <img
            src={collection.image_url || '/images/placeholder-collection.svg'}
            alt={collection.name}
            className="h-full w-full object-cover opacity-60"
            onError={(e) => (e.currentTarget.src = '/images/placeholder-collection.svg')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/30" />
        </div>
        <div className="container-page relative z-10 py-16">
          <Link to="/collections" className="text-[10px] font-semibold uppercase tracking-widest2 text-white/60 hover:text-white">
            ← Toutes les collections
          </Link>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-wide text-white lg:text-6xl">{collection.name}</h1>
          {collection.description && <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70">{collection.description}</p>}
        </div>
      </section>

      <div className="container-page py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-neutral-500">{products.count} article{products.count === 1 ? '' : 's'}</p>
          <label className="relative">
            <span className="sr-only">Trier les produits</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-11 appearance-none border border-black/20 bg-white pl-4 pr-10 text-[11px] font-bold uppercase tracking-widest outline-none focus:border-black"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <IconChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2" />
          </label>
        </div>

        {products.data.length ? (
          <div className="mt-6">
            <ProductGrid products={products.data} />
          </div>
        ) : (
          <div className="mt-6">
            <EmptyState title="Rien ici pour le moment" description="Cette collection ne contient encore aucun produit. Revenez bientôt." action="Voir la boutique" onAction={() => navigate('/shop')} />
          </div>
        )}
      </div>
    </div>
  )
}
