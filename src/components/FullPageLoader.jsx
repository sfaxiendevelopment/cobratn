export default function FullPageLoader({ label = 'Chargement…' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-white">
      <div className="flex items-center gap-2">
        <span className="block h-2 w-2 animate-pulse bg-black" />
        <span className="block h-2 w-2 animate-pulse bg-black [animation-delay:200ms]" />
        <span className="block h-2 w-2 animate-pulse bg-black [animation-delay:400ms]" />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-widest2 text-neutral-500" role="status">
        {label}
      </p>
    </div>
  )
}