'use client'

import { useEffect, useState } from 'react'
import { blogCharcoal, blogCharcoalSoft, blogCoral, blogLine, blogSans } from './tokens'
import type { TocItem } from '@/lib/blog/toc'

// Scroll-spy TOC — IntersectionObserver over the actual rendered heading
// elements (matched by id, same ids rehype-slug assigned when the MDX
// rendered; see lib/blog/toc.ts for why those ids are guaranteed to match).
// Client component only for this reason; the rest of the sidebar
// (PostSidebar) stays a server component.
export default function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? '')

  useEffect(() => {
    const headingEls = items
      .map(item => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null)
    if (headingEls.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Among headings currently intersecting the "active band" (top 80px
        // to top 30% of viewport, per rootMargin below), pick the one
        // closest to the top — not just the first one IntersectionObserver
        // happens to report, so scrolling past a short section correctly
        // advances to the next heading instead of getting stuck on the one
        // that already scrolled out of the band.
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length > 0) {
          const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b))
          setActiveId(topMost.target.id)
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    )
    headingEls.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [items])

  if (items.length === 0) return null

  return (
    <div style={{ marginBottom: 38 }}>
      <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: blogCharcoalSoft, marginBottom: 16, fontFamily: blogSans }}>
        On this page
      </p>
      {items.map(item => {
        const active = item.id === activeId
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            style={{
              display: 'block',
              fontSize: 13.5,
              textDecoration: 'none',
              padding: '7px 0 7px 14px',
              borderLeft: `2px solid ${active ? blogCoral : blogLine}`,
              color: active ? blogCharcoal : blogCharcoalSoft,
              fontWeight: active ? 600 : 400,
              fontFamily: blogSans,
              marginLeft: item.depth === 3 ? 10 : 0,
            }}
          >
            {item.text}
          </a>
        )
      })}
    </div>
  )
}
