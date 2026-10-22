import { buildMetadata } from '@/lib/seo'
import { CLUSTERS, familyLabel } from '@/lib/lab/filterLab'

// Report lab, filter concept: the board. Every state as a real render at
// 390 and 1280 (each in its own frame, scaled to fit side by side). Not
// indexed; nothing here is used by the real report. The earlier variants
// (three controls, two zooms, summaries, connector) are in commit 870b028.
export const metadata = buildMetadata({ path: '/report/lab/filter', title: 'Report lab: filter | Bearing', description: 'Report lab, filter concept.', noindex: true })

const BOARD: { section: string; items: { label: string; q: string }[] }[] = [
  { section: 'Free user: 5 traits, no filter, per-trait hues (as live)', items: [
    { label: 'Free (a trait changes colour when the user pays)', q: 'f=free' },
  ] },
  { section: 'Colour inside a cluster', items: ['Conscientiousness', 'Agreeableness'].flatMap((k) => [
    { label: `${familyLabel(k)}: flat (one hue)`, q: `f=paid&view=${k}&tone=flat` },
    { label: `${familyLabel(k)}: hue steps within the family`, q: `f=paid&view=${k}&tone=hue` },
    { label: `${familyLabel(k)}: intensity by how pronounced`, q: `f=paid&view=${k}&tone=intensity` },
    { label: `${familyLabel(k)}: both`, q: `f=paid&view=${k}&tone=both` },
  ]) },
  { section: 'Paid user: "Showing" menu', items: [
    { label: 'Most pronounced (default)', q: 'f=paid&view=top' },
    { label: 'Menu open', q: 'f=paid&view=top&menu=1' },
    { label: 'Most pronounced, another trait in the centre (Sincere)', q: 'f=paid&view=top&trait=Morality' },
    ...CLUSTERS.map((k) => ({ label: familyLabel(k), q: `f=paid&view=${k}` })),
  ] },
]

function Frame({ q, width, scale }: { q: string; width: number; scale: number }) {
  const height = 1200
  return (
    <div style={{ width: width * scale, height: height * scale, overflow: 'hidden', borderRadius: 12, border: '1px solid #E5E1D5', background: '#FFFFFF', flexShrink: 0 }}>
      <iframe src={`/report/lab/filter/frame?${q}`} title={`${q} at ${width}`} width={width} height={height}
        style={{ border: 0, transform: `scale(${scale})`, transformOrigin: '0 0' }} />
    </div>
  )
}

export default function LabFilterPage() {
  return (
    <div style={{ background: '#EFEBE2', minHeight: '100vh', padding: '32px 24px 80px', fontFamily: 'var(--font-body)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 36, textAlign: 'center', margin: '0 0 6px' }}>Report lab: filter</h1>
      <p style={{ textAlign: 'center', color: '#6B675F', fontSize: 14, margin: '0 0 32px' }}>Each state at 390 (left) and 1280 (right). Real renders, scaled to fit. Every frame is live: tap a blob, open the menu.</p>
      {BOARD.map((s) => (
        <section key={s.section} style={{ marginBottom: 56 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, margin: '0 0 16px' }}>{s.section}</h2>
          {s.items.map((it) => (
            <div key={it.q} style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 14, color: '#56534D', margin: '0 0 8px' }}>{it.label} · <a href={`/report/lab/filter/frame?${it.q}`}>open</a></p>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', overflowX: 'auto' }}>
                <Frame q={it.q} width={390} scale={0.62} />
                <Frame q={it.q} width={1280} scale={0.45} />
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
