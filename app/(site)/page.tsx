import { buildMetadata } from '@/lib/seo'
import LandingPageClient from './LandingPageClient'

// Client-side page (animated blobs, auth state, router) can't export metadata
// directly — split into this thin server wrapper + LandingPageClient.tsx,
// same pattern as the pricing and onboarding pages.
export const metadata = buildMetadata({
  path: '/',
  title: "Bearing — Find out what's actually driving you",
  description: "A 15-minute assessment that surfaces your traits, your loops, your energy — not a type, a picture. Your first 5 patterns are free, no account needed.",
})

// No logo asset or internal search feature exists yet (checked public/ and
// the app directory) — Organization omits `logo`, WebSite omits
// `potentialAction`/SearchAction rather than pointing at something that
// doesn't exist. Add both once those exist.
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Bearing',
  url: 'https://www.getbearing.me',
  description: "A personal discovery engine — find out what's actually driving you.",
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Bearing',
  url: 'https://www.getbearing.me',
}

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <LandingPageClient />
    </>
  )
}
