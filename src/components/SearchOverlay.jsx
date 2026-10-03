import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUI } from '../contexts/UIContext'
import { getProducts, getCategories } from '../lib/api'
import { useDebounce } from '../hooks/useDocumentMeta'
import { formatPrice, getProductImage } from '../lib/utils'
import { IconSearch, IconX } from './icons'
import { ProductCardSkeleton } from './LoadingSkeleton'

const MAX_CATEGORY_CHIPS = 8

export default function SearchOverlay() {
  const { searchOpen, closeSearch } = useUI()
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [categories, setCategories] = useState([])
  const debounced = useDebounce(term, 300)
  const inputRef = useRef(null)

  useEffect(() => {
    document.body.classList.toggle('lock-scroll', searchOpen)
    return () => document.body.classList.remove('lock-scroll')
  }, [searchOpen])

  useEffect(() => {
    let cancelled = false
    getCategories()
      .then((rows) => {
        if (cancelled) return
        setCategories((rows || []).filter((row) => row?.slug).slice(0, MAX_CATEGORY_CHIPS))
      })
      .catch(() => {
        if (!cancelled) setCategories([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (searchOpen) {
      setTerm('')
      setResults([])
      setNotFound(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [searchOpen])

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([])
      setNotFound(false)
      setLoading(false)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    getProducts({ search: debounced, limit: 8 })
      .then((res) => {
        if (cancelled) return
        setResults(res?.data || [])
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setResults([])
        setNotFound(true)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debounced])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') closeSearch()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeSearch])

  const go = (path) => {
    closeSearch()
    navigate(path)
  }

  const submit = (e) => {
    e.preventDefault()
    if (term.trim()) go(`/shop?search=${encodeURIComponent(term.trim())}`)
  }

  if (!searchOpen) return null

  return (
    <div className="fixed inset-0 z-[115] flex flex-col bg-white animate-fade-in" role="dialog" aria-modal="true" aria-label="Recherche">
      <div className="border-b border-black/10">
        <div className="container-page flex h-20 items-center gap-4 lg:h-24">
          <form onSubmit={submit} className="flex flex-1 items-center gap-4">
            <IconSearch className="h-5 w-5 shrink-0 text-neutral-500" />
            <input
              ref={inputRef}
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Rechercher sur COBRA TN"
              aria-label="Rechercher sur COBRA TN"
              className="w-full bg-transparent text-lg font-semibold uppercase tracking-wide outline-none placeholder:text-neutral-300"
            />
          </form>
          <button
            type="button"
            onClick={closeSearch}
            aria-label="Fermer la recherche"
            className="flex h-10 w-10 items-center justify-center border border-black/10 hover:bg-black hover:text-white"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="container-page flex-1 overflow-y-auto py-8">
        {!term.trim() ? (
          <div>
            {categories.length > 0 && (
              <>
                <p className="label text-neutral-400">Catégories populaires</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => go(`/shop?category=${c.slug}`)}
                      className="border border-black/15 px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors hover:border-black hover:bg-black hover:text-white"
                    >
                      {c.name || c.slug.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="mt-10 max-w-lg">
              <p className="text-3xl font-extrabold uppercase leading-tight tracking-wide3">
                Rechercher sur COBRA&nbsp;TN
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                Trouvez votre style par nom, description, catégorie ou collection.
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="label text-neutral-400">
              {loading ? 'Recherche…' : `${results.length} résultat${results.length === 1 ? '' : 's'} pour « ${term} »`}
            </p>
            {loading ? (
              <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : notFound ? (
              <div className="mt-12 text-center">
                <p className="text-sm font-semibold uppercase tracking-wide3">Recherche indisponible</p>
                <p className="mt-2 text-xs text-neutral-500">Le catalogue est inaccessible. Veuillez réessayer.</p>
              </div>
            ) : results.length ? (
              <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => go(`/product/${p.slug}`)}
                      className="group w-full text-left"
                    >
                      <div className="aspect-[4/5] overflow-hidden bg-neutral-100">
                        <img
                          src={getProductImage(p)}
                          alt={p.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => (e.currentTarget.src = '/images/placeholder-product-front.svg')}
                        />
                      </div>
                      <p className="mt-3 text-xs font-semibold uppercase">{p.name}</p>
                      <p className="mt-0.5 text-xs font-bold">{formatPrice(p.effective_price)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-12 text-center">
                <p className="text-sm font-semibold uppercase tracking-wide3">Aucun résultat</p>
                <p className="mt-2 text-xs text-neutral-500">Essayez un autre mot-clé.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}