import { createContext, useContext, useMemo, useState, useCallback } from 'react'

const UIContext = createContext(null)

let toastId = 0

export function UIProvider({ children }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const [toasts, setToasts] = useState([])

  const pushToast = useCallback((message, type = 'success') => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value = useMemo(
    () => ({
      searchOpen,
      setSearchOpen,
      menuOpen,
      setMenuOpen,
      openSearch: () => setSearchOpen(true),
      closeSearch: () => setSearchOpen(false),
      openMenu: () => setMenuOpen(true),
      closeMenu: () => setMenuOpen(false),
      quickViewProduct,
      openQuickView: (product) => setQuickViewProduct(product),
      closeQuickView: () => setQuickViewProduct(null),
      toast: pushToast,
      toasts,
      dismissToast,
    }),
    [searchOpen, menuOpen, quickViewProduct, toasts, pushToast, dismissToast],
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  return useContext(UIContext)
}