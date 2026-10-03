import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/utils'

/**
 * Wraps children and fades/slides them in when scrolled into view.
 * Usage: <Reveal className="...">...</Reveal>
 */
export default function Reveal({ children, className, delay = 0, as: Tag = 'div' }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShown(true)
            obs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={cn('reveal', shown && 'revealed', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}