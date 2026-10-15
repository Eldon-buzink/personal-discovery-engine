'use client'

import { useEffect, useRef, useState } from 'react'

// Mounts its children once the placeholder is within ~600px of the
// viewport, so below-the-fold visuals don't load with the first paint. The
// className should reserve the children's height (min-height) so nothing
// shifts when they arrive. Shared by the home page and the /start/{facet}
// mini-assessment landing pages.
export default function WhenNear({ className, children }: { className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect() }
    }, { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} className={className}>{near ? children : null}</div>
}
