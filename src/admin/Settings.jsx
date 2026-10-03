import { useEffect, useState } from 'react'
import { AdminPage, AdminCard, AdminButton, Field, adminInput } from './AdminUI'
import { adminGetSettings, adminSaveSettings } from '../lib/api'
import { isSupabaseConfigured } from '../lib/supabase'
import { useUI } from '../contexts/UIContext'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { getErrorMessage } from '../lib/utils'

const EMPTY = { about_text: '', contact_email: '', contact_phone: '', social: { instagram: '', tiktok: '', facebook: '' } }

/**
 * Only the three networks the storefront actually renders. YouTube was dropped
 * and X was replaced by Facebook, so the object is rebuilt from these keys on
 * save — stale `youtube` / `x` keys are never written back.
 */
const SOCIAL_FIELDS = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/cobra.tn' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@cobra.tn' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/cobra.tn' },
]

const pickSocial = (social) => {
  const source = social || {}
  return SOCIAL_FIELDS.reduce((acc, { key }) => {
    acc[key] = typeof source[key] === 'string' ? source[key].trim() : ''
    return acc
  }, {})
}

export default function Settings() {
  useDocumentMeta('Paramètres — Administration COBRA TN')
  const { toast } = useUI()
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    adminGetSettings().then((s) => {
      setForm({
        about_text: s.about_text || '',
        contact_email: s.contact_email || '',
        contact_phone: s.contact_phone || '',
        social: pickSocial(s.social),
      })
      setLoading(false)
    })
  }, [])

  const setSocial = (k, v) => setForm({ ...form, social: { ...form.social, [k]: v } })

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await adminSaveSettings({ ...form, social: pickSocial(form.social) })
      toast('Paramètres enregistrés')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminPage
      eyebrow="Configuration"
      title="Paramètres"
      subtitle="Textes utilisés sur tout le site."
      actions={<AdminButton onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}</AdminButton>}
    >
      {error && <p className="mb-4 border border-red-600 bg-red-600/10 p-3 text-xs text-red-400">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-32 w-full dark" />
          <div className="skeleton h-32 w-full dark" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminCard title="À propos et contact">
            <div className="space-y-4">
              <Field label="Texte « À propos »">
                <textarea rows={5} className={`${adminInput} h-auto py-3`} value={form.about_text} onChange={(e) => setForm({ ...form, about_text: e.target.value })} placeholder="L'histoire derrière COBRA TN…" />
              </Field>
              <Field label="Email de contact">
                <input className={adminInput} value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="cobratn0@gmail.com" />
              </Field>
              <Field label="Téléphone de contact">
                <input className={adminInput} value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="+216 20 000 000" />
              </Field>
            </div>
          </AdminCard>

          <AdminCard title="Liens réseaux sociaux">
            <div className="space-y-4">
              {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
                <Field key={key} label={label}>
                  <input
                    className={adminInput}
                    value={form.social[key]}
                    onChange={(e) => setSocial(key, e.target.value)}
                    placeholder={placeholder}
                  />
                </Field>
              ))}
              <p className="text-[11px] leading-relaxed text-neutral-500">
                Ces trois liens sont utilisés partout sur le site : page d’accueil, pied de page, pages À propos et
                Contact. Laissez un champ vide pour garder l’adresse par défaut.
              </p>
            </div>
          </AdminCard>
        </div>
      )}
    </AdminPage>
  )
}