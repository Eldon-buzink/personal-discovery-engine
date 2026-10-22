import { buildMetadata } from '@/lib/seo'
import LabFrame, { type FrameQuery } from './LabFrame'

// Report lab: one option, rendered at the width it's opened at. Not indexed.
export const metadata = buildMetadata({ path: '/report/lab/options/frame', title: 'Report lab | Bearing', description: 'Report lab.', noindex: true })

export default function LabFramePage({ searchParams }: { searchParams: FrameQuery }) {
  return <LabFrame q={searchParams} />
}
