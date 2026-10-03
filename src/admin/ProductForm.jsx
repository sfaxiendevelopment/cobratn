import { Fragment, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AdminPage, AdminCard, AdminButton, Field, Toggle, Badge, adminInput } from './AdminUI'
import {
  adminGetProduct,
  adminListProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminListCategories,
  adminListCollections,
  uploadProductImage,
  deleteProductImage,
} from '../lib/api'
import { useUI } from '../contexts/UIContext'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { slugify, formatPrice, getErrorMessage, SIZES, hexFor } from '../lib/utils'
import { IconChevronLeft, IconChevronRight, IconPlus, IconX } from '../components/icons'
import { ProductPageSkeleton } from '../components/LoadingSkeleton'

/* Offered first when adding a colour, so common choices land in a sensible order. */
const SWATCH_CHOICES = [
  '#000000',
  '#ffffff',
  '#808080',
  '#1f2937',
  '#7f1d1d',
  '#14532d',
  '#1e3a8a',
  '#78350f',
  '#f5f5f4',
  '#e11d48',
  '#0f766e',
  '#a16207',
]

/** Every palette colour is taken, so generate one that is not in use yet. */
const unusedHex = (used) => {
  for (let i = 0; i < 4096; i += 1) {
    const hex = `#${(((i + 1) * 2654435761) % 0xffffff).toString(16).padStart(6, '0')}`
    if (!used.has(hex)) return hex
  }
  return '#000000'
}

const EMPTY_FORM = {
  name: '',
  slug: '',
  description: '',
  price: '',
  sale_price: '',
  discount_percent: '',
  sku: '',
  stock: '0',
  category_id: '',
  collection_id: '',
  is_featured: false,
  is_published: false,
}

let rowKey = 0
const nextKey = () => `row-${(rowKey += 1)}`

function isSlugConflict(err) {
  const message = String(err?.message || '')
  return message.includes('slug') || message.includes('duplicate key value')
}

export default function ProductForm() {
  useDocumentMeta('Éditeur de produit — COBRA TN Admin')
  const navigate = useNavigate()
  const { toast } = useUI()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(EMPTY_FORM)
  const [variants, setVariants] = useState([])
  const [images, setImages] = useState([])
  const [categories, setCategories] = useState([])
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const fileRef = useRef(null)

  useEffect(() => {
    let active = true

    const boot = async () => {
      const [cats, cols] = await Promise.all([adminListCategories(), adminListCollections()])
      if (!active) return
      setCategories(cats)
      setCollections(cols)

      if (!isEdit) {
        setVariants([{ key: nextKey(), id: null, color: '#000000', size: '', sku: '', stock: '0', price: '' }])
        return
      }

      setLoading(true)
      try {
        const product = await adminGetProduct(id)
        if (!active) return
        if (!product) {
          setError("Ce produit n'existe plus.")
          return
        }
        setForm({
          name: product.name || '',
          slug: product.slug || '',
          description: product.description || '',
          price: String(product.price ?? 0),
          sale_price: product.sale_price == null ? '' : String(product.sale_price),
          discount_percent: product.discount_percent > 0 ? String(product.discount_percent) : '',
          sku: product.sku || '',
          stock: String(product.stock ?? 0),
          category_id: product.category_id || '',
          collection_id: product.collection_id || '',
          is_featured: Boolean(product.is_featured),
          is_published: Boolean(product.is_published),
        })
        // `mapProductRow` fabricates one unlabelled variant when a product has
        // no size rows, so keep only rows that actually exist in the database.
        const realVariants = (product.variants || []).filter((v) => v.id)
        setVariants(
          realVariants.length
            ? realVariants.map((v) => ({
                key: nextKey(),
                id: v.id,
                color: v.color || '',
                size: v.size || '',
                sku: v.sku || '',
                stock: String(v.stock ?? 0),
                price: v.price == null ? '' : String(v.price),
              }))
            : [{ key: nextKey(), id: null, color: '#000000', size: '', sku: '', stock: '0', price: '' }],
        )
        setImages(
          (product.images || []).map((img) => ({
            key: nextKey(),
            id: img.id,
            url: img.url,
            alt: img.alt || '',
          })),
        )
      } catch (err) {
        if (active) setError(getErrorMessage(err))
      } finally {
        if (active) setLoading(false)
      }
    }

    boot()
    return () => {
      active = false
    }
  }, [id, isEdit])

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  const onNameChange = (name) => {
    set({ name, ...(slugTouched ? {} : { slug: slugify(name) }) })
  }

  const onSlugChange = (slug) => {
    setSlugTouched(true)
    set({ slug })
  }

  const setVariant = (key, patch) =>
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, ...patch } : v)))

  const removeVariant = (key) => setVariants((prev) => prev.filter((v) => v.key !== key))

  const addVariantRow = (color, size) =>
    setVariants((prev) =>
      prev.some(
        (v) => String(v.color || '').trim() === color && String(v.size || '').trim() === String(size).trim(),
      )
        ? prev
        : [...prev, { key: nextKey(), id: null, color, size: String(size).trim(), sku: '', stock: '0', price: '' }],
    )

  const toggleSize = (color, size) => {
    const row = variants.find(
      (v) => String(v.color || '').trim() === color && String(v.size || '').trim() === String(size).trim(),
    )
    if (row) removeVariant(row.key)
    else addVariantRow(color, size)
  }

  /*
   * Grouped by a stable row key, never by the colour name. Keying on the name
   * made React rebuild the group on every keystroke (losing input focus), and
   * filtering out empty names made the whole group vanish mid-typing.
   */
  const colorGroups = []
  for (const row of variants) {
    const color = String(row.color || '').trim()
    if (!color) continue
    const existing = colorGroups.find((g) => g.color === color)
    if (existing) existing.rows.push(row)
    else colorGroups.push({ id: row.key, color, rows: [row] })
  }

  const addRowToColor = (color) =>
    setVariants((prev) => [
      ...prev,
      { key: nextKey(), id: null, color, size: '', sku: '', stock: '0', price: '' },
    ])

  const addColor = () => {
    const used = new Set(variants.map((v) => hexFor(v.color)))
    const color = SWATCH_CHOICES.find((hex) => !used.has(hex)) || unusedHex(used)
    const free = SIZES.find(
      (s) => !variants.some((v) => hexFor(v.color) === color && String(v.size || '').trim() === s),
    )
    addVariantRow(color, free || SIZES[0])
  }

  const setColorValue = (from, hex) =>
    setVariants((prev) =>
      prev.map((v) => (String(v.color || '').trim() === from ? { ...v, color: hex } : v)),
    )

  const removeColor = (color) =>
    setVariants((prev) => prev.filter((v) => String(v.color || '').trim() !== color))

  const moveImage = (index, direction) =>
    setImages((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const [row] = next.splice(index, 1)
      next.splice(target, 0, row)
      return next
    })

  const removeImage = async (image) => {
    if (image.id) {
      try {
        await deleteProductImage(image.id)
      } catch (err) {
        toast(getErrorMessage(err), 'error')
        return
      }
    }
    setImages((prev) => prev.filter((img) => img.key !== image.key))
  }

  const onFiles = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    setUploading(true)
    setError('')
    try {
      const uploaded = []
      for (const file of files) {
        const url = await uploadProductImage(file)
        uploaded.push({ key: nextKey(), id: null, url, alt: '' })
      }
      setImages((prev) => [...prev, ...uploaded])
      toast(
        `${uploaded.length} image${uploaded.length === 1 ? '' : 's'} téléversée${uploaded.length === 1 ? '' : 's'}`,
      )
    } catch (err) {
      setError(getErrorMessage(err))
      toast(getErrorMessage(err), 'error')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) {
      setError('Le nom du produit est obligatoire.')
      return
    }

    const slug = form.slug.trim() ? slugify(form.slug) : ''

    // A slug is unique across the table, so check it before the write to give
    // the user a message that names the field.
    if (slug) {
      const all = await adminListProducts({ includeUnpublished: true })
      const clash = all.find((p) => p.slug === slug && p.id !== id)
      if (clash) {
        setError(`L'identifiant URL « ${slug} » est déjà utilisé par « ${clash.name} ». Choisissez-en un autre.`)
        return
      }
    }

    const payload = {
      name: form.name.trim(),
      slug,
      description: form.description,
      price: Number(form.price) || 0,
      sale_price: form.sale_price === '' ? null : Number(form.sale_price),
      discount_percent: form.discount_percent === '' ? 0 : Math.min(100, Math.max(0, Number(form.discount_percent) || 0)),
      sku: form.sku.trim(),
      stock: Number(form.stock) || 0,
      category_id: form.category_id,
      collection_id: form.collection_id,
      is_featured: form.is_featured,
      is_published: form.is_published,
      variants: variants
        .filter((v) => String(v.size || '').trim())
        .map((v) => ({
          id: v.id || undefined,
          color: String(v.color || '').trim() || '#000000',
          size: String(v.size).trim(),
          sku: String(v.sku || '').trim() || null,
          stock: Number(v.stock) || 0,
          price: v.price === '' ? null : Number(v.price),
        })),
      images: images.map((img, index) => ({
        id: img.id || undefined,
        url: img.url,
        alt: String(img.alt || '').trim() || form.name.trim(),
        position: index,
      })),
    }

    setBusy(true)
    setError('')
    try {
      if (isEdit) {
        await adminUpdateProduct(id, payload)
        toast('Produit modifié')
      } else {
        await adminCreateProduct(payload)
        toast('Produit créé')
      }
      navigate('/admin/products')
    } catch (err) {
      const message = isSlugConflict(err)
        ? 'Cet identifiant URL de produit est déjà utilisé. Choisissez-en un autre.'
        : getErrorMessage(err)
      setError(message)
      toast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const effective = (() => {
    const cost = Number(form.price) || 0
    const selling = form.sale_price === '' ? cost : Number(form.sale_price) || 0
    const percent = Math.min(100, Math.max(0, Number(form.discount_percent) || 0))
    return percent > 0 ? Math.round(selling * (1 - percent / 100) * 100) / 100 : selling
  })()

  if (loading) return <ProductPageSkeleton />

  return (
    <AdminPage
      eyebrow="Catalogue"
      title={isEdit ? 'Modifier le produit' : 'Nouveau produit'}
      subtitle={isEdit ? `Modification de ${form.name || 'ce produit'}.` : 'Créez un produit, ses tailles et ses images.'}
      actions={
        <AdminButton variant="ghost" onClick={() => navigate('/admin/products')}>
          <IconChevronLeft className="h-4 w-4" /> Retour
        </AdminButton>
      }
    >
      {error && (
        <p className="mb-4 border border-red-600/40 bg-red-600/5 p-3 text-xs text-red-300" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <AdminCard title="Informations">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom" className="sm:col-span-2">
                <input
                  className={adminInput}
                  value={form.name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="Tee Logo Épais"
                  required
                />
              </Field>
              <Field label="Identifiant URL" hint={`URL en boutique : /product/${form.slug || slugify(form.name) || '…'}`}>
                <input
                  className={adminInput}
                  value={form.slug}
                  onChange={(e) => onSlugChange(e.target.value)}
                  placeholder="généré automatiquement à partir du nom"
                />
              </Field>
              <Field label="SKU" hint="Code interne facultatif.">
                <input
                  className={adminInput}
                  value={form.sku}
                  onChange={(e) => set({ sku: e.target.value })}
                  placeholder="CBR-TEE-001"
                />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <textarea
                  rows={5}
                  className={`${adminInput} h-auto py-3`}
                  value={form.description}
                  onChange={(e) => set({ description: e.target.value })}
                  placeholder="Tissu, coupe, ce qui mérite l'achat."
                />
              </Field>
            </div>
          </AdminCard>

          <AdminCard title="Prix et stock">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Prix de revient (TND)"
                hint="Ce qu'il vous coûte de le fabriquer. Jamais affiché aux clients — sert uniquement à calculer votre revenu net."
              >
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={adminInput}
                  value={form.price}
                  onChange={(e) => set({ price: e.target.value })}
                  required
                />
              </Field>
              <Field
                label="Prix de vente (TND)"
                hint="Le prix payé par les clients. Laissez vide pour retomber sur le prix de revient."
              >
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={adminInput}
                  value={form.sale_price}
                  onChange={(e) => set({ sale_price: e.target.value })}
                />
              </Field>
              <Field label="Stock" hint="Utilisé lorsque le produit n'a pas de tailles.">
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={adminInput}
                  value={form.stock}
                  onChange={(e) => set({ stock: e.target.value })}
                />
              </Field>
            </div>
            <div className="mt-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  label="Remise sur le prix de vente (%)"
                  hint="ex. 20 = les clients voient votre prix de vente moins 20 %."
                >
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    className={adminInput}
                    value={form.discount_percent}
                    onChange={(e) => set({ discount_percent: e.target.value })}
                    placeholder="0"
                  />
                </Field>
              </div>
            </div>
            {(() => {
              const cost = Number(form.price) || 0
              const selling = form.sale_price === '' ? cost : (Number(form.sale_price) || 0)
              const percent = Math.min(100, Math.max(0, Number(form.discount_percent) || 0))
              const customer = percent > 0 ? Math.round(selling * (1 - percent / 100) * 100) / 100 : selling
              const margin = customer - cost
              if (cost === 0 && selling === 0 && percent === 0) return null
              const parts = []
              if (percent > 0) parts.push(`${percent}% de remise`)
              if (margin < 0) {
                return (
                  <p className="mt-4 border border-red-600/40 bg-red-600/5 p-3 text-[11px] text-red-300">
                    Vente sous le prix de revient — après la remise, vous perdez{' '}
                    <span className="font-bold">{formatPrice(Math.abs(margin))}</span> par unité sur ce produit.
                  </p>
                )
              }
              return (
                <p className="mt-4 text-[11px] text-neutral-500">
                  Les clients paient <span className="font-bold text-white">{formatPrice(customer)}</span>
                  {parts.length ? <span className="text-neutral-400"> ({parts.join(', ')} à partir de {formatPrice(selling)})</span> : null}
                  {margin > 0 && (
                    <>
                      {' '}
                      — votre marge est <span className="font-bold text-white">{formatPrice(margin)}</span> par unité.
                    </>
                  )}
                </p>
              )
            })()}
          </AdminCard>

          <AdminCard title="Organisation">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Catégorie">
                <select
                  className={adminInput}
                  value={form.category_id}
                  onChange={(e) => set({ category_id: e.target.value })}
                >
                  <option value="">Sans catégorie</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Collection">
                <select
                  className={adminInput}
                  value={form.collection_id}
                  onChange={(e) => set({ collection_id: e.target.value })}
                >
                  <option value="">Aucune collection</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </AdminCard>

          <AdminCard title="Tailles et couleurs (variantes)">
            <p className="mb-4 text-[11px] text-neutral-500">
              Choisissez une couleur, puis cochez les tailles disponibles pour celle-ci. Chaque taille cochée
              devient sa propre variante vendable avec son propre stock. Une couleur sans aucune taille cochée est
              ignorée, et un produit sans aucune taille cochée est vendu comme un seul article sans étiquette.
            </p>
            <datalist id="cobra-sizes">
              {SIZES.map((size) => (
                <option key={size} value={size} />
              ))}
            </datalist>
            <p className="mb-4 -mt-2 text-[11px] text-neutral-600">
              Choisissez une couleur dans le sélecteur. Les tailles se cochent sous chaque couleur.
            </p>

            <div className="space-y-4">
              {colorGroups.map(({ id, color, rows: groupRows }) => {
                const swatch = hexFor(color)
                return (
                  <div key={id} className="border border-neutral-800 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <Field label="Couleur" className="mb-0 w-64">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={swatch}
                            onChange={(e) => setColorValue(color, e.target.value)}
                            aria-label={`Couleur ${swatch}`}
                            className="h-9 w-14 shrink-0 cursor-pointer border border-neutral-700 bg-white p-1"
                          />
                          <span className="font-mono text-xs uppercase text-white">{swatch}</span>
                        </div>
                      </Field>
                      <button
                        type="button"
                        onClick={() => removeColor(color)}
                        className="flex h-9 items-center gap-1 border border-red-600/40 px-3 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-600 hover:text-white"
                      >
                        <IconX className="h-3 w-3" /> Supprimer la couleur
                      </button>
                    </div>

                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                      Tailles disponibles
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SIZES.map((size) => {
                        const enabled = groupRows.some((v) => String(v.size).trim() === size)
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => toggleSize(color, size)}
                            className={`h-9 min-w-12 border px-3 text-xs font-bold transition-colors ${
                              enabled
                                ? 'border-black bg-black text-white'
                                : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                            }`}
                          >
                            {size}
                          </button>
                        )
                      })}
                    </div>

                    <div className="mt-3 grid items-center gap-2 border-t border-neutral-800 pt-3 sm:grid-cols-[1fr_5rem_5rem_2rem]">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Taille</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Stock</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                        Prix
                        <span className="font-normal normal-case text-neutral-600" title="Un champ vide utilise le prix du produit">
                          {' '}
                          (vide = prix du produit)
                        </span>
                      </div>
                      <div />
                      {groupRows.map((entry) => {
                        const standard = SIZES.includes(String(entry.size).trim())
                        return (
                          <Fragment key={entry.key}>
                            {standard ? (
                              <span className="text-sm font-bold text-white">{entry.size}</span>
                            ) : (
                              <input
                                className={adminInput}
                                list="cobra-sizes"
                                value={entry.size}
                                onChange={(e) => setVariant(entry.key, { size: e.target.value })}
                                placeholder="Taille personnalisée"
                              />
                            )}
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className={adminInput}
                              value={entry.stock}
                              onChange={(e) => setVariant(entry.key, { stock: e.target.value })}
                              aria-label={`Stock pour ${entry.size || 'taille personnalisée'}`}
                            />
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className={adminInput}
                              value={entry.price}
                              onChange={(e) => setVariant(entry.key, { price: e.target.value })}
                              placeholder="—"
                              aria-label={`Prix personnalisé pour ${entry.size || 'taille personnalisée'}`}
                            />
                            <button
                              type="button"
                              onClick={() => removeVariant(entry.key)}
                              aria-label={`Supprimer la taille ${entry.size || 'personnalisée'}`}
                              className="flex h-9 w-9 items-center justify-center border border-red-600/40 text-red-400 hover:bg-red-600 hover:text-white"
                            >
                              <IconX className="h-3 w-3" />
                            </button>
                          </Fragment>
                        )
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => addRowToColor(color)}
                      className="mt-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white"
                    >
                      + Ajouter une taille personnalisée à {swatch}
                    </button>
                  </div>
                )
              })}
              {colorGroups.length === 0 && (
                <p className="py-4 text-center text-xs text-neutral-500">
                  Ajoutez une couleur ci-dessous pour commencer à définir les tailles.
                </p>
              )}
            </div>

            <div className="mt-4">
              <AdminButton type="button" variant="dark" onClick={addColor}>
                <IconPlus className="h-4 w-4" /> Ajouter une couleur
              </AdminButton>
            </div>
          </AdminCard>

          <AdminCard title="Images">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={onFiles}
                className="hidden"
                id="cobra-product-images"
              />
              <label
                htmlFor="cobra-product-images"
                className="inline-flex cursor-pointer items-center justify-center gap-2 border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white hover:border-neutral-500"
              >
                {uploading ? 'Téléversement…' : 'Téléverser des images'}
              </label>
              <span className="text-[11px] text-neutral-500">
                La première image est utilisée sur les fiches produits et dans le panier. Réorganisez-les avec les
                flèches.
              </span>
            </div>

            {images.length === 0 ? (
              <p className="py-6 text-center text-xs text-neutral-500">Aucune image pour le moment.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((image, index) => (
                  <li key={image.key} className="border border-neutral-800 p-2">
                    <div className="relative">
                      <img
                        src={image.url}
                        alt=""
                        className="aspect-[4/5] w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/images/placeholder-product-front.svg'
                        }}
                      />
                      {index === 0 && (
                        <span className="absolute left-2 top-2">
                          <Badge tone="black">Principale</Badge>
                        </span>
                      )}
                    </div>
                    <input
                      className={`${adminInput} mt-2 py-1.5 text-[11px]`}
                      value={image.alt}
                      onChange={(e) =>
                        setImages((prev) =>
                          prev.map((img) => (img.key === image.key ? { ...img, alt: e.target.value } : img)),
                        )
                      }
                      placeholder="Texte alternatif"
                      aria-label={`Texte alternatif pour l'image ${index + 1}`}
                    />
                    <div className="mt-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveImage(index, -1)}
                        disabled={index === 0}
                        aria-label="Déplacer l'image vers le début"
                        className="flex h-8 flex-1 items-center justify-center border border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <IconChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(index, 1)}
                        disabled={index === images.length - 1}
                        aria-label="Déplacer l'image vers la fin"
                        className="flex h-8 flex-1 items-center justify-center border border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <IconChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(image)}
                        aria-label="Supprimer l'image"
                        className="flex h-8 flex-1 items-center justify-center border border-red-600/40 text-red-400 hover:bg-red-600 hover:text-white"
                      >
                        <IconX className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>

        <div className="space-y-6">
          <AdminCard title="Visibilité">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-white">Publié</p>
                <p className="text-[11px] text-neutral-500">Seuls les produits publiés apparaissent dans la boutique.</p>
              </div>
              <Toggle
                checked={form.is_published}
                disabled={busy}
                onChange={(next) => set({ is_published: next })}
              />
            </div>
            <div className="mt-5 flex items-start justify-between gap-4 border-t border-neutral-800 pt-5">
              <div>
                <p className="text-xs font-bold text-white">À la une</p>
                <p className="text-[11px] text-neutral-500">Met le produit en avant dans le carrousel de la page d'accueil.</p>
              </div>
              <Toggle
                checked={form.is_featured}
                disabled={busy}
                onChange={(next) => set({ is_featured: next })}
              />
            </div>
          </AdminCard>

          <AdminCard title="Résumé">
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-500">Variantes</dt>
                <dd className="font-bold text-white">{variants.filter((v) => String(v.size || '').trim()).length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-500">Images</dt>
                <dd className="font-bold text-white">{images.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-500">Prix client</dt>
                <dd className="font-bold text-white">{formatPrice(effective)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-500">Prix de vente</dt>
                <dd className="font-bold text-white">{formatPrice(Number(form.sale_price) || Number(form.price) || 0)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-500">Remise</dt>
                <dd className="font-bold text-white">
                  {Number(form.discount_percent) > 0 ? `${Math.min(100, Math.max(0, Number(form.discount_percent) || 0))}%` : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-500">Prix de revient</dt>
                <dd className="font-bold text-white">{formatPrice(Number(form.price) || 0)}</dd>
              </div>
            </dl>
          </AdminCard>

          <AdminCard>
            <div className="flex flex-col gap-2">
              <AdminButton type="submit" disabled={busy || uploading}>
                {busy ? 'Enregistrement…' : isEdit ? 'Enregistrer le produit' : 'Créer le produit'}
              </AdminButton>
              <AdminButton type="button" variant="ghost" onClick={() => navigate('/admin/products')} disabled={busy}>
                Annuler
              </AdminButton>
            </div>
          </AdminCard>
        </div>
      </form>
    </AdminPage>
  )
}
