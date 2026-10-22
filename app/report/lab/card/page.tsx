import { buildMetadata } from '@/lib/seo'

// Report lab: replacing the trait card's tags, (A) vs (B), on real cards.
export const metadata = buildMetadata({ path: '/report/lab/card', title: 'Report lab: card | Bearing', description: 'Report lab, trait card options.', noindex: true })

// Ambitious and Take-charge have a clear trade-off sentence; Composed is a
// "low" card; Light is Depression, whose answers are never used (no line in B).
const FACETS = [
  ['Achievement-Striving', 'Ambitious'],
  ['Assertiveness', 'Take-charge'],
  ['Vulnerability', 'Composed'],
  ['Depression', 'Light (answers never used)'],
]

function Frame({ q, width, scale }: { q: string; width: number; scale: number }) {
  const height = 1300
  return (
    <div style={{ width: width * scale, height: height * scale, overflow: 'hidden', borderRadius: 12, border: '1px solid #E5E1D5', background: '#FFFFFF', flexShrink: 0 }}>
      <iframe src={`/report/lab/card/frame?${q}`} title={`${q} at ${width}`} width={width} height={height}
        style={{ border: 0, transform: `scale(${scale})`, transformOrigin: '0 0' }} />
    </div>
  )
}

export default function LabCardPage() {
  return (
    <div style={{ background: '#EFEBE2', minHeight: '100vh', padding: '32px 24px 80px', fontFamily: 'var(--font-body)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 36, textAlign: 'center', margin: '0 0 6px' }}>Report lab: trait card</h1>
      <p style={{ textAlign: 'center', color: '#6B675F', fontSize: 14, margin: '0 0 32px' }}>(A) a labelled two-part body, (B) the body plus one line from your answers. Tags removed in both. 390 wide.</p>
      {FACETS.map(([facet, label]) => (
        <section key={facet} style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 24, margin: '0 0 12px' }}>{label}</h2>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto' }}>
            {(['A', 'B'] as const).map((o) => (
              <div key={o}>
                <p style={{ fontSize: 14, color: '#56534D', margin: '0 0 8px' }}>Option {o} · <a href={`/report/lab/card/frame?facet=${encodeURIComponent(facet)}&o=${o}`}>open</a></p>
                <Frame q={`facet=${encodeURIComponent(facet)}&o=${o}`} width={390} scale={0.7} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
