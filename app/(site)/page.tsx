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

export default function Page() {
  return <LandingPageClient />
}
