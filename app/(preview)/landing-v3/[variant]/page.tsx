import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo'
import SiteFooter from '@/components/known/SiteFooter'
import V3Client from '../V3Client'
import ProblemsSection from './ProblemsSection'
import Solution from '../Solution'
import Tracker from '../Tracker'
import Faq from '../Faq'
import Closing from '../Closing'

// Landing v3, step 2: the hero plus one of three designs for the problems
// section (p1, p2, p3). Not indexed, not in the sitemap.
const VARIANTS = ['p1', 'p2', 'p3'] as const

export function generateStaticParams() {
  return VARIANTS.map((variant) => ({ variant }))
}

export function generateMetadata({ params }: { params: { variant: string } }) {
  return buildMetadata({ path: `/landing-v3/${params.variant}`, title: `Landing v3, problems ${params.variant} | Bearing`, description: 'A landing page draft for review.', noindex: true })
}

export default function LandingV3Variant({ params }: { params: { variant: string } }) {
  if (!VARIANTS.includes(params.variant as (typeof VARIANTS)[number])) notFound()
  return (
    <>
      <V3Client problems={<ProblemsSection variant={params.variant as (typeof VARIANTS)[number]} />} solution={<Solution />} practice={<Tracker />} faq={<Faq />} closing={<Closing />} />
      <SiteFooter />
    </>
  )
}
