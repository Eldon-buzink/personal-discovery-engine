import { buildMetadata } from '@/lib/seo'
import BarFrame from '../BarFrame'
import { BAR_STATES, type BarState } from '@/lib/lab/barStates'

// Report lab: one sticky bar / closing panel option. Not indexed.
export const metadata = buildMetadata({ path: '/report/lab/bar/frame', title: 'Report lab | Bearing', description: 'Report lab.', noindex: true })

export default function BarFramePage({ searchParams }: { searchParams: { o?: string; s?: string; part?: string } }) {
  const state = (BAR_STATES as string[]).includes(searchParams.s ?? '') ? (searchParams.s as BarState) : 'locked'
  return <BarFrame option={searchParams.o === 'B' ? 'B' : 'A'} state={state} part={searchParams.part ?? 'bar'} />
}
