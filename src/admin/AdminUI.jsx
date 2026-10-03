import { cn } from '../lib/utils'

export function AdminPage({ eyebrow, title, subtitle, actions, children }) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          {eyebrow && <p className="text-[10px] font-bold uppercase tracking-widest2 text-neutral-500">{eyebrow}</p>}
          <h1 className="mt-1 text-2xl font-extrabold uppercase tracking-wide text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-xs text-neutral-400">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  )
}

export function AdminCard({ title, children, className }) {
  return (
    <section className={cn('border border-neutral-800 bg-neutral-900 p-5', className)}>
      {title && <h2 className="text-[10px] font-bold uppercase tracking-widest2 text-neutral-400">{title}</h2>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-neutral-700 text-neutral-300',
    black: 'border-black bg-black text-white',
    green: 'border-emerald-600 bg-emerald-600 text-white',
    red: 'border-red-600 bg-red-600 text-white',
    amber: 'border-amber-500 bg-amber-500 text-black',
  }
  return (
    <span className={cn('inline-block border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest', tones[tone])}>
      {children}
    </span>
  )
}

export function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full border transition-colors',
        checked ? 'border-emerald-500 bg-emerald-500' : 'border-neutral-600 bg-neutral-800',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all',
          checked ? 'left-[17px]' : 'left-0.5',
        )}
      />
    </button>
  )
}

export function Field({ label, hint, children, className }) {
  return (
    <label className={cn('block', className)}>
      {label && <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-neutral-400">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-[11px] text-neutral-500">{hint}</span>}
    </label>
  )
}

export const adminInput =
  'w-full border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition-colors focus:border-neutral-400'

export function AdminButton({ children, variant = 'primary', className, ...props }) {
  const styles = {
    primary: 'border-black bg-white text-black hover:bg-neutral-200',
    dark: 'border-neutral-700 bg-neutral-900 text-white hover:border-neutral-500',
    danger: 'border-red-600 bg-red-600 text-white hover:bg-red-500',
    ghost: 'border border-neutral-700 bg-transparent text-neutral-300 hover:border-neutral-500 hover:text-white',
  }
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        styles[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}

export function EmptyRow({ children = 'Rien pour le moment.' }) {
  return <p className="py-10 text-center text-xs text-neutral-500">{children}</p>
}