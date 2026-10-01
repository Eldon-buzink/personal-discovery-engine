import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo'
import {
  MINI_ASSESSMENT_SLUG_TO_FACET,
  MINI_ASSESSMENT_DISPLAY_LABEL,
  type MiniAssessmentSlug,
} from '@/lib/known/miniAssessmentScoring'
import { LANDING_ANGLES, type LandingAngle } from '@/lib/known/miniAssessmentLanding'
import StartLandingClient from './StartLandingClient'

// Thin server wrapper so the page can export metadata (the client component
// owns auth state + the paid-user redirect) — same split as the home and
// pricing pages. noindex: no keyword strategy is locked for these pages
// (02-landing-page-handover.md §5), and they shouldn't compete with the
// main site in search until that decision is made.
export function generateMetadata({ params }: { params: { facet: string } }) {
  const facet = MINI_ASSESSMENT_SLUG_TO_FACET[params.facet as MiniAssessmentSlug]
  if (!facet) return {}
  const label = MINI_ASSESSMENT_DISPLAY_LABEL[facet]
  return buildMetadata({
    path: `/start/${params.facet}`,
    title: `${label} quick check — Bearing`,
    description: `Six short statements, about two minutes. See which way you lean on ${label.toLowerCase()}.`,
    noindex: true,
  })
}

export default function StartPage({
  params,
  searchParams,
}: {
  params: { facet: string }
  searchParams: { angle?: string }
}) {
  const slug = params.facet as MiniAssessmentSlug
  if (!MINI_ASSESSMENT_SLUG_TO_FACET[slug]) notFound()

  const angle: LandingAngle = LANDING_ANGLES.includes(searchParams.angle as LandingAngle)
    ? (searchParams.angle as LandingAngle)
    : 'curiosity'

  return <StartLandingClient slug={slug} angle={angle} />
}
