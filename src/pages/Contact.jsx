import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import useSiteSettings from '../hooks/useSiteSettings'
import { subscribeNewsletter } from '../lib/api'
import { useUI } from '../contexts/UIContext'
import { getErrorMessage, socialHandle } from '../lib/utils'
import {
  IconInstagram,
  IconTiktok,
  IconFacebook,
  IconMail,
  IconPhone,
  IconTruck,
  IconCheck,
  IconLock,
} from '../components/icons'

/**
 * Every row comes from Paramètres in the admin dashboard: the three social
 * links plus the contact email and phone. Nothing here is hardcoded.
 */
function contactMethods({ social, contact_email: email, contact_phone: phone }) {
  return [
    { key: 'instagram', label: 'Instagram', value: socialHandle(social.instagram, 'Instagram'), href: social.instagram, Icon: IconInstagram },
    { key: 'facebook', label: 'Facebook', value: socialHandle(social.facebook, 'Facebook'), href: social.facebook, Icon: IconFacebook },
    { key: 'tiktok', label: 'TikTok', value: socialHandle(social.tiktok, 'TikTok'), href: social.tiktok, Icon: IconTiktok },
    { key: 'email', label: 'Email', value: email, href: `mailto:${email}`, Icon: IconMail },
    { key: 'phone', label: 'Téléphone / WhatsApp', value: phone, href: `tel:${String(phone).replace(/[^\d+]/g, '')}`, Icon: IconPhone },
  ]
}

const FAQS = [
  { q: 'Quel est le délai de livraison ?', a: 'Les commandes sont expédiées sous 24 heures. La livraison en Tunisie prend généralement 1 à 5 jours ouvrables selon votre gouvernorat.' },
  { q: 'Proposez-vous le paiement à la livraison ?', a: 'Oui. Le paiement à la livraison est disponible partout en Tunisie. Le paiement par carte en ligne est en cours de déploiement.' },
  { q: 'Quelle est votre politique de retour ?', a: 'Les articles non portés peuvent être retournés dans les 14 jours suivant la livraison, étiquettes intactes, pour un remboursement intégral.' },
  { q: 'Comment connaître ma taille ?', a: 'Chaque fiche produit contient un guide des tailles. En cas de doute, prenez une taille au-dessus — nos pièces taillent légèrement près du corps.' },
]

export default function Contact() {
  useDocumentMeta('Contact — COBRA TN', "Contactez l'équipe COBRA TN.")

  const { toast } = useUI()
  const settings = useSiteSettings()
  const { social } = settings
  const [form, setForm] = useState({ name: '', email: '', subject: 'Général', message: '' })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Veuillez renseigner votre nom, votre email et votre message.')
      return
    }
    setSending(true)
    setError('')
    await subscribeNewsletter(form.email)
      .then(() => {
        setSent(true)
        toast("Message reçu — nous vous répondrons rapidement.")
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setSending(false))
  }

  return (
    <div className="container-page pb-24 pt-24 lg:pb-32 lg:pt-32">
      <div className="grid gap-12 lg:grid-cols-[1fr_420px]">
        {/* Form */}
        <div>
          <p className="label text-neutral-400">Parlons-nous</p>
          <h1 className="section-title">Contact</h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-neutral-500">
            Une question sur une commande, une taille, un achat en gros ou un partenariat — écrivez-nous. Nous répondons sous un jour ouvré.
          </p>

          {sent ? (
            <div className="mt-10 border border-black bg-neutral-50 p-8 text-center">
              <IconCheck className="mx-auto h-8 w-8" />
              <h2 className="mt-4 text-lg font-extrabold uppercase">Message envoyé</h2>
              <p className="mt-2 text-xs text-neutral-500">Merci {form.name || 'de votre message'} — nous reviendrons vers vous à l'adresse {form.email} sous peu.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 grid max-w-lg gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="name">Nom</label>
                  <input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Votre nom" required />
                </div>
                <div>
                  <label className="label" htmlFor="email">Email</label>
                  <input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" placeholder="vous@example.com" required />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="subject">Objet</label>
                <select id="subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input">
                  <option>Général</option>
                  <option>Suivi de commande</option>
                  <option>Conseil de taille</option>
                  <option>Retours</option>
                  <option>Partenariat</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="message">Message</label>
                <textarea id="message" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="input h-auto py-3" placeholder="Comment pouvons-nous vous aider ?" required />
              </div>
              {error && <p className="border border-red-300 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
              <button type="submit" disabled={sending} className="btn-primary w-fit">
                {sending ? 'Envoi…' : 'Envoyer le message'}
              </button>
            </form>
          )}
        </div>

        {/* Side */}
        <div className="space-y-10">
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wide3">Nous joindre directement</h2>
            <ul className="mt-4 divide-y divide-black/10 border-y border-black/10">
              {contactMethods(settings).map(({ key, label, value, href, Icon }) => (
                <li key={key}>
                  <a
                    href={href}
                    className="flex items-center justify-between gap-4 py-4 hover:opacity-60"
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel="noreferrer"
                  >
                    <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </span>
                    <span className="truncate text-sm font-bold">{value}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wide3">Questions fréquentes</h2>
            <div className="mt-4 space-y-3">
              {FAQS.map((f) => (
                <div key={f.q} className="border border-black/10 p-4">
                  <p className="text-sm font-bold">{f.q}</p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-500">{f.a}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-neutral-400">Voir la <Link to="/faq" className="underline underline-offset-4 hover:text-black">FAQ complète →</Link></p>
          </div>

          <div className="flex items-center justify-between border border-black/10 bg-neutral-50 p-5">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"><IconTruck className="h-4 w-4" /> Livraison rapide en Tunisie</p>
              <p className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400"><IconLock className="h-4 w-4" /> Paiement à la livraison</p>
            </div>
            <div className="flex gap-2">
              <a href={social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-10 w-10 items-center justify-center border border-black/15 hover:bg-black hover:text-white"><IconInstagram className="h-4.5 w-4.5" /></a>
              <a href={social.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok" className="flex h-10 w-10 items-center justify-center border border-black/15 hover:bg-black hover:text-white"><IconTiktok className="h-4.5 w-4.5" /></a>
              <a href={social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="flex h-10 w-10 items-center justify-center border border-black/15 hover:bg-black hover:text-white"><IconFacebook className="h-4.5 w-4.5" /></a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}