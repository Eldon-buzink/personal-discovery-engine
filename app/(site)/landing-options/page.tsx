import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'
import { type } from '@/lib/design/type'

export const metadata = buildMetadata({ path: '/landing-options', title: 'Landing options | Bearing', description: 'Three landing page options for review.', noindex: true })

const OPTIONS = [
  { href: '/landing-options/a', name: 'A. One story', line: 'A single centred column. Six numbered steps on one thread take you from the assessment into the practice.' },
  { href: '/landing-options/a2', name: 'A, iteration 2', line: 'A with the first round of feedback: how it feels, the problems, the real report, the practice with affirmation and a fuller weekly read, a more visual comparison.' },
  { href: '/landing-options/b', name: 'B. Chapters', line: 'Three chapters, each a short text beside the real product components at full size.' },
  { href: '/landing-options/c', name: 'C. A month with Bearing', line: 'A timeline from the first statement on day 1 to what you see after four weeks.' },
]

export default function LandingOptionsIndex() {
  return (
    <div style={{ background: '#F7F4ED', minHeight: '100vh', padding: '140px 16px 96px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ ...type.display2, color: '#262420', marginBottom: 12 }}>Landing page options</h1>
        <p style={{ ...type.body, color: '#56534D', marginBottom: 32 }}>Three ways to tell the same story. The live landing page is unchanged.</p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {OPTIONS.map((o) => (
            <li key={o.href} style={{ borderTop: '1px solid rgba(38,36,32,0.16)', padding: '20px 0' }}>
              <Link href={o.href} style={{ ...type.display4, color: '#262420', textDecoration: 'underline', textUnderlineOffset: 4 }}>{o.name}</Link>
              <p style={{ ...type.body, color: '#56534D', marginTop: 6 }}>{o.line}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
