import { NavLink } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useWishlist } from '../contexts/WishlistContext'
import { IconHome, IconGrid } from './MobileNavIcons'
import { IconBag, IconHeart } from './icons'
import { cn } from '../lib/utils'

export default function MobileNav() {
  const { count, openCart } = useCart()
  const { ids } = useWishlist()

  const base = 'flex flex-col items-center justify-center gap-0.5 py-2 text-[9px] font-semibold uppercase tracking-widest'

  return (
    <nav
      aria-label="Navigation inférieure"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 backdrop-blur-md lg:hidden"
    >
      <div className="grid grid-cols-4">
        <NavLink to="/" end className={({ isActive }) => cn(base, isActive ? 'text-black' : 'text-neutral-400')}>
          <IconHome className="h-5 w-5" />
          Accueil
        </NavLink>
        <NavLink to="/shop" className={({ isActive }) => cn(base, isActive ? 'text-black' : 'text-neutral-400')}>
          <IconGrid className="h-5 w-5" />
          Boutique
        </NavLink>
        <NavLink to="/wishlist" className={({ isActive }) => cn(base, isActive ? 'text-black' : 'text-neutral-400')}>
          <span className="relative">
            <IconHeart className="h-5 w-5" />
            {ids.length > 0 && (
              <span className="absolute -right-1.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-black px-0.5 text-[8px] font-bold text-white">
                {ids.length}
              </span>
            )}
          </span>
          Favoris
        </NavLink>
        <button type="button" onClick={openCart} className={cn(base, 'text-neutral-400')}>
          <span className="relative">
            <IconBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-black px-0.5 text-[8px] font-bold text-white">
                {count}
              </span>
            )}
          </span>
          Panier
        </button>
      </div>
    </nav>
  )
}