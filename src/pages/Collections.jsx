import { useEffect, useState } from 'react'
import { getCollections, isSupabaseConfigured } from '../lib/api'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import CollectionCard from '../components/CollectionCard'
import Reveal from '../components/Reveal'
import { EmptyState, ErrorState } from '../components/ErrorState'

export default function Collections() {
  useDocumentMeta('Collections — COBRA TN', 'Découvrez les collections COBRA TN.')
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let cancelled = false
    setLoading(true)
    setError(false)
    getCollections()
      .then((rows) => {
        if (cancelled) return
        setCollections(Array.isArray(rows) ? rows : [])
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setCollections([])
        setError(true)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="container-page pb-24 pt-24 lg:pb-32 lg:pt-32">
      <div className="border-b border-black/10 pb-8">
        <p className="label text-neutral-400">Sélection</p>
        <h1 className="section-title">Collections</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-500">
          Chaque collection est bâtie autour d'une idée. Des drops choisis, des pièces rares, des essentiels du quotidien — le tout dans l'esprit COBRA TN.
        </p>
      </div>

      <div className="mt-10">
        {!isSupabaseConfigured ? (
          <EmptyState
            title="Supabase n'est pas connecté"
            description="Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY à un fichier .env pour charger vos collections."
          />
        ) : error ? (
          <ErrorState message="Nous n'avons pas pu charger les collections." onRetry={() => window.location.reload()} />
        ) : loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[4/5] w-full" />
            ))}
          </div>
        ) : collections.length ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((c, i) => (
              <Reveal key={c.id} delay={(i % 3) * 100}>
                <CollectionCard collection={c} tall />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Aucune collection pour le moment"
            description="Les collections apparaîtront ici dès qu'elles seront publiées dans Supabase."
          />
        )}
      </div>
    </div>
  )
}
