import type { Metadata } from 'next'

// Next's Metadata API does NOT deep-merge nested objects (openGraph, twitter)
// between a layout and a page — a route that sets its own `openGraph` object
// replaces the root layout's entirely, not just the fields it names. So every
// route's metadata has to carry the full openGraph/twitter shape itself
// (image, card type, etc.), not just title/description, or it silently loses
// og:image and falls back to a plain "summary" Twitter card. This is that
// shared shape, built once so it can't drift between routes.
export function buildMetadata(opts: { path: string; title: string; description: string }): Metadata {
  const { path, title, description } = opts
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: path,
      type: 'website',
      siteName: 'Bearing',
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
  }
}
