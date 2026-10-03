import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { getErrorMessage } from '../lib/utils'
import { isSupabaseConfigured } from '../lib/supabase'
import Logo from '../components/Logo'

/**
 * Staff-only sign-in.
 *
 * The storefront has no customer accounts, so this is the single place a human
 * can authenticate. Signing in with a non-admin profile lands back here rather
 * than revealing the dashboard.
 */
export default function AdminLogin() {
  useDocumentMeta('Administration — COBRA TN')
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isSupabaseConfigured) {
    return (
      <div className="container-page py-32 text-center">
        <p>Supabase n’est pas encore configuré.</p>
      </div>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(form.email.trim(), form.password)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo variant="light" />
        </div>

        <p className="mt-10 text-center text-[10px] font-semibold uppercase tracking-widest2 text-white/40">
          Accès réservé à l’équipe
        </p>
        <h1 className="mt-3 text-center text-2xl font-black uppercase tracking-tight text-white">
          Administration
        </h1>

        <form onSubmit={submit} className="mt-10 space-y-5">
          <div>
            <label className="label text-white/50" htmlFor="admin-email">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input border-white/20 bg-white/5 text-white placeholder:text-white/25"
              placeholder="vous@cobra.tn"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="label text-white/50" htmlFor="admin-password">
              Mot de passe
            </label>
            <input
              id="admin-password"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input border-white/20 bg-white/5 text-white placeholder:text-white/25"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="border border-red-400/40 bg-red-500/10 p-3 text-xs text-red-200" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-white/35">
          La boutique est publique : aucun compte client n’est nécessaire pour commander.
        </p>
      </div>
    </div>
  )
}
