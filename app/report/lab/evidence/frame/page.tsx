import { buildMetadata } from '@/lib/seo'
import EvidenceOptions from '../EvidenceOptions'

// Report lab: one evidence panel option. Not indexed.
export const metadata = buildMetadata({ path: '/report/lab/evidence/frame', title: 'Report lab | Bearing', description: 'Report lab.', noindex: true })

export default function EvidenceFramePage({ searchParams }: { searchParams: { o?: string; p?: string; free?: string } }) {
  return <EvidenceOptions option={searchParams.o === 'B' ? 'B' : 'A'} panel={searchParams.p ?? 'multi'} free={searchParams.free === '1'} />
}
