import { buildMetadata } from '@/lib/seo'
import ContentFrame, { type ContentQuery } from './ContentFrame'

// Report lab: one content state. Not indexed.
export const metadata = buildMetadata({ path: '/report/lab/content/frame', title: 'Report lab | Bearing', description: 'Report lab.', noindex: true })

export default function ContentFramePage({ searchParams }: { searchParams: ContentQuery }) {
  return <ContentFrame q={searchParams} />
}
