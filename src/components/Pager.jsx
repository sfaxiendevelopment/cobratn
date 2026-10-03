/**
 * Shop results are offset-paginated in Supabase, so numbered pages are
 * addressable and `totalPages` comes straight from the row count.
 */
export default function Pager({
  page = 1,
  totalPages = 0,
  hasNextPage,
  hasPreviousPage,
  onPrev,
  onNext,
}) {
  const canPrev = hasPreviousPage ?? page > 1
  const canNext = hasNextPage ?? (totalPages > 0 && page < totalPages)

  if (!canPrev && !canNext) return null

  return (
    <nav className="mt-14 flex items-center justify-center gap-3" aria-label="Pagination">
      <button
        type="button"
        disabled={!canPrev}
        onClick={onPrev}
        aria-label="Page précédente"
        className="border border-black/15 px-4 py-2 text-xs font-semibold transition-colors hover:border-black disabled:cursor-not-allowed disabled:opacity-30"
      >
        ←
      </button>

      <span className="text-[11px] font-semibold uppercase tracking-wide2 text-neutral-500">
        Page {page}
        {totalPages > 0 && <span className="text-neutral-400"> sur {totalPages}</span>}
      </span>

      <button
        type="button"
        disabled={!canNext}
        onClick={onNext}
        aria-label="Page suivante"
        className="border border-black/15 px-4 py-2 text-xs font-semibold transition-colors hover:border-black disabled:cursor-not-allowed disabled:opacity-30"
      >
        →
      </button>
    </nav>
  )
}

export function PagerSummary({ count, loading, search }) {
  return (
    <p className="text-xs text-neutral-500">
      {loading ? 'Chargement…' : `${count} article${count === 1 ? '' : 's'}`}
      {search && <> pour « {search} »</>}
    </p>
  )
}
