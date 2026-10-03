import { useEffect, useState } from 'react'
import { getSettings } from '../lib/api'

/** Used when an admin has not filled a field in yet, so nothing looks broken. */
export const SOCIAL_FALLBACKS = {
  instagram: 'https://instagram.com',
  tiktok: 'https://tiktok.com',
  facebook: 'https://facebook.com',
}

export const SOCIAL_ORDER = ['instagram', 'tiktok', 'facebook']

const CONTACT_FALLBACKS = {
  contact_email: 'cobratn0@gmail.com',
  contact_phone: '+216 20 000 000',
}

const FALLBACKS = {
  social: { ...SOCIAL_FALLBACKS },
  about_text: '',
  ...CONTACT_FALLBACKS,
}

const text = (value) => (typeof value === 'string' ? value.trim() : '')

/*
 * One cached fetch shared by every page. Without it each page that shows the
 * contact details or social links would fire its own request on every mount.
 */
let cache = null
let inFlight = null

function normalise(settings) {
  const social = settings?.social || {}
  const next = { about_text: text(settings?.about_text) }
  for (const key of Object.keys(CONTACT_FALLBACKS)) {
    next[key] = text(settings?.[key]) || CONTACT_FALLBACKS[key]
  }
  next.social = {}
  for (const key of SOCIAL_ORDER) {
    next.social[key] = text(social[key]) || SOCIAL_FALLBACKS[key]
  }
  return next
}

function load() {
  if (!inFlight) {
    inFlight = getSettings()
      .then((settings) => {
        cache = normalise(settings)
        return cache
      })
      .catch(() => {
        cache = { ...FALLBACKS, social: { ...SOCIAL_FALLBACKS } }
        return cache
      })
      .finally(() => {
        inFlight = null
      })
  }
  return inFlight
}

/**
 * The single source of truth for everything an admin edits under Paramètres:
 * the three social links, the contact email and the contact phone number.
 * The home page, footer, About and Contact pages all read from this, so the
 * same values can never drift apart between pages.
 */
export default function useSiteSettings() {
  const [settings, setSettings] = useState(cache || FALLBACKS)

  useEffect(() => {
    if (cache) return undefined
    let active = true
    load().then((next) => {
      if (active) setSettings(next)
    })
    return () => {
      active = false
    }
  }, [])

  return settings
}
