import { buildMetadata } from '@/lib/seo'
import FilterFrame, { type FrameQuery } from './FilterFrame'

// Report lab: one state of the filter concept. Not indexed.
export const metadata = buildMetadata({ path: '/report/lab/filter/frame', title: 'Report lab | Bearing', description: 'Report lab.', noindex: true })

export default function FilterFramePage({ searchParams }: { searchParams: FrameQuery }) {
  return <FilterFrame q={searchParams} />
}
