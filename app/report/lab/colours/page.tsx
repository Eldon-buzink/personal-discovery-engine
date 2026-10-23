import { buildMetadata } from '@/lib/seo'
import ColourBoard from './ColourBoard'

// Report lab: cluster colour options. Not indexed.
export const metadata = buildMetadata({ path: '/report/lab/colours', title: 'Report lab: colours | Bearing', description: 'Report lab, cluster colours.', noindex: true })

export default function LabColoursPage() {
  return <ColourBoard />
}
