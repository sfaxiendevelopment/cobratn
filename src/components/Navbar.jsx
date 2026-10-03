import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useWishlist } from '../contexts/WishlistContext'
import { useUI } from '../contexts/UIContext'
import { useLanguage } from '../contexts/LanguageContext'
import Logo from './Logo'
import { IconSearch, IconHeart, IconBag, IconMenu } from './icons'
import { cn } from '../lib/utils'

export default function Navbar() {
  const { count, openCart } = useCart()
  const { ids } = useWishlist()
  const { openSearch, openMenu } = useUI()
  const { t } = useLanguage()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)

  const NAV = [
    { to: '/', label: t('home') },
    { to: '/shop', label: t('shop') },
    { to: '/collections', label: t('collections') },
    { to: '/about', label: t('about') },
    { to: '/contact', label: t('contact') },
  ]

  const transparent = location.pathname === '/' && !scrolled

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        transparent
          ? 'bg-transparent text-white'
          : 'border-b border-black/10 bg-white/90 text-black backdrop-blur-md',
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-[72px]">
        {/* Logo */}
        <Link
          to="/"
          aria-label="Accueil COBRA TN"
          className={cn(transparent ? 'text-white' : 'text-black')}
        >
          <Logo variant={transparent ? 'light' : 'dark'} />
        </Link>

        {/* Desktop center nav */}
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Navigation principale">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'text-[11px] font-semibold uppercase tracking-wide2 transition-colors hover:opacity-60',
                  isActive ? 'underline underline-offset-8' : '',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right icons */}
        <div className="flex items-center gap-1 lg:gap-2">
          <button
            type="button"
            onClick={openSearch}
            aria-label={t('search')}
            className="flex h-10 w-10 items-center justify-center transition-opacity hover:opacity-60"
          >
            <IconSearch className="h-[18px] w-[18px]" />
          </button>

          <Link
            to="/wishlist"
            aria-label={t('wishlist')}
            className="relative hidden h-10 w-10 items-center justify-center transition-opacity hover:opacity-60 sm:flex"
          >
            <IconHeart className="h-[18px] w-[18px]" />
            {ids.length > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[9px] font-bold text-white">
                {ids.length}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={openCart}
            aria-label={t('cart')}
            className="relative flex h-10 w-10 items-center justify-center transition-opacity hover:opacity-60"
          >
            <IconBag className="h-[18px] w-[18px]" />
            {count > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[9px] font-bold text-white">
                {count}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={openMenu}
            aria-label={t('openMenu')}
            className="flex h-10 w-10 items-center justify-center transition-opacity hover:opacity-60 lg:hidden"
          >
            <IconMenu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  )
}