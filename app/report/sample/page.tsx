import { buildMetadata } from '@/lib/seo'
import SampleReportClient from './SampleReportClient'

// This page uses client-side state (active facet/env selection) so it can't
// export metadata directly (Next disallows `metadata` alongside 'use client').
// Split into this thin server wrapper + SampleReportClient.tsx, same pattern
// as onboarding/page.tsx. noindex: true — this is illustrative placeholder
// content, not a real user's report, and shouldn't show up in search results
// as if it were the product.
export const metadata = buildMetadata({
  path: '/report/sample',
  title: 'Example report — Bearing',
  description: 'See what a Bearing report looks like — patterns, tags, and next steps, illustrated with sample results.',
  noindex: true,
})

export default function SampleReportPage() {
  return <SampleReportClient />
}
