import { buildMetadata } from '@/lib/seo'
import PricingClient from './PricingClient'

// Client-side page (hover states etc.) can't export metadata directly — split
// into this thin server wrapper + PricingClient.tsx, same pattern as the
// landing and onboarding pages.
export const metadata = buildMetadata({
  path: '/pricing',
  title: 'Pricing — Bearing',
  description: "Start free, no account required. When you're ready to go deeper, one payment of €49 unlocks everything else — for good, not a subscription.",
})

export default function PricingPage() {
  return <PricingClient />
}
