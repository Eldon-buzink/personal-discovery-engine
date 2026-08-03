import type { Metadata } from 'next'

// Next's Metadata API does NOT deep-merge nested objects (openGraph, twitter)
// between a layout and a page — a route that sets its own `openGraph` object
// replaces the root layout's entirely, not just the fields it names. So every
// route's metadata has to carry the full openGraph/twitter shape itself
// (card type etc.), not just title/description, or it silently falls back to
// a plain "summary" Twitter card. This is that shared shape, built once so it
// can't drift between routes.
//
// Deliberately no `images` field here: every segment gets its image from the
// opengraph-image.tsx file convention instead (app/opengraph-image.tsx as
// the site default, app/(site)/blog/[slug]/opengraph-image.tsx per post).
// Next auto-populates og:image and twitter:image from the nearest matching
// file — setting `images` here would override that per-segment resolution
// with one hardcoded image for every route again.
export function buildMetadata(opts: { path: string; title: string; description: string; type?: 'website' | 'article'; noindex?: boolean }): Metadata {
  const { path, title, description, type = 'website', noindex = false } = opts
  return {
    title,
    description,
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type,
      siteName: 'Bearing',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}
