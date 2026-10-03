import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getProductBySlug, getRelatedProducts, isSupabaseConfigured } from '../lib/api'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { useCart } from '../contexts/CartContext'
import { useWishlist } from '../contexts/WishlistContext'
import { useUI } from '../contexts/UIContext'
import ProductGrid from '../components/ProductGrid'
import SizeGuide from '../components/SizeGuide'
import { ProductPageSkeleton } from '../components/LoadingSkeleton'
import { ErrorState } from '../components/ErrorState'
import { formatPrice, getProductImage, cn, swatchFor, colorName } from '../lib/utils'
import { IconHeart, IconHeartFilled, IconStar, IconTruck, IconBox, IconCheck, IconArrowRight } from '../components/icons'

export default function ProductPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { add, openCart } = useCart()
  const { has, toggle } = useWishlist()
  const { toast } = useUI()

  const [product, setProduct] = useState(null)
  const [docTitle, setDocTitle] = useState('Produit — COBRA TN')
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [color, setColor] = useState(null)
  const [size, setSize] = useState(null)
  const [qty, setQty] = useState(1)
  const [activeImg, setActiveImg] = useState(0)
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)
  const [zoom, setZoom] = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })
  const [buying, setBuying] = useState(false)
  const [addError, setAddError] = useState('')
  const imgRef = useRef(null)

  useDocumentMeta(docTitle, product?.description?.slice(0, 160))

  useEffect(() => {
    if (!isSupabaseConfigured || !slug) {
      setLoading(false)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    setProduct(null)
    setRelated([])
    setDocTitle('Produit — COBRA TN')
    getProductBySlug(slug)
      .then(async (data) => {
        if (cancelled) return
        if (!data) {
          setNotFound(true)
          setLoading(false)
          return
        }
        setProduct(data)
        setDocTitle(`${data.name} — COBRA TN`)
        setColor(null)
        setSize(null)
        setQty(1)
        setAddError('')
        setActiveImg(0)
        setLoading(false)
        const rows = await getRelatedProducts(data, 4)
        if (!cancelled) setRelated(rows || [])
      })
      .catch(() => {
        if (cancelled) return
        setNotFound(true)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (!isSupabaseConfigured) {
    return (
      <div className="container-page pb-24 pt-32">
        <ErrorState message="Supabase n'est pas encore configuré. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY à votre .env." />
      </div>
    )
  }

  if (loading) return <ProductPageSkeleton />

  if (notFound || !product) {
    return (
      <div className="container-page pb-24 pt-32">
        <ErrorState message="Ce produit est actuellement indisponible." onRetry={() => navigate('/shop')} />
      </div>
    )
  }

  const variants = product.variants || []
  const images = product.images?.length ? product.images.map((i) => i.url) : [getProductImage(product)]

  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))]
  const activeColor = color || colors[0] || null
  const colorVariants = variants.filter((v) => (v.color || null) === activeColor)
  const sizes = [...new Set(colorVariants.map((v) => v.size).filter(Boolean))]
  const activeSize = size || (sizes.includes('M') ? 'M' : sizes[0])
  const variant =
    colorVariants.find((v) => (v.size || null) === activeSize) || colorVariants[0] || variants[0] || null

  const displayPrice = Number(product.effective_price ?? product.sale_price ?? product.price ?? 0)
  const stock = Number(variant?.stock ?? product.stock ?? 0)
  const stocked = Boolean(variant?.available ?? product.available) && stock > 0
  const lowStock = stocked && stock <= 5
  const wished = has(product.id)

  // Explains, in words, why the current colour/size pair cannot be bought.
  const unavailableMessage = !variant
    ? 'Cette pièce est actuellement indisponible.'
    : !stocked
      ? variant.size
        ? `La taille ${variant.size} est épuisée en ${variant.color}.`
        : variant.color
          ? `${variant.color} est épuisé.`
          : 'Cette pièce est actuellement épuisée.'
      : ''

  const handleAdd = async (goCheckout = false) => {
    if (!variant || !stocked) {
      setAddError(unavailableMessage || 'Cette taille est indisponible.')
      return
    }
    setBuying(true)
    setAddError('')
    try {
      await add(product, {
        color: variant.color,
        size: variant.size,
        variantId: variant.id ?? null,
        quantity: qty,
      })
      if (goCheckout) {
        navigate('/checkout')
      } else {
        toast(`${product.name}${variant.size ? ` (${variant.size})` : ''} ajouté au panier`)
        openCart()
      }
    } catch (err) {
      setAddError(err?.message || 'Cette taille ou cette couleur est indisponible.')
    } finally {
      setBuying(false)
    }
  }

  const handleZoom = (e) => {
    const rect = imgRef.current?.getBoundingClientRect()
    if (!rect) return
    setZoomPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  return (
    <div className="pb-24 pt-24 lg:pb-32 lg:pt-32">
      {/* Breadcrumbs */}
      <nav className="container-page mb-8 text-[11px] font-medium uppercase tracking-widest text-neutral-500" aria-label="Fil d'Ariane">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link to="/" className="hover:text-black">Accueil</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link to="/shop" className="hover:text-black">Boutique</Link></li>
          <li aria-hidden="true">/</li>
          <li className="font-semibold text-black">{product.name}</li>
        </ol>
      </nav>

      <div className="container-page grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Gallery */}
        <div>
          <div
            ref={imgRef}
            className="relative aspect-[4/5] overflow-hidden border border-black/10 bg-neutral-100"
            onMouseEnter={() => setZoom(true)}
            onMouseLeave={() => setZoom(false)}
            onMouseMove={handleZoom}
          >
            <img
              src={images[activeImg]}
              alt={`${product.name} — image ${activeImg + 1} sur ${images.length}`}
              className={cn(
                'h-full w-full object-cover transition-transform duration-300',
                zoom && 'cursor-zoom-in scale-[1.6]',
              )}
              style={zoom ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : undefined}
              onError={(e) => (e.currentTarget.src = '/images/placeholder-product-front.svg')}
            />
          </div>

          {images.length > 1 && (
            <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
              {images.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  aria-label={`Voir l'image ${i + 1}`}
                  className={cn(
                    'h-24 w-20 shrink-0 overflow-hidden border transition-colors',
                    activeImg === i ? 'border-black' : 'border-transparent hover:border-black/40',
                  )}
                >
                  <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.src = '/images/placeholder-product-front.svg')} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.category?.name && (
            <Link
              to={product.category.slug ? `/shop?category=${product.category.slug}` : '/shop'}
              className="text-[10px] font-bold uppercase tracking-widest2 text-neutral-500 hover:text-black"
            >
              {product.category.name}
            </Link>
          )}
          <h1 className="mt-2 text-3xl font-black uppercase tracking-wide lg:text-4xl">{product.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1 text-black" aria-label="Noté 4,5 sur 5 étoiles">
              {Array.from({ length: 5 }).map((_, i) => (
                <IconStar key={i} className="h-4 w-4" />
              ))}
              {product.sales_count > 0 && (
                <span className="ml-1 text-[11px] font-semibold text-neutral-500">{product.sales_count} vendu{product.sales_count > 1 ? 's' : ''}</span>
              )}
            </div>
            <span className={cn('text-[10px] font-bold uppercase tracking-widest', stocked ? (lowStock ? 'text-amber-600' : 'text-green-700') : 'text-red-600')}>
              {stocked ? (lowStock ? `Stock faible — ${stock} restant${stock > 1 ? 's' : ''}` : 'En stock') : 'Rupture de stock'}
            </span>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <span className="text-2xl font-extrabold">{formatPrice(displayPrice)}</span>
            {product.sku && <span className="ml-auto text-[10px] uppercase tracking-widest text-neutral-400">SKU: {product.sku}</span>}
          </div>

          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between">
              <span className="label">Couleur — <span className="normal-case tracking-normal text-neutral-600">{activeColor ? colorName(activeColor) : 'Une seule couleur'}</span></span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {colors.length ? (
                colors.map((c) => {
                  const soldOut = !variants.some((v) => (v.color || null) === c && v.available)
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { setColor(c); setSize(null); setAddError('') }}
                      aria-label={`Couleur ${colorName(c)}${soldOut ? ' (épuisée)' : ''}`}
                      aria-pressed={activeColor === c}
                      className={cn(
                        'h-8 w-8 rounded-full border transition-all',
                        activeColor === c ? 'border-black ring-2 ring-black ring-offset-2' : 'border-black/20 hover:border-black',
                        soldOut && 'cursor-not-allowed opacity-30',
                      )}
                      style={{ background: swatchFor(c) }}
                    />
                  )
                })
              ) : (
                <span className="text-xs text-neutral-500">Aucune option de couleur</span>
              )}
            </div>
          </div>

          {sizes.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="label">Taille</span>
                <button type="button" onClick={() => setSizeGuideOpen(true)} className="text-[10px] font-semibold uppercase tracking-widest underline underline-offset-4 hover:opacity-60">
                  Guide des tailles
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const v = colorVariants.find((x) => (x.size || null) === s)
                  const unavailable = !v || !v.available
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={unavailable}
                      onClick={() => { setSize(s); setAddError('') }}
                      aria-pressed={activeSize === s}
                      className={cn(
                        'min-w-14 border px-4 py-3 text-xs font-bold uppercase transition-colors',
                        activeSize === s ? 'border-black bg-black text-white' : 'border-black/20 hover:border-black',
                        unavailable && 'cursor-not-allowed opacity-30 line-through',
                      )}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {(addError || unavailableMessage) && (
            <p role="status" className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
              {addError || unavailableMessage}
            </p>
          )}

          <div className="mt-8 flex items-center gap-3">
            <div className="flex items-center border border-black/20">
              <button type="button" onClick={() => { setQty((q) => Math.max(1, q - 1)); setAddError('') }} className="px-4 py-3.5 hover:bg-neutral-100" aria-label="Diminuer la quantité">−</button>
              <span className="w-12 text-center text-sm font-bold" aria-live="polite">{qty}</span>
              <button type="button" onClick={() => { setQty((q) => q + 1); setAddError('') }} className="px-4 py-3.5 hover:bg-neutral-100" aria-label="Augmenter la quantité">+</button>
            </div>
            <button type="button" onClick={() => toggle(product.id)} aria-pressed={wished} className="flex h-12 w-12 shrink-0 items-center justify-center border border-black/20 transition-colors hover:border-black">
              {wished ? <IconHeartFilled className="h-5 w-5" /> : <IconHeart className="h-5 w-5" />}
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button type="button" disabled={!stocked || buying} onClick={() => handleAdd(false)} className="btn-primary">
              {stocked ? 'Ajouter au panier' : 'Rupture de stock'}
            </button>
            <button type="button" disabled={!stocked || buying} onClick={() => handleAdd(true)} className="btn-secondary">
              Acheter maintenant
            </button>
          </div>

          <div className="mt-8 space-y-3 border-t border-black/10 pt-6 text-xs">
            <p className="flex items-center gap-3 text-neutral-600"><IconTruck className="h-4 w-4 shrink-0" /> Livraison sous 48 heures partout en Tunisie.</p>
            <p className="flex items-center gap-3 text-neutral-600"><IconBox className="h-4 w-4 shrink-0" /> Livraison offerte dès 200 TND d'achat.</p>
            <p className="flex items-center gap-3 text-neutral-600"><IconCheck className="h-4 w-4 shrink-0" /> Paiement à la livraison disponible.</p>
          </div>

          {/* Tabs */}
          <div className="mt-8 border-t border-black/10">
            <DetailsTabs product={product} />
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="container-page mt-24">
          <div className="flex items-end justify-between">
            <div>
              <p className="label text-neutral-400">Vous aimerez aussi</p>
              <h2 className="section-title">Produits similaires</h2>
            </div>
            <Link to="/shop" className="hidden items-center gap-2 text-[11px] font-bold uppercase tracking-widest hover:opacity-60 sm:flex">
              Voir tout <IconArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10">
            <ProductGrid products={related} skeletonCount={4} />
          </div>
        </section>
      )}

      <SizeGuide open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} product={product} />

      {/* Sticky mobile add to cart */}
      <div className="fixed inset-x-0 bottom-[52px] z-30 border-t border-black/10 bg-white p-3 lg:hidden">
        <button type="button" disabled={!stocked || buying} onClick={() => handleAdd(false)} className="btn-primary w-full">
          {stocked ? `Ajouter au panier — ${formatPrice(Number(variant?.price || displayPrice) * qty)}` : 'Rupture de stock'}
        </button>
      </div>
    </div>
  )
}

function DetailsTabs({ product }) {
  const [tab, setTab] = useState('description')
  const tabs = [
    { key: 'description', label: 'Description' },
    { key: 'shipping', label: 'Livraison & retours' },
  ]
  return (
    <div>
      <div className="flex overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'whitespace-nowrap border-b-2 px-4 py-4 text-[11px] font-bold uppercase tracking-widest transition-colors',
              tab === t.key ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-black',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="py-6 text-sm leading-relaxed text-neutral-600">
        {tab === 'description' && <p>{product.description || 'Aucune description pour le moment.'}</p>}
        {tab === 'shipping' && (
          <div className="space-y-4">
            <p>
              Les commandes sont expédiées sous 24 heures, du lundi au samedi. La livraison en Tunisie prend 48 heures selon votre gouvernorat.
            </p>
            <p>
              Les articles non portés peuvent être retournés dans les 14 jours suivant la livraison pour un remboursement intégral. Ils doivent être renvoyés avec leurs étiquettes.
            </p>
            <Link to="/faq" className="font-semibold underline underline-offset-4 text-black">
              Lire notre politique complète de livraison et de retour →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}