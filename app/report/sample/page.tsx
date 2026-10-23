import { permanentRedirect } from 'next/navigation'

// The old sample report (placeholder results) is replaced by the example
// report with real example data: /report/example. Kept as a redirect so old
// links keep working. SampleReportClient.tsx stays: the landing page still
// imports its sample facets.
// Per request, so the response carries a real Location header (a
// prerendered redirect in Next 14 sends a 308 without one).
export const dynamic = 'force-dynamic'

export default function SampleReportPage() {
  permanentRedirect('/report/example')
}
