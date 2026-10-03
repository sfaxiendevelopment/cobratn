import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getProducts, getCategories, getCollections, getCatalogOptions, isSupabaseConfigured } from '../lib/api'
import { useDebounce, useDocumentMeta } from '../hooks/useDocumentMeta'
import ProductGrid from '../components/ProductGrid'
import { EmptyState, ErrorState } from '../components/ErrorState'
import Pager from '../components/Pager'
import { IconChevronDown, IconX } from '../components/icons'
import { cn, swatchFor, colorName } from '../lib/utils'

const PER_PAGE = 20

const SORTS = [
  { value: 'newest', label: 'Nouveautés' },
  { value: 'featured', label: 'À la une' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'sales', label: 'Les plus populaires' },
]

/** Fallback facets, only used until the catalogue reports its own options. */
const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL']
const DEFAULT_COLORS = ['Black', 'White', 'Gray']

export default function Shop() {
  useDocumentMeta('Boutique — COBRA TN', 'Découvrez toute la collection COBRA TN. Streetwear monochrome premium.')
  const [params, setParams] = useSearchParams()

  const category = params.get('category') || 'all'
  const collection = params.get('collection') || 'all'
  const sort = params.get('sort') || 'newest'
  const search = params.get('search') || ''
  const page = Math.max(1, parseInt(params.get('page') || '1', 10))

  // The URL is the single source of truth for every filter, so links, the
  // back button and the "active" chips can never drift from the results.
  const priceParam = params.get('price') || ''
  const sizes = useMemo(() => params.get('sizes')?.split(',').filter(Boolean) || [], [params])
  const colors = useMemo(() => params.get('colors')?.split(',').filter(Boolean) || [], [params])
  const availability = params.get('availability') || ''
  const appliedPrice = useMemo(() => {
    const [min, max] = priceParam.split('-')
    const lo = min ? Number(min) : null
    const hi = max ? Number(max) : null
    if (lo == null && hi == null) return null
    return [lo ?? 0, hi ?? 10000]
  }, [priceParam])

  // Price keeps a local draft so typing does not fire a request per keystroke;
  // it is re-seeded whenever the committed URL value changes.
  const [priceDraft, setPriceDraft] = useState(() => {
    const [min, max] = priceParam.split('-')
    return [min ? Number(min) : null, max ? Number(max) : null]
  })
  const [seededPrice, setSeededPrice] = useState(priceParam)
  if (priceParam !== seededPrice) {
    const [min, max] = priceParam.split('-')
    setSeededPrice(priceParam)
    setPriceDraft([min ? Number(min) : null, max ? Number(max) : null])
  }

  const debouncedSearch = useDebounce(search, 400)

  const [data, setData] = useState({ data: [], count: 0, pagination: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [facets, setFacets] = useState({ categories: [], collections: [], sizes: DEFAULT_SIZES, colors: DEFAULT_COLORS })
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    getCategories()
      .then((categories) => setFacets((f) => ({ ...f, categories })))
      .catch(() => setFacets((f) => ({ ...f, categories: [] })))
    getCollections()
      .then((collections) => setFacets((f) => ({ ...f, collections })))
      .catch(() => setFacets((f) => ({ ...f, collections: [] })))
    getCatalogOptions()
      .then((options) =>
        setFacets((f) => ({
          ...f,
          sizes: options.sizes?.length ? options.sizes : DEFAULT_SIZES,
          colors: options.colors?.length ? options.colors : DEFAULT_COLORS,
        })),
      )
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      setData({ data: [], count: 0, pagination: null })
      return undefined
    }
    let cancelled = false
    setLoading(true)
    setError(false)
    getProducts({
      category,
      collection,
      search: debouncedSearch,
      sort,
      sizes: sizes.length ? sizes : undefined,
      colors: colors.length ? colors : undefined,
      availability: availability || undefined,
      priceRange: appliedPrice || undefined,
      page,
      limit: PER_PAGE,
    })
      .then((res) => {
        if (cancelled) return
        setData(res || { data: [], count: 0, pagination: null })
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setData({ data: [], count: 0, pagination: null })
        setError(true)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [category, collection, debouncedSearch, sort, sizes, colors, availability, appliedPrice, page])

  const updateParam = useCallback(
    (key, value) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value == null || value === '' || value === 'all') next.delete(key)
          else next.set(key, value)
          next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  /** Page-number navigation: results are offset-paginated, not cursor based. */
  const goToAdjacentPage = useCallback(
    (direction) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const totalPages = data.pagination?.totalPages || 0
          const target = Math.max(1, Math.min(totalPages || page + direction, page + direction))
          next.set('page', String(target))
          return next
        },
        { replace: false },
      )
    },
    [data.pagination, page, setParams],
  )

  const toggleArrayParam = (key, value, current) => {
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    updateParam(key, next.join(','))
  }

  const resetFilters = () => {
    setParams({}, { replace: true })
  }

  return (
    <div className="container-page pb-24 pt-24 lg:pb-32 lg:pt-32">
      {!isSupabaseConfigured && (
        <div className="mb-8 border border-black/15 bg-neutral-50 p-5 text-xs text-neutral-600">
          <p className="font-bold uppercase tracking-wide3 text-black">Catalogue non connecté</p>
          <p className="mt-1">
            Ajoutez <code className="font-mono">VITE_SUPABASE_URL</code> et{' '}
            <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> à votre{' '}
            <code className="font-mono">.env</code> pour charger les produits depuis Supabase.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-black/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="label text-neutral-400">Catalogue</p>
          <h1 className="section-title">Boutique</h1>
          <p className="mt-2 text-xs text-neutral-500">
            {loading ? 'Chargement…' : `${data.count} article${data.count === 1 ? '' : 's'}`}
            {debouncedSearch && <> pour « {debouncedSearch} »</>}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="flex h-12 items-center justify-center gap-2 border border-black px-5 text-[11px] font-bold uppercase tracking-widest lg:hidden"
          >
            Filtres
          </button>
          <label className="relative">
            <span className="sr-only">Trier les produits</span>
            <select
              value={sort}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="h-12 appearance-none border border-black/20 bg-white pl-4 pr-10 text-[11px] font-bold uppercase tracking-widest outline-none focus:border-black"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <IconChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2" />
          </label>
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[260px_1fr]">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:block" aria-label="Filtres produits">
          <FilterPanel
            facets={facets}
            category={category}
            collection={collection}
            sizes={sizes}
            colors={colors}
            availability={availability}
            priceRange={priceDraft}
            setPriceRange={setPriceDraft}
            onCategory={(v) => updateParam('category', v)}
            onCollection={(v) => updateParam('collection', v)}
            onSize={(v) => toggleArrayParam('sizes', v, sizes)}
            onColor={(v) => toggleArrayParam('colors', v, colors)}
            onAvailability={(v) => updateParam('availability', v)}
            onApplyPrice={() => updateParam('price', priceDraft[0] == null && priceDraft[1] == null ? '' : priceDraft.join('-'))}
            onReset={resetFilters}
          />
        </aside>

        {/* Filters drawer (mobile) */}
        <div className={`fixed inset-0 z-[115] lg:hidden ${filtersOpen ? '' : 'pointer-events-none'}`} aria-hidden={!filtersOpen}>
          <button
            type="button"
            aria-label="Fermer les filtres"
            onClick={() => setFiltersOpen(false)}
            className={`absolute inset-0 h-full w-full bg-black/60 transition-opacity ${filtersOpen ? 'opacity-100' : 'opacity-0'}`}
          />
          <div className={`absolute right-0 top-0 flex h-full w-[88%] max-w-sm flex-col bg-white transition-transform duration-300 ${filtersOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
              <span className="text-xs font-extrabold uppercase tracking-wide3">Filtres</span>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Fermer" className="flex h-9 w-9 items-center justify-center border border-black/10">
                <IconX className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <FilterPanel
                facets={facets}
                category={category}
                collection={collection}
                sizes={sizes}
                colors={colors}
                availability={availability}
                priceRange={priceDraft}
                setPriceRange={setPriceDraft}
                onCategory={updateParam.bind(null, 'category')}
                onCollection={updateParam.bind(null, 'collection')}
                onSize={(v) => toggleArrayParam('sizes', v, sizes)}
                onColor={(v) => toggleArrayParam('colors', v, colors)}
                onAvailability={(v) => updateParam('availability', v)}
                onApplyPrice={() => updateParam('price', priceDraft[0] == null && priceDraft[1] == null ? '' : priceDraft.join('-'))}
                onReset={resetFilters}
                compact
              />
            </div>
            <button type="button" className="btn-primary m-5" onClick={() => setFiltersOpen(false)}>
              Afficher les résultats
            </button>
          </div>
        </div>

        {/* Results */}
        <div>
          {(sizes.length || colors.length || availability || priceParam || category !== 'all' || collection !== 'all' || search) && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Actifs&nbsp;:</span>
              {search && (
                <span className="flex items-center gap-1 border border-black/15 px-2 py-1 text-[10px] uppercase">"{search}" <button type="button" onClick={() => updateParam('search', '')}><IconX className="h-3 w-3" /></button></span>
              )}
              {category !== 'all' && (
                <button type="button" onClick={() => updateParam('category', '')} className="flex items-center gap-1 border border-black/15 px-2 py-1 text-[10px] uppercase hover:border-black">
                  {category} <IconX className="h-3 w-3" />
                </button>
              )}
              {collection !== 'all' && (
                <button type="button" onClick={() => updateParam('collection', '')} className="flex items-center gap-1 border border-black/15 px-2 py-1 text-[10px] uppercase hover:border-black">
                  {collection} <IconX className="h-3 w-3" />
                </button>
              )}
              {sizes.map((s) => (
                <button key={s} type="button" onClick={() => toggleArrayParam('sizes', s, sizes)} className="flex items-center gap-1 border border-black/15 px-2 py-1 text-[10px] uppercase hover:border-black">
                  {s} <IconX className="h-3 w-3" />
                </button>
              ))}
              {colors.map((c) => (
                <button key={c} type="button" onClick={() => toggleArrayParam('colors', c, colors)} className="flex items-center gap-1 border border-black/15 px-2 py-1 text-[10px] uppercase hover:border-black">
                  {colorName(c)} <IconX className="h-3 w-3" />
                </button>
              ))}
              {availability && (
                <button type="button" onClick={() => updateParam('availability', '')} className="flex items-center gap-1 border border-black/15 px-2 py-1 text-[10px] uppercase hover:border-black">
                  {availability === 'in_stock' ? 'En stock' : 'Rupture de stock'} <IconX className="h-3 w-3" />
                </button>
              )}
              {priceParam && (
                <button type="button" onClick={() => updateParam('price', '')} className="flex items-center gap-1 border border-black/15 px-2 py-1 text-[10px] uppercase hover:border-black">
                  {priceParam.replace('-', ' – ')} TND <IconX className="h-3 w-3" />
                </button>
              )}
              <button type="button" onClick={resetFilters} className="text-[10px] font-bold uppercase tracking-widest underline underline-offset-4 hover:opacity-60">
                Tout effacer
              </button>
            </div>
          )}

          {error ? (
            <ErrorState onRetry={() => setError(false)} />
          ) : loading ? (
            <ProductGrid loading />
          ) : data.data.length === 0 ? (
            <EmptyState
              title="Aucun produit trouvé"
              description="Essayez d'ajuster vos filtres ou votre recherche."
              action="Réinitialiser les filtres"
              onAction={resetFilters}
            />
          ) : (
            <>
              <ProductGrid products={data.data} />
              <Pager
                page={data.pagination?.page || page}
                totalPages={data.pagination?.totalPages || 0}
                hasNextPage={data.pagination?.hasNextPage}
                hasPreviousPage={data.pagination?.hasPreviousPage}
                onPrev={() => goToAdjacentPage(-1)}
                onNext={() => goToAdjacentPage(1)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterPanel({
  facets, category, collection, sizes, colors, availability, priceRange, setPriceRange,
  onCategory, onCollection, onSize, onColor, onAvailability, onApplyPrice, onReset, compact = false,
}) {
  return (
    <div className={cn('space-y-8', compact && 'space-y-6')}>
      <Group title="Catégories">
        <RadioRow label="Tout" active={category === 'all'} onClick={() => onCategory('')} />
        {facets.categories.map((c) => (
          <RadioRow key={c.id} label={c.name} active={category === c.slug} onClick={() => onCategory(c.slug)} />
        ))}
      </Group>

      <Group title="Collections">
        <RadioRow label="Tout" active={collection === 'all'} onClick={() => onCollection('')} />
        {facets.collections.map((c) => (
          <RadioRow key={c.id} label={c.name} active={collection === c.slug} onClick={() => onCollection(c.slug)} />
        ))}
      </Group>

      <Group title="Prix (TND)">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            placeholder="Min"
            aria-label="Prix minimum"
            value={priceRange[0] ?? ''}
            onChange={(e) => setPriceRange([e.target.value === '' ? null : Number(e.target.value), priceRange[1]])}
            className="input h-10 text-xs"
          />
          <span className="text-neutral-400">–</span>
          <input
            type="number"
            min="0"
            placeholder="Max"
            aria-label="Prix maximum"
            value={priceRange[1] ?? ''}
            onChange={(e) => setPriceRange([priceRange[0], e.target.value === '' ? null : Number(e.target.value)])}
            className="input h-10 text-xs"
          />
        </div>
        <button type="button" onClick={onApplyPrice} className="mt-3 w-full border border-black py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white">
          Appliquer
        </button>
      </Group>

      <Group title="Taille">
        <div className="flex flex-wrap gap-2">
          {facets.sizes.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={sizes.includes(s)}
              onClick={() => onSize(s)}
              className={cn('min-w-10 border px-3 py-2 text-xs font-semibold transition-colors', sizes.includes(s) ? 'border-black bg-black text-white' : 'border-black/15 hover:border-black')}
            >
              {s}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Couleur">
        <div className="flex flex-wrap gap-2">
          {facets.colors.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={colors.includes(c)}
              onClick={() => onColor(c)}
              className={cn(
                'flex items-center gap-2 border px-3 py-2 text-xs font-semibold uppercase transition-colors',
                colors.includes(c) ? 'border-black bg-black text-white' : 'border-black/15 hover:border-black',
              )}
            >
              <span
                className="h-3 w-3 rounded-full border border-black/20"
                style={{ background: swatchFor(c) }}
              />
              {colorName(c)}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Disponibilité">
        {[
          { v: '', label: 'Tout' },
          { v: 'in_stock', label: 'En stock' },
          { v: 'out_of_stock', label: 'Rupture de stock' },
        ].map((o) => (
          <RadioRow key={o.label} label={o.label} active={availability === o.v} onClick={() => onAvailability(o.v)} />
        ))}
      </Group>

      <button type="button" onClick={onReset} className="w-full border border-black/20 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-100">
        Tout réinitialiser
      </button>
    </div>
  )
}

function Group({ title, children }) {
  return (
    <div>
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wide3 text-neutral-500">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function RadioRow({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex w-full items-center gap-2 py-1 text-xs font-medium capitalize transition-colors hover:opacity-60"
    >
      <span className={cn('flex h-3.5 w-3.5 items-center justify-center rounded-full border', active ? 'border-black' : 'border-black/25')}>
        {active && <span className="h-1.5 w-1.5 rounded-full bg-black" />}
      </span>
      <span className={active ? 'text-black' : 'text-neutral-600'}>{label}</span>
    </button>
  )
}