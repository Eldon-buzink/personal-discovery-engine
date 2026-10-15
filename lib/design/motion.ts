'use client'

/**
 * lib/design/motion.ts
 *
 * One easing curve, two durations (also CSS vars in app/globals.css:
 * --ease, --dur-ui, --dur-enter). Entrance motion plays once when an element
 * enters view, then rests. Nothing is scroll-linked.
 *
 * useEnterOnce: the element renders its FINAL state by default (so no-JS,
 * reduced-motion and already-seen visitors just see the result). On mount,
 * unless the visitor prefers reduced motion, it adds `m-armed` (CSS puts the
 * start state), and adds `m-play` once the element is at least 35% in view,
 * or fills half the viewport (an element taller than about three screens can
 * never be 35% in view) (CSS transitions to the final state). One
 * IntersectionObserver per element, disconnected after it fires; no
 * animation loop of its own. Without IntersectionObserver nothing is armed,
 * so the final state stays.
 */

import { useEffect, useRef } from 'react'

export const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
export const DUR_UI = 200
export const DUR_ENTER = 600

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function useEnterOnce<T extends Element>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) return
    el.classList.add('m-armed')
    const io = new IntersectionObserver(([entry]) => {
      const viewport = entry.rootBounds?.height ?? window.innerHeight
      if (entry.isIntersecting && (entry.intersectionRatio >= 0.35 || entry.intersectionRect.height >= viewport / 2)) {
        el.classList.add('m-play')
        io.disconnect()
      }
    }, { threshold: [0, 0.1, 0.2, 0.35] })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref
}
