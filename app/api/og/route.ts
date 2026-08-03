import { renderSiteOgImage } from '@/lib/og-site-image'

// Explicit route, not the opengraph-image.tsx file convention: that
// convention proved unreliable for pages nested inside the (site) route
// group here (confirmed by checking rendered HTML directly — /about,
// /pricing, /blog, /contact, /privacy, /terms all silently got no og:image
// at all despite app/(site)/opengraph-image.tsx existing as a same-level
// sibling of app/(site)/page.tsx, which DID work). buildMetadata()
// references this route explicitly instead of relying on inheritance.
export async function GET() {
  return renderSiteOgImage()
}
