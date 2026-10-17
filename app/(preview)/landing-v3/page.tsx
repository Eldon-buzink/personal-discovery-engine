import { buildMetadata } from '@/lib/seo'
import SiteFooter from '@/components/known/SiteFooter'
import V3Client from './V3Client'

// Landing v3, built step by step from the owner's feedback (step 1: the
// navigation and the hero). Not indexed, not in the sitemap; outside the
// (site) group so it can use its own navigation. The live landing page is
// unchanged.
export const metadata = buildMetadata({ path: '/landing-v3', title: 'Landing v3 | Bearing', description: 'A landing page draft for review.', noindex: true })

export default function LandingV3Page() {
  return (
    <>
      <V3Client />
      <SiteFooter />
    </>
  )
}
