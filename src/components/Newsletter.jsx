import { useState } from 'react'
import { useUI } from '../contexts/UIContext'
import { subscribeNewsletter } from '../lib/api'
import { isSupabaseConfigured } from '../lib/supabase'
import { IconCheck } from './icons'

export default function Newsletter({ dark = false, title = 'RESTEZ INFORMÉ', subtitle = '' }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [message, setMessage] = useState('')
  const { toast } = useUI()

  const submit = async (e) => {
    e.preventDefault()
    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setStatus('error')
      setMessage('Veuillez saisir une adresse email valide.')
      return
    }
    if (!isSupabaseConfigured) {
      setStatus('error')
      setMessage("Supabase n'est pas encore configuré.")
      return
    }
    setStatus('loading')
    try {
      await subscribeNewsletter(value)
      setStatus('success')
      setMessage('Vous êtes inscrit. Bienvenue dans la mentalité COBRA.')
      setEmail('')
      toast('Inscription à la newsletter COBRA TN réussie')
    } catch (err) {
      setStatus('error')
      setMessage(err.message?.includes('duplicate') ? 'Cet email est déjà inscrit.' : "Une erreur s'est produite. Veuillez réessayer.")
    }
  }

  const light = dark

  return (
    <section id="newsletter" className={light ? 'bg-black text-white' : 'bg-neutral-100 text-black'}>
      <div className="container-page flex flex-col items-center gap-6 py-20 text-center">
        <p className="label text-neutral-500">Newsletter</p>
        <h2 className="section-title">{title || 'RESTEZ INFORMÉ'}</h2>
        <p className={light ? 'max-w-md text-xs leading-relaxed text-white/60' : 'max-w-md text-xs leading-relaxed text-neutral-500'}>
          {subtitle || 'Recevez nos actualités sur les nouvelles collections, les sorties et les éditions spéciales.'}
        </p>

        <form onSubmit={submit} className="mt-2 flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="newsletter-email">Votre adresse email</label>
          <input
            id="newsletter-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Votre adresse email"
            className="input"
          />
          <button type="submit" disabled={status === 'loading'} className={light ? 'btn-light shrink-0' : 'btn-primary shrink-0'}>
            S'inscrire
          </button>
        </form>

        {status === 'success' && (
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-green-600">
            <IconCheck className="h-3.5 w-3.5" /> {message}
          </p>
        )}
        {status === 'error' && <p className="text-xs font-medium text-red-600">{message}</p>}
      </div>
    </section>
  )
}