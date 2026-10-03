import { useUI } from '../contexts/UIContext'
import { cn } from '../lib/utils'

function ToastIcon({ type }) {
  return (
    <span
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
        type === 'success' && 'bg-black text-white',
        type === 'error' && 'bg-white text-black border border-black',
        type === 'info' && 'bg-neutral-200 text-black',
      )}
      aria-hidden="true"
    >
      {type === 'success' ? '✓' : type === 'error' ? '✕' : 'i'}
    </span>
  )
}

export default function Toasts() {
  const { toasts, dismissToast } = useUI()
  if (!toasts.length) return null

  return (
    <div
      className="fixed left-1/2 top-4 z-[120] flex w-[94vw] max-w-md -translate-x-1/2 flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-start gap-3 border border-black bg-white p-4 shadow-lg animate-slide-up"
        >
          <ToastIcon type={t.type} />
          <p className="flex-1 text-xs font-medium leading-relaxed">{t.message}</p>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            className="text-neutral-400 transition-colors hover:text-black"
            aria-label="Fermer la notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}