import { useEffect } from 'react'
import { IconChevronDown } from './icons'

const DEFAULT_CHART = [
  { size: 'S', chest: '88–94 cm', length: '68 cm' },
  { size: 'M', chest: '94–100 cm', length: '70 cm' },
  { size: 'L', chest: '100–106 cm', length: '72 cm' },
  { size: 'XL', chest: '106–112 cm', length: '74 cm' },
  { size: 'XXL', chest: '112–118 cm', length: '76 cm' },
]

/** Modal size guide. Rows come from the product's `size_chart` (managed in admin)
 *  and fall back to the default only when the product has no chart configured. */
export default function SizeGuide({ open, onClose, product }) {
  useEffect(() => {
    document.body.classList.toggle('lock-scroll', open)
    return () => document.body.classList.remove('lock-scroll')
  }, [open])

  if (!open) return null

  let chart = DEFAULT_CHART
  try {
    if (product?.size_chart) {
      const parsed = typeof product.size_chart === 'string' ? JSON.parse(product.size_chart) : product.size_chart
      if (Array.isArray(parsed) && parsed.length) chart = parsed
    }
  } catch {
    chart = DEFAULT_CHART
  }

  const sortedByDefault = [...chart].sort((a, b) => {
    const order = ['S', 'M', 'L', 'XL', 'XXL', 'Taille unique']
    const ia = order.indexOf(a.size)
    const ib = order.indexOf(b.size)
    if (ia === -1 && ib === -1) return a.size.localeCompare(b.size)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Guide des tailles"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white p-6 lg:p-8 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold uppercase tracking-wide3">Guide des tailles</h3>
          <button type="button" onClick={onClose} aria-label="Fermer le guide des tailles" className="flex h-8 w-8 items-center justify-center hover:bg-neutral-100">
            <IconChevronDown className="h-4 w-4 rotate-180" />
          </button>
        </div>
        <p className="mt-2 text-[11px] text-neutral-500">Mesures en centimètres.</p>

        <table className="mt-4 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-black">
              <th className="py-2 pr-2 text-[10px] font-bold uppercase tracking-widest">Taille</th>
              <th className="py-2 pr-2 text-[10px] font-bold uppercase tracking-widest">Poitrine</th>
              <th className="py-2 text-[10px] font-bold uppercase tracking-widest">Longueur</th>
            </tr>
          </thead>
          <tbody>
            {sortedByDefault.map((row) => (
              <tr key={row.size} className="border-b border-black/10">
                <td className="py-2.5 pr-2 text-xs font-semibold">{row.size}</td>
                <td className="py-2.5 pr-2 text-xs text-neutral-600">{row.chest}</td>
                <td className="py-2.5 text-xs text-neutral-600">{row.length}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-4 text-[11px] leading-relaxed text-neutral-500">
          Les coupes sont volontairement oversize. En cas d'hésitation, prenez une taille en dessous pour un effet ajusté ou au-dessus pour une silhouette décontractée.
        </p>
      </div>
    </div>
  )
}