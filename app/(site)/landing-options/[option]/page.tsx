import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo'
import OptionA from '../OptionA'
import OptionB from '../OptionB'
import OptionC from '../OptionC'
import OptionA2 from '../OptionA2'

// Three landing page options for review. Not indexed, not in the sitemap;
// the live landing page (/) is unchanged.
const OPTIONS = { a: OptionA, a2: OptionA2, b: OptionB, c: OptionC } as const
const NAMES = { a: 'One story', a2: 'One story, iteration 2', b: 'Chapters', c: 'A month with Bearing' } as const

export function generateStaticParams() {
  return Object.keys(OPTIONS).map((option) => ({ option }))
}

export function generateMetadata({ params }: { params: { option: string } }) {
  const name = NAMES[params.option as keyof typeof NAMES] ?? 'Landing option'
  return buildMetadata({ path: `/landing-options/${params.option}`, title: `Landing option: ${name} | Bearing`, description: 'A landing page option for review.', noindex: true })
}

export default function LandingOptionPage({ params }: { params: { option: string } }) {
  const Option = OPTIONS[params.option as keyof typeof OPTIONS]
  if (!Option) notFound()
  return <Option />
}
