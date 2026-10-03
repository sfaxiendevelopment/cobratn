import { useEffect, useState } from 'react'

/** Sets the document title + meta description for SEO. */
export function useDocumentMeta(title, description) {
  useEffect(() => {
    if (title) document.title = title
    if (description) {
      let el = document.querySelector('meta[name="description"]')
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('name', 'description')
        document.head.appendChild(el)
      }
      el.setAttribute('content', description)
    }
  }, [title, description])
}

/** Returns a debounced copy of `value`. */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}