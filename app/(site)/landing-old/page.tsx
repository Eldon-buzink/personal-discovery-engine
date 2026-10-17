import { buildMetadata } from '@/lib/seo'
import LandingPageClient from '../LandingPageClient'

// The landing page as it was before the current one (app/(home)/page.tsx),
// kept for reference. Not indexed, not in the sitemap.
export const metadata = buildMetadata({
  path: '/landing-old',
  title: 'Old landing page | Bearing',
  description: 'The previous Bearing landing page, kept for reference.',
  noindex: true,
})

export default function OldLandingPage() {
  return <LandingPageClient />
}
