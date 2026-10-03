import { cn } from '../lib/utils'

export function ErrorState({ message = 'Une erreur est survenue.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 border border-black/10 bg-white px-6 py-16 text-center">
      <span className="text-3xl font-black text-black">!</span>
      <p className="text-sm font-semibold uppercase tracking-wide2">{message}</p>
      <p className="text-xs text-neutral-500">Veuillez réessayer.</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-2">
          Réessayer
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, description, action, onAction, dark = false }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 px-6 py-16 text-center',
        dark ? 'bg-black text-white' : 'border border-black/10 bg-white text-black',
      )}
    >
      <p className={cn('text-xl font-extrabold uppercase tracking-wide3', dark ? 'text-white' : 'text-black')}>
        {title}
      </p>
      {description && (
        <p className={cn('max-w-md text-xs leading-relaxed', dark ? 'text-white/60' : 'text-neutral-500')}>
          {description}
        </p>
      )}
      {action && (
        <button type="button" onClick={onAction} className={cn(dark ? 'btn-light' : 'btn-primary mt-1')}>
          {action}
        </button>
      )}
    </div>
  )
}