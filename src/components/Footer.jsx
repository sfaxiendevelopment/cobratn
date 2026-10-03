import { Link } from 'react-router-dom'
import { getCategoryLinks } from '../lib/nav'
import { useLanguage } from '../contexts/LanguageContext'
import useSiteSettings from '../hooks/useSiteSettings'
import { IconInstagram, IconTiktok, IconFacebook } from './icons'
import Logo from './Logo'

const SHOP = getCategoryLinks()

export default function Footer() {
  const { t } = useLanguage()
  const { social } = useSiteSettings()

  const CARE = [
    { to: '/faq', label: t('faq') },
    { to: '/faq#shipping', label: t('shipping') },
    { to: '/faq#returns', label: t('returns') },
    { to: '/contact', label: t('contact') },
  ]

  const ABOUT = [
    { to: '/about', label: t('ourStoryLink') },
    { to: '/faq#privacy', label: t('privacyPolicy') },
    { to: '/faq#terms', label: t('terms') },
  ]

  return (
    <footer className="bg-black text-white">
      <div className="container-page grid gap-10 py-16 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo variant="light" />
          <p className="mt-5 max-w-xs text-xs leading-relaxed text-white/50">
            {t('moreThanClothes')} Premium monochrome streetwear from Tunisia, built for people who move with purpose.
          </p>
          <div className="mt-6 flex gap-3">
            <a href={social.instagram} target="_blank" rel="noreferrer" aria-label="COBRA TN sur Instagram" className="flex h-10 w-10 items-center justify-center border border-white/20 transition-colors hover:bg-white hover:text-black">
              <IconInstagram className="h-4 w-4" />
            </a>
            <a href={social.tiktok} target="_blank" rel="noreferrer" aria-label="COBRA TN sur TikTok" className="flex h-10 w-10 items-center justify-center border border-white/20 transition-colors hover:bg-white hover:text-black">
              <IconTiktok className="h-4 w-4" />
            </a>
            <a href={social.facebook} target="_blank" rel="noreferrer" aria-label="COBRA TN sur Facebook" className="flex h-10 w-10 items-center justify-center border border-white/20 transition-colors hover:bg-white hover:text-black">
              <IconFacebook className="h-4 w-4" />
            </a>
          </div>
        </div>

        <nav aria-label={t('shopTitle')}>
          <h3 className="text-[11px] font-bold uppercase tracking-wide3 text-white/40">{t('shopTitle')}</h3>
          <ul className="mt-5 space-y-3">
            {SHOP.map((c) => (
              <li key={c.to}>
                <Link to={c.to} className="text-xs text-white/70 transition-colors hover:text-white">
                  {c.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/shop" className="text-xs text-white/70 transition-colors hover:text-white">
                {t('all')}
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label={t('customerCare')}>
          <h3 className="text-[11px] font-bold uppercase tracking-wide3 text-white/40">{t('customerCare')}</h3>
          <ul className="mt-5 space-y-3">
            {CARE.map((c) => (
              <li key={c.label}>
                <Link to={c.to} className="text-xs text-white/70 transition-colors hover:text-white">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t('about')}>
          <h3 className="text-[11px] font-bold uppercase tracking-wide3 text-white/40">{t('about')}</h3>
          <ul className="mt-5 space-y-3">
            {ABOUT.map((c) => (
              <li key={c.label}>
                <Link to={c.to} className="text-xs text-white/70 transition-colors hover:text-white">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-6 text-[10px] uppercase tracking-widest text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} COBRA TN. {t('allRightsReserved')}</p>
          <p>
            {t('pricesIn')} <span className="font-bold text-white/60">TND</span> · {t('madeInTunisia')}
          </p>
        </div>
      </div>
    </footer>
  )
}