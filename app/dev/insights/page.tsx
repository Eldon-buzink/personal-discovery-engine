import Link from 'next/link'
import { notFound } from 'next/navigation'
import { INSIGHT_FIXTURES } from './fixtures'

// Development only: links to fixture reports for checking Ring 1 cards and
// relationship insights by hand. 404 in production.
export default function DevInsightsPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui', lineHeight: 1.5 }}>
      <h1 style={{ fontSize: 22, marginBottom: 6 }}>Example reports</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Each link replaces this browser&apos;s saved session with the fixture and opens the report. Card text is real
        model output; relationship insights are generated when the report opens and appear after a few seconds.
        Use the carousel arrows to move between traits.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 16 }}>
        {Object.entries(INSIGHT_FIXTURES).map(([id, f]) => (
          <li key={id} style={{ border: '1px solid #ddd', borderRadius: 10, padding: 16 }}>
            <a href={`/dev/insights/${id}`} style={{ fontWeight: 600 }}>{f.title}</a>
            <p style={{ margin: '6px 0 0', color: '#555', fontSize: 14 }}>{f.description}</p>
          </li>
        ))}
      </ul>
      <h2 style={{ fontSize: 16, margin: '32px 0 8px' }}>Copy changes</h2>
      <ul>
        <li><Link href="/privacy">Privacy policy</Link> (Anthropic bullet, last-updated date)</li>
        <li><Link href="/">Landing page</Link> (FAQ &ldquo;Is it just AI…&rdquo;, and the microcopy under the branch steps)</li>
      </ul>
    </main>
  )
}
