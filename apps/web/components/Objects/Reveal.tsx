'use client'

import React from 'react'

type RevealProps = {
  children: React.ReactNode
  className?: string
  /**
   * Only animate once (default true). Keeps UX calm and avoids "auto-scroll" feelings.
   */
  once?: boolean
  /**
   * Vertical offset in px (default 12).
   */
  y?: number
  /**
   * Delay in ms (default 0).
   */
  delayMs?: number
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Reveal({
  children,
  className,
  once = true,
  y = 12,
  delayMs = 0,
}: RevealProps) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    if (prefersReducedMotion()) {
      setIsVisible(true)
      return
    }

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setIsVisible(false)
        }
      },
      {
        root: null,
        threshold: 0.12,
        rootMargin: '0px 0px -10% 0px',
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [once])

  const style: React.CSSProperties = prefersReducedMotion()
    ? {}
    : {
        transform: isVisible ? 'translateY(0px)' : `translateY(${y}px)`,
        opacity: isVisible ? 1 : 0,
        transitionProperty: 'transform, opacity',
        transitionDuration: '650ms',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        transitionDelay: `${delayMs}ms`,
        willChange: 'transform, opacity',
      }

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  )
}

