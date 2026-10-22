import { buildMetadata } from '@/lib/seo'
import CardOptions from '../CardOptions'

// Report lab: one trait card option. Not indexed.
export const metadata = buildMetadata({ path: '/report/lab/card/frame', title: 'Report lab | Bearing', description: 'Report lab.', noindex: true })

export default function CardFramePage({ searchParams }: { searchParams: { facet?: string; o?: string } }) {
  return <CardOptions facet={searchParams.facet ?? 'Achievement-Striving'} option={searchParams.o === 'B' ? 'B' : 'A'} />
}
