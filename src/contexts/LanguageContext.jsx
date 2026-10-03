import { createContext, useContext, useEffect, useMemo } from 'react'

const TRANSLATIONS = {
  fr: {
    home: 'Accueil',
    shop: 'Boutique',
    collections: 'Collections',
    about: 'À propos',
    contact: 'Contact',
    faq: 'FAQ',
    search: 'Rechercher',
    account: 'Compte',
    wishlist: 'Liste de souhaits',
    cart: 'Panier',
    openMenu: 'Ouvrir le menu',
    customerCare: 'Service client',
    shopTitle: 'Boutique',
    all: 'Tout',
    allCollections: 'Toutes les collections',
    fresh: 'Nouveau',
    newArrivals: 'Nouveautés',
    viewAll: 'Voir tout',
    curated: 'Sélection',
    featured: 'À la une',
    exploreCollection: 'Découvrir la collection',
    social: 'Social',
    followCobra: 'Suivez COBRA TN',
    ourStory: 'Notre histoire',
    moreThanClothes: "More than clothes. It's a mindset.",
    fastDelivery: 'Livraison rapide',
    fastDeliverySub: 'À travers la Tunisie, dans 48 HEURES',
    premiumQuality: 'Qualité premium',
    premiumQualitySub: 'Matières lourdes',
    easyExchange: 'Échange simple',
    easyExchangeSub: 'Politique de retours simple',
    privacyPolicy: 'Politique de confidentialité',
    terms: 'Conditions',
    trackOrder: 'Suivre la commande',
    shipping: 'Livraison',
    returns: 'Retours',
    madeInTunisia: 'Fabriqué en Tunisie',
    allRightsReserved: 'Tous droits réservés.',
    pricesIn: 'Prix en',
    ourStoryLink: 'Notre histoire',
  },
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  useEffect(() => {
    document.documentElement.lang = 'fr'
    document.documentElement.dir = 'ltr'
  }, [])

  const value = useMemo(
    () => ({
      language: 'fr',
      t: (key, fallback) => TRANSLATIONS.fr[key] || fallback || key,
    }),
    [],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error('useLanguage must be used inside a LanguageProvider')
  }

  return context
}