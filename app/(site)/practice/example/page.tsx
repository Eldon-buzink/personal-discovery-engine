import { buildMetadata } from '@/lib/seo'
import PracticeExampleClient from './PracticeExampleClient'

// A shareable look at the practice with a few weeks of example check-ins,
// for people who haven't signed up. Not indexed and not in the sitemap: it
// is an illustration, not a page to rank.
export const metadata = buildMetadata({
  path: '/practice/example',
  title: 'Practice example | Bearing',
  description: 'What the Bearing practice looks like after a few weeks of check-ins, with example data.',
  noindex: true,
})

export default function PracticeExamplePage() {
  return <PracticeExampleClient />
}
