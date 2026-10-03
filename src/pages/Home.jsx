import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getHomepageSections, getFeaturedProducts, getCollections, isSupabaseConfigured } from '../lib/api'
import { socialHandle } from '../lib/utils'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import useSiteSettings from '../hooks/useSiteSettings'
import { useLanguage } from '../contexts/LanguageContext'
import Hero from '../components/Hero'
import CollectionCard from '../components/CollectionCard'
import ProductGrid from '../components/ProductGrid'
import Reveal from '../components/Reveal'
import { EmptyState, ErrorState } from '../components/ErrorState'
import { IconArrowRight, IconBag, IconTruck, IconBox, IconInstagram, IconTiktok, IconFacebook } from '../components/icons'

const MARQUEE_ITEMS = [
  'COBRA TN',
  'MORE THAN CLOTHES',
  "IT'S A MINDSET",
  'NOUVELLE SÉRIE',
  'STREETWEAR PREMIUM',
  'FABRIQUÉ EN TUNISIE',
]

export default function Home() {
  const { t } = useLanguage()
  const { social } = useSiteSettings()

  useDocumentMeta(
    'COBRA TN — More than clothes.',
    'Premium monochrome streetwear from Tunisia. Modern clothing built for people who move with purpose.',
  )

  const [sections, setSections] = useState({})
  const [featured, setFeatured] = useState([])
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    setError(false)
    Promise.all([
      getHomepageSections(),
      getFeaturedProducts(8),
      getCollections({ featuredOnly: true, limit: 4 }),
    ])
      .then(([s, p, c]) => {
        if (cancelled) return
        if (s && Object.keys(s).length) setSections(s)
        setFeatured(Array.isArray(p) ? p : [])
        setCollections((Array.isArray(c) ? c : []).slice(0, 4))
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setFeatured([])
        setCollections([])
        setError(true)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const featuredSection = sections.featured_collection

  return (
    <>
      <Hero section={sections.hero} />

      {/* Marquee stripe */}
      <div className="overflow-hidden border-y border-black/10 bg-white py-3">
        <div className="flex w-max animate-marquee gap-0 whitespace-nowrap">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="flex items-center gap-6 px-6 text-[11px] font-bold uppercase tracking-widest2 text-black">
              {item}
              <span className="text-neutral-300">•</span>
            </span>
          ))}
        </div>
      </div>

      {/* Perks strip */}
      <section className="border-b border-black/10 bg-black">
        <div className="container-page grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { icon: IconTruck, title: t('fastDelivery'), sub: t('fastDeliverySub') },
            { icon: IconBox, title: t('premiumQuality'), sub: t('premiumQualitySub') },
            { icon: IconBag, title: t('easyExchange'), sub: t('easyExchangeSub') },
          ].map((f) => (
            <div key={f.title} className="flex items-center gap-4 py-6">
              <f.icon className="h-6 w-6 text-white" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-white">{f.title}</p>
                <p className="mt-0.5 text-[11px] text-white/50">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* New arrivals */}
      <section className="container-page py-16 lg:py-24">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label text-neutral-400">{t('fresh')}</p>
              <h2 className="section-title">{t('newArrivals')}</h2>
            </div>
            <Link to="/shop" className="group flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest hover:opacity-60">
              {t('viewAll')}
              <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>

        <div className="mt-10">
          {error ? (
            <ErrorState message="Nous n'avons pas pu charger le catalogue." onRetry={() => window.location.reload()} />
          ) : loading || featured.length === 0 ? (
            <ProductGrid loading={loading} skeletonCount={8} />
          ) : (
            <ProductGrid products={featured.slice(0, 8)} />
          )}
        </div>
      </section>

      {/* Collections */}
      <section className="bg-neutral-100 py-16 lg:py-24">
        <div className="container-page">
          <Reveal>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="label text-neutral-400">{t('curated')}</p>
                <h2 className="section-title">{t('collections')}</h2>
              </div>
              <Link to="/collections" className="hidden items-center gap-2 text-[11px] font-bold uppercase tracking-widest hover:opacity-60 sm:flex">
                {t('allCollections')} <IconArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>

          <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton aspect-[4/5] w-full" />
                ))
              : collections.length
                ? collections.map((c, i) => (
                    <Reveal key={c.id} delay={i * 90}>
                      <CollectionCard collection={c} />
                    </Reveal>
                  ))
                : null}
          </div>
        </div>
      </section>

      {/* Featured collection — editorial */}
      <section className="bg-white">
        <div className="grid lg:grid-cols-2">
          <Reveal className="relative min-h-[320px] overflow-hidden bg-black lg:min-h-[560px]">
            <img
              src={featuredSection?.image_url || '/images/placeholder-editorial.svg'}
              alt="LA NOUVELLE COLLECTION"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => (e.currentTarget.src = '/images/placeholder-editorial.svg')}
            />
          </Reveal>
          <Reveal className="flex items-center bg-neutral-100 px-6 py-16 lg:px-16 lg:py-24">
            <div className="max-w-md">
              <p className="label text-neutral-400">{t('featured')}</p>
              <h2 className="text-3xl font-black uppercase leading-tight tracking-wide lg:text-5xl">
                {featuredSection?.title || 'La nouvelle collection'}
              </h2>
              <span className="mt-6 block h-0.5 w-14 bg-black" />
              <p className="mt-6 text-sm leading-relaxed text-neutral-600">
                {featuredSection?.description ||
                  'Pensé pour les mouvements du quotidien. Conçu avec une exigence de qualité, de confort et d\'identité.'}
              </p>
              <Link
                to={featuredSection?.button_link || '/collections'}
                className="group mt-8 inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest"
              >
                <span className="border-b-2 border-black pb-1">{t('exploreCollection')}</span>
                <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Brand story */}
      <section className="relative overflow-hidden bg-black py-20 text-white lg:py-32">
        <div className="absolute inset-0 opacity-25">
          <img
            src={sections.brand_story?.image_url || '/images/placeholder-story.svg'}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(e) => (e.currentTarget.src = '/images/placeholder-story.svg')}
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="container-page relative z-10 text-center">
          <Reveal>
            <p className="text-[10px] font-semibold uppercase tracking-widest2 text-white/60">
              {sections.brand_story?.title || 'COBRA TN'}
            </p>
            <h2 className="mt-5 text-3xl font-black uppercase leading-tight sm:text-5xl lg:text-6xl">
              {sections.brand_story?.subtitle || 'MORE THAN CLOTHES.'}
            </h2>
            <p className="mt-4 text-sm font-semibold uppercase tracking-widest3 text-neutral-300">
              {sections.brand_story?.description || "It's a mindset."}
            </p>
            <Link to="/about" className="btn-dark-line mt-9">
              {t('ourStory')}
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Follow COBRA TN */}
      <section className="bg-white py-16 lg:py-24">
        <div className="container-page">
          <Reveal className="text-center">
            <p className="label text-neutral-400">{t('social')}</p>
            <h2 className="section-title">{t('followCobra')}</h2>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                name: 'Instagram',
                href: social.instagram,
                Icon: IconInstagram,
              },
              {
                name: 'TikTok',
                href: social.tiktok,
                Icon: IconTiktok,
              },
              {
                name: 'Facebook',
                href: social.facebook,
                Icon: IconFacebook,
              },
            ].map(({ name, href, Icon }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="group relative flex aspect-square flex-col items-center justify-center gap-3 border border-black/10 bg-neutral-100 transition-colors hover:bg-black"
                aria-label={`Suivez COBRA TN sur ${name}`}
              >
                <Icon className="h-12 w-12 transition-colors group-hover:text-white" />
                <span className="text-base font-extrabold uppercase tracking-widest text-black transition-colors group-hover:text-white">
                  {name}
                </span>
                <span className="text-xs uppercase tracking-widest text-neutral-500 transition-colors group-hover:text-white/70">
                  {socialHandle(href, name)}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Unconfigured banner (development only) */}
      {!isSupabaseConfigured && (
        <section className="container-page py-10">
          <EmptyState
            dark
            title="Connecter Supabase"
            description="La boutique attend un projet Supabase. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans un fichier .env, puis appliquez supabase/schema.sql pour publier produits et collections."
          />
        </section>
      )}
    </>
  )
}