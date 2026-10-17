import { buildMetadata } from '@/lib/seo'
import SiteFooter from '@/components/known/SiteFooter'
import V3Client from './_landing/V3Client'
import Problems from './_landing/Problems'
import Solution from './_landing/Solution'
import Tracker from './_landing/Tracker'
import Faq from './_landing/Faq'
import Closing from './_landing/Closing'

// The landing page. Outside the (site) group so it has its own navigation
// (V3Nav). Metadata and JSON-LD are unchanged from the old landing, which
// is kept for reference at /landing-old (noindex).
export const metadata = buildMetadata({
  path: '/',
  title: 'Bearing — Get to know yourself better',
  description: 'A Big Five personality assessment. Rate 120 short statements and see your patterns. Your first 5 patterns are free, no account needed.',
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
  description: "A Big Five personality assessment. Rate 120 short statements and see your patterns. Your first 5 patterns are free, no account needed.",
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
      <V3Client problems={<Problems />} solution={<Solution />} practice={<Tracker />} faq={<Faq />} closing={<Closing />} />
      <SiteFooter />
    </>
  )
}
