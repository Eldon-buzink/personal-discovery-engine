import type { Metadata } from 'next'

// Next's Metadata API does NOT deep-merge nested objects (openGraph, twitter)
// between a layout and a page — a route that sets its own `openGraph` object
// replaces the root layout's entirely, not just the fields it names. So every
// route's metadata has to carry the full openGraph/twitter shape itself
// (card type etc.), not just title/description, or it silently falls back to
// a plain "summary" Twitter card. This is that shared shape, built once so it
// can't drift between routes.
//
// `image` defaults to the site-wide dynamic OG image (app/api/og/route.ts).
// Explicit, not left to the opengraph-image.tsx file convention: that
// convention proved unreliable for any page nested inside the (site) route
// group (confirmed directly — /about, /pricing, /blog, /contact, /privacy,
// /terms all silently got no og:image tag at all, despite a same-level
// opengraph-image.tsx existing). An explicit URL here is what Next actually,
// reliably renders into <meta property="og:image">.
export function buildMetadata(opts: { path: string; title: string; description: string; type?: 'website' | 'article'; noindex?: boolean; image?: string }): Metadata {
  const { path, title, description, type = 'website', noindex = false, image = '/api/og' } = opts
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
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}
