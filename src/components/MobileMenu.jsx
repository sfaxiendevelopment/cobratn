import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUI } from '../contexts/UIContext'
import { useLanguage } from '../contexts/LanguageContext'
import Logo from './Logo'
import { IconX } from './icons'

export default function MobileMenu() {
  const { menuOpen, closeMenu, openSearch } = useUI()
  const { t } = useLanguage()
  const location = useLocation()

  const LINKS = [
    { to: '/', label: t('home') },
    { to: '/shop', label: t('shop') },
    { to: '/collections', label: t('collections') },
    { to: '/about', label: t('about') },
    { to: '/contact', label: t('contact') },
    { to: '/faq', label: t('faq') },
  ]

  useEffect(() => {
    document.body.classList.toggle('lock-scroll', menuOpen)
    return () => document.body.classList.remove('lock-scroll')
  }, [menuOpen])

  useEffect(() => {
    closeMenu()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  return (
    <div className={`fixed inset-0 z-[105] ${menuOpen ? '' : 'pointer-events-none'}`} aria-hidden={!menuOpen}>
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={menuOpen ? 0 : -1}
        aria-label="Fermer le menu"
        onClick={closeMenu}
        className={`absolute inset-0 h-full w-full bg-black/60 transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Panel */}
      <div
        className={`absolute left-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-white transition-transform duration-300 ease-out ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-5">
          <button
            type="button"
            onClick={closeMenu}
            className="flex h-9 w-9 items-center justify-center border border-black/10"
            aria-label="Fermer le menu"
          >
            <IconX className="h-4 w-4" />
          </button>
          <Link to="/" aria-label="Accueil COBRA TN">
            <Logo variant="dark" withText={false} markClassName="h-20 w-20" />
          </Link>
          <span className="w-9" />
        </div>

        <nav className="flex-1 overflow-y-auto px-6 py-6" aria-label="Navigation mobile">
          <ul className="space-y-1">
            {LINKS.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="block border-b border-black/5 py-3 text-sm font-semibold uppercase tracking-wide2 transition-colors hover:opacity-60"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={() => {
                closeMenu()
                openSearch()
              }}
              className="btn-secondary w-full"
            >
              {t('search')}
            </button>
            <Link to="/wishlist" className="btn-secondary flex w-full items-center justify-center">
              {t('wishlist')}
            </Link>
            <Link to="/contact" className="btn-secondary flex w-full items-center justify-center">
              {t('contact')}
            </Link>
          </div>
        </nav>

        <div className="border-t border-black/10 px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest2 text-neutral-500">
            {t('moreThanClothes')}
          </p>
        </div>
      </div>
    </div>
  )
}