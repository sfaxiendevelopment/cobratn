import { Link } from 'react-router-dom'
import { useState } from 'react'
import { cn } from '../lib/utils'

/** Large editorial collection tile. */
export default function CollectionCard({ collection, tall = false }) {
  const [err, setErr] = useState(false)
  const image = err || !collection.image_url ? '/images/placeholder-collection.svg' : collection.image_url

  return (
    <Link
      to={`/collections/${collection.slug}`}
      className={cn('group relative block overflow-hidden bg-black', tall ? 'aspect-[3/4]' : 'aspect-[4/5]')}
      aria-label={`Découvrir la collection ${collection.name}`}
    >
      <img
        src={image}
        alt={collection.name}
        loading="lazy"
        onError={() => setErr(true)}
        className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6 lg:p-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest2 text-white/60">Collection</p>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-wide text-white lg:text-3xl">
            {collection.name}
          </h3>
        </div>
        <span className="flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white opacity-80 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1">
          Découvrir →
        </span>
      </div>
    </Link>
  )
}