import { Link } from 'react-router-dom'
import { useDocumentMeta } from '../hooks/useDocumentMeta'

export default function NotFound() {
  useDocumentMeta('404 — COBRA TN')
  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-24 text-center">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest2 text-neutral-400">Erreur 404</p>
        <h1 className="mt-4 text-6xl font-black uppercase tracking-wide lg:text-8xl">Perdu.</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm text-neutral-500">
          La page que vous cherchez s'est faufilée ailleurs. On vous remet sur la voie.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-primary">Retour à l'accueil</Link>
          <Link to="/shop" className="btn-secondary">Voir la boutique</Link>
        </div>
      </div>
    </div>
  )
}