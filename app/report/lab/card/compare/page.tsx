import { buildMetadata } from '@/lib/seo'
import CardCompare from './CardCompare'

// Report lab: today's card format and the split format, side by side. Not indexed.
export const metadata = buildMetadata({ path: '/report/lab/card/compare', title: 'Report lab | Bearing', description: 'Report lab.', noindex: true })

export default function CardComparePage() {
  return <CardCompare />
}
