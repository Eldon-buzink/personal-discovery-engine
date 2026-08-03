import type { MetadataRoute } from 'next'

const BASE_URL = 'https://getbearing.me'

// Disallow, not just noindex, for the assessment/report/onboarding/auth
// flow: most of those pages are 'use client' components with no metadata
// export (see app/layout.tsx's metadataBase comment), so a meta noindex tag
// isn't consistently in place across them. Keeping crawlers out at the
// robots.txt level is the one mechanism that covers the whole flow today.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/assessment', '/report', '/auth/', '/onboarding', '/blob-demo', '/question-demo'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
