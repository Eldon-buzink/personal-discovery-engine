import { buildMetadata } from '@/lib/seo'

// Report lab: the evidence panel redesign, (A) blob on a track, (B) two groups.
export const metadata = buildMetadata({ path: '/report/lab/evidence', title: 'Report lab: evidence | Bearing', description: 'Report lab, evidence panel options.', noindex: true })

const ROWS: { label: string; q: string }[] = [
  { label: 'Multi-trait panel (a cluster reading: Drive and discipline)', q: 'p=multi' },
  { label: 'Per-trait panel, a trait in the middle (Deliberate)', q: 'p=deliberate' },
  { label: 'Per-trait panel, a trait that leans (Ambitious)', q: 'p=ambitious' },
  { label: 'Per-trait panel, free user (Take-charge, its own hue)', q: 'p=take-charge&free=1' },
]

function Frame({ q, width, scale }: { q: string; width: number; scale: number }) {
  const height = 1300
  return (
    <div style={{ width: width * scale, height: height * scale, overflow: 'hidden', borderRadius: 12, border: '1px solid #E5E1D5', background: '#FFFFFF', flexShrink: 0 }}>
      <iframe src={`/report/lab/evidence/frame?${q}`} title={`${q} at ${width}`} width={width} height={height} style={{ border: 0, transform: `scale(${scale})`, transformOrigin: '0 0' }} />
    </div>
  )
}

export default function LabEvidencePage() {
  return (
    <div style={{ background: '#EFEBE2', minHeight: '100vh', padding: '32px 24px 80px', fontFamily: 'var(--font-body)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 36, textAlign: 'center', margin: '0 0 6px' }}>Report lab: evidence panel</h1>
      <p style={{ textAlign: 'center', color: '#6B675F', fontSize: 14, margin: '0 0 32px' }}>(A) blob on a track, (B) two groups. Each at 390 and 1280. New text is marked [LAB COPY].</p>
      {(['A', 'B'] as const).map((o) => (
        <section key={o} style={{ marginBottom: 56 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, margin: '0 0 16px' }}>Option {o}: {o === 'A' ? 'blob on a track' : 'two groups, no tracks'}</h2>
          {ROWS.map((r) => (
            <div key={r.q} style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 14, color: '#56534D', margin: '0 0 8px' }}>{r.label} · <a href={`/report/lab/evidence/frame?o=${o}&${r.q}`}>open</a></p>
              <div style={{ display: 'flex', gap: 16, overflowX: 'auto', alignItems: 'flex-start' }}>
                <Frame q={`o=${o}&${r.q}`} width={390} scale={0.62} />
                <Frame q={`o=${o}&${r.q}`} width={1280} scale={0.45} />
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
