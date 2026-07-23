import { buildMetadata } from '@/lib/seo'
import OnboardingClient from './OnboardingClient'

// This page uses client-side state (exit transition, router.push) so it can't
// export metadata directly (Next disallows `metadata` alongside 'use client').
// Split into this thin server wrapper + OnboardingClient.tsx, same pattern as
// the landing and pricing pages.
export const metadata = buildMetadata({
  path: '/onboarding',
  title: 'Before you begin — Bearing',
  description: "No types, no scores, no label to live up to. Just a clearer picture of how you actually work, built from how you answer — not a quiz you can game.",
})

export default function OnboardingPage() {
  return <OnboardingClient />
}
