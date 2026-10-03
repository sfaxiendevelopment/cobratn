import { useEffect, useState } from 'react'
import { AdminPage, AdminCard, AdminButton, Field, Toggle, adminInput } from './AdminUI'
import ImagePicker from './ImagePicker'
import { supabase } from '../lib/supabase'
import { useUI } from '../contexts/UIContext'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { getErrorMessage } from '../lib/utils'
import { TableSkeleton } from '../components/LoadingSkeleton'
import { EmptyRow } from './AdminUI'

const KEYS = [
  { key: 'hero', label: 'Bannière', hint: 'Introduction de la page d’accueil. Utilisez \n pour les retours à la ligne dans le titre.' },
  { key: 'featured_collection', label: 'Collection à la une', hint: 'Bannière éditoriale sous Collections.' },
  { key: 'brand_story', label: 'Histoire de la marque', hint: 'Deux colonnes avec image.' },
  { key: 'instagram', label: 'Instagram', hint: 'Bannière sociale.' },
  { key: 'newsletter', label: 'Newsletter', hint: 'Bloc d’inscription.' },
  { key: 'new_arrivals', label: 'Nouveautés', hint: 'Titre de section.' },
]

export default function Homepage() {
  useDocumentMeta('Page d\'accueil — COBRA TN Admin')
  const { toast } = useUI()
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase
      .from('homepage_sections')
      .select('*')
      .then(({ data }) => {
        const byKey = {}
        ;(data || []).forEach((s) => {
          byKey[s.section_key] = s
        })
        setSections(KEYS.map(({ key, label, hint }) => ({ key, label, hint, ...byKey[key] })))
        setLoading(false)
      })
  }, [])

  const set = (key, patch) => setSections((arr) => arr.map((s) => (s.key === key ? { ...s, ...patch } : s)))

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = sections.map(({ key, label: _label, hint: _hint, ...s }) => ({
        section_key: key,
        title: s.title || '',
        subtitle: s.subtitle || '',
        description: s.description || '',
        image_url: s.image_url || '',
        button_text: s.button_text || '',
        button_link: s.button_link || '',
        is_active: s.is_active ?? true,
      }))
      for (const p of payload) {
        const { error: e } = await supabase.from('homepage_sections').upsert(p, { onConflict: 'section_key' })
        if (e) throw e
      }
      toast('Page d\'accueil enregistrée')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminPage
      eyebrow="Contenu"
      title="Page d'accueil"
      subtitle="Chaque section s'affiche en direct sur la page d'accueil."
      actions={<AdminButton onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer la page d\'accueil'}</AdminButton>}
    >
      {error && <p className="mb-4 border border-red-600 bg-red-600/10 p-3 text-xs text-red-400">{error}</p>}

      {loading ? (
        <TableSkeleton rows={6} cols={2} />
      ) : (
        <div className="space-y-6">
          {sections.map((s) => (
            <AdminCard key={s.key} title={`${s.label} — ${s.key}`} className="border-l-2 border-l-white/20">
              <div className="grid gap-4 lg:grid-cols-3">
                <Field label="Titre">
                  <input className={adminInput} value={s.title || ''} onChange={(e) => set(s.key, { title: e.target.value })} placeholder="Titre" />
                </Field>
                <Field label="Sous-titre">
                  <input className={adminInput} value={s.subtitle || ''} onChange={(e) => set(s.key, { subtitle: e.target.value })} placeholder="Sous-titre" />
                </Field>
                <div className="lg:col-span-3">
                  <ImagePicker
                    label="Image"
                    hint="Choisissez un fichier depuis votre appareil (JPEG, PNG, WebP ou SVG, 5 Mo max)."
                    value={s.image_url || ''}
                    onChange={(url) => set(s.key, { image_url: url })}
                    previewClass="h-44"
                  />
                </div>
                <div className="lg:col-span-3">
                  <Field label="Description">
                    <textarea rows={2} className={`${adminInput} h-auto py-3`} value={s.description || ''} onChange={(e) => set(s.key, { description: e.target.value })} placeholder="Description" />
                  </Field>
                </div>
                <Field label="Texte du bouton">
                  <input className={adminInput} value={s.button_text || ''} onChange={(e) => set(s.key, { button_text: e.target.value })} placeholder="ACHETER" />
                </Field>
                <Field label="Lien du bouton">
                  <input className={adminInput} value={s.button_link || ''} onChange={(e) => set(s.key, { button_link: e.target.value })} placeholder="/shop" />
                </Field>
                <label className="flex items-center gap-3 pt-7 text-xs text-neutral-300">
                  <Toggle checked={s.is_active ?? true} onChange={(v) => set(s.key, { is_active: v })} /> Active
                </label>
              </div>
            </AdminCard>
          ))}
          {sections.length === 0 && <AdminCard><EmptyRow>Aucune section trouvée. Exécutez le script SQL de seed pour créer les sections par défaut.</EmptyRow></AdminCard>}
        </div>
      )}
    </AdminPage>
  )
}