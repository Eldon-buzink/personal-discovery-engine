import { buildMetadata } from '@/lib/seo'
import ExampleReportClient from './ExampleReportClient'

// A complete example report: the whole first ring (all 30 traits), laid out
// as a real report. For looking at the report as a whole, for example in a
// design review. Not indexed, not in the sitemap.
export const metadata = buildMetadata({
  path: '/report/example',
  title: 'Example report, first ring complete | Bearing',
  description: 'A complete example Bearing report with all 30 traits of the first ring, illustrated with sample results.',
  noindex: true,
})

export default function ExampleReportPage() {
  return <ExampleReportClient />
}
