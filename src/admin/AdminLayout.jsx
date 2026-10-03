import { useEffect, useState } from 'react'
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useUI } from '../contexts/UIContext'
import { cn } from '../lib/utils'
import {
  IconGrid,
  IconBag,
  IconBox,
  IconTag,
  IconHeart,
  IconLock,
  IconTruck,
  IconUser,
  IconHome,
  IconCog,
  IconLogOut,
  IconMenu,
  IconChevronRight,
  IconX,
} from '../components/icons'

const NAV = [
  { to: '/admin', label: 'Tableau de bord', icon: IconGrid, end: true },
  { to: '/admin/products', label: 'Produits', icon: IconBag },
  { to: '/admin/orders', label: 'Commandes', icon: IconBox },
  { to: '/admin/categories', label: 'Catégories', icon: IconTag },
  { to: '/admin/collections', label: 'Collections', icon: IconHeart },
  { to: '/admin/coupons', label: 'Codes promo', icon: IconLock },
  { to: '/admin/shipping', label: 'Livraison', icon: IconTruck },
  { to: '/admin/customers', label: 'Clients', icon: IconUser },
  { to: '/admin/homepage', label: "Page d'accueil", icon: IconHome },
  { to: '/admin/settings', label: 'Paramètres', icon: IconCog },
]

function NavList({ onNavigate }) {
  return (
    <nav className="flex-1 overflow-y-auto p-3">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group mb-0.5 flex items-center justify-between rounded px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors',
              isActive ? 'bg-white text-black' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white',
            )
          }
        >
          <span className="flex items-center gap-3">
            <Icon className="h-4 w-4" />
            {label}
          </span>
          <IconChevronRight className="h-3 w-3 opacity-40" />
        </NavLink>
      ))}
    </nav>
  )
}

function SidebarFooter({ profile, isAdmin, onSignOut }) {
  return (
    <div className="border-t border-neutral-800 p-4">
      <button
        type="button"
        onClick={onSignOut}
        className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
      >
        <IconLogOut className="h-4 w-4" /> Se déconnecter
      </button>
      <Link
        to="/"
        className="mt-1 flex w-full items-center gap-3 rounded px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-white"
      >
        <IconHome className="h-4 w-4" /> Voir la boutique
      </Link>
      <div className="mt-3 flex items-center gap-2 px-3 text-[10px] text-neutral-600">
        <span className="truncate" title={profile?.email || 'Admin'}>
          {profile?.email || 'Admin'}
        </span>
        {isAdmin && (
          <span className="shrink-0 border border-emerald-600 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-emerald-400">
            Admin
          </span>
        )}
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const { profile, isAdmin, signOut } = useAuth()
  const { toast } = useUI()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const signOutAndGo = async () => {
    await signOut()
    toast('Déconnexion réussie')
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white lg:grid lg:grid-cols-[260px_1fr]">
      {/* Mobile header */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4 lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le menu"
            className="flex h-9 w-9 items-center justify-center border border-neutral-800 text-neutral-300"
          >
            <IconMenu className="h-5 w-5" />
          </button>
          <Link to="/admin" className="text-sm font-black uppercase tracking-wide">
            COBRA <span className="text-neutral-500">Admin</span>
          </Link>
        </div>
        <Link to="/" className="btn text-[9px] font-bold uppercase tracking-widest">
          Voir la boutique →
        </Link>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col overflow-y-auto border-r border-neutral-800 bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
              <span className="text-sm font-black uppercase tracking-wide">
                COBRA <span className="text-neutral-500">/ADMIN</span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="flex h-9 w-9 items-center justify-center border border-neutral-800 text-neutral-300"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
            <div className="border-t border-neutral-800 p-4">
              <button
                type="button"
                onClick={signOutAndGo}
                className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
              >
                <IconLogOut className="h-4 w-4" /> Se déconnecter
              </button>
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="mt-1 flex w-full items-center gap-3 rounded px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-white"
              >
                <IconHome className="h-4 w-4" /> Voir la boutique
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="hidden border-r border-neutral-800 bg-neutral-900 lg:flex lg:flex-col">
        <div className="border-b border-neutral-800 px-6 py-6">
          <Link to="/admin" className="text-lg font-black uppercase tracking-wide">
            COBRA <span className="text-neutral-500">/ADMIN</span>
          </Link>
          <p className="mt-1 text-[11px] text-neutral-500">Panneau de contrôle</p>
        </div>
        <NavList />
        <SidebarFooter profile={profile} isAdmin={isAdmin} onSignOut={signOutAndGo} />
      </aside>

      {/* Content */}
      <main className="min-w-0 p-5 lg:p-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
