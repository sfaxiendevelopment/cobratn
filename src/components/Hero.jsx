import { Link } from 'react-router-dom'
import { useState } from 'react'

export default function Hero({ section }) {
  const [err, setErr] = useState(false)
  const title = section?.title || 'MORE THAN\nCLOTHES.'
  const subtitle = section?.subtitle || "IT'S A MINDSET."
  const description = section?.description || 'Modern clothing built for people who move with purpose.'
  const image = err || !section?.image_url ? '/images/placeholder-hero.svg' : section.image_url
  const titleLines = String(title)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return (
    <section className="relative flex min-h-[78vh] items-center justify-center overflow-hidden bg-black lg:min-h-[88vh]">
      <div className="absolute inset-0">
        <img
          src={image}
          alt="COBRA TN — More than clothes"
          className="h-full w-full object-cover animate-ken-burns"
          onError={() => setErr(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/35" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="container-page relative z-10 py-28 text-center lg:py-32">
        <p className="animate-fade-in text-[10px] font-semibold uppercase tracking-widest2 text-white/70 lg:text-xs">
          COBRA TN — Streetwear Premium
        </p>

        <h1 className="mt-6 animate-slide-up text-[13vw] font-black uppercase leading-[0.95] tracking-tight text-white sm:text-7xl lg:text-[100px]">
          {titleLines.length
            ? titleLines.map((line, index) => (
                <span key={line}>
                  {index > 0 && <br />}
                  {line}
                </span>
              ))
            : 'MORE THAN'}
        </h1>

        {subtitle && (
          <p className="mt-6 animate-slide-up text-sm font-semibold uppercase tracking-widest3 text-neutral-300 [animation-delay:150ms] sm:text-base lg:text-lg">
            {subtitle}
          </p>
        )}

        {description && (
          <p className="mx-auto mt-5 max-w-md animate-slide-up text-sm leading-relaxed text-white/70 [animation-delay:250ms]">
            {description}
          </p>
        )}

        <div className="mt-9 flex animate-slide-up flex-col items-center justify-center gap-3 sm:flex-row [animation-delay:350ms]">
          <Link to={section?.button_link || '/shop'} className="btn-primary w-full max-w-xs sm:w-auto">
            {section?.button_text || 'Voir la boutique'}
          </Link>
          <Link
            to="/collections"
            className="btn-dark-line w-full max-w-xs sm:w-auto"
          >
            Découvrir les collections
          </Link>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex">
        <span className="text-[9px] font-semibold uppercase tracking-widest2 text-white/50">Faites défiler</span>
        <span className="block h-10 w-px bg-gradient-to-b from-white/70 to-transparent" />
      </div>
    </section>
  )
}