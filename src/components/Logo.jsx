import { cn } from '../lib/utils'

/**
 * COBRA TN brand logo.
 * withText controls whether the "COBRA TN" wordmark is shown beside the mark.
 */
export default function Logo({ variant = 'dark', withText = true, className, markClassName, textClassName }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <img
        src="/logocobrapng.png"
        alt="COBRA TN"
        className={cn(
          'h-20 w-20 object-contain',
          // On light/white backgrounds the mark is forced to black so it stays
          // visible; on dark backgrounds the PNG's own colours are kept.
          variant === 'dark' && 'brightness-0',
          markClassName,
        )}
      />
      {withText && (
        <span
          className={cn(
            'text-sm font-extrabold uppercase tracking-widest2 leading-none',
            variant === 'dark' ? 'text-black' : 'text-white',
            textClassName,
          )}
        >
          COBRA&nbsp;TN
        </span>
      )}
    </span>
  )
}