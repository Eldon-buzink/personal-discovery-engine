import { buildMetadata } from '@/lib/seo'

// Report lab, Phase 2: the options board. Every option as a real render at
// 390 and 1280 (each in its own frame, scaled to fit side by side). Not
// indexed; nothing here is used by the real report.
export const metadata = buildMetadata({ path: '/report/lab/options', title: 'Report lab: options | Bearing', description: 'Report lab options board.', noindex: true })

const BOARD: { section: string; items: { label: string; q: string }[] }[] = [
  ...['A', 'B', 'C', 'D', 'E'].map((d) => ({
    section: { A: 'A. Constellation', B: 'B. Map', C: 'C. Palette + carousel', D: 'D. Packed cluster', E: 'E. Family grid' }[d]!,
    items: [
      { label: '5 traits', q: `view=dir&d=${d}&n=5` },
      { label: '30 traits', q: `view=dir&d=${d}&n=30` },
      { label: '30 traits, one selected', q: `view=dir&d=${d}&n=30&sel=1` },
    ],
  })),
  { section: 'Trait picker', items: [{ label: '1. Popover / bottom sheet', q: 'view=picker&v=1' }, { label: '2. Inline panel', q: 'view=picker&v=2' }] },
  { section: 'Summary and trait detail', items: [{ label: '1. Swap', q: 'view=summary&v=1' }, { label: '2. Summary stays on top', q: 'view=summary&v=2' }] },
  {
    section: 'Closing panel',
    items: [
      { label: '1. Contained, locked at 5', q: 'view=closing&v=1&s=locked' },
      { label: '1. Contained, paid', q: 'view=closing&v=1&s=paid' },
      { label: '2. Tinted band, locked at 5', q: 'view=closing&v=2&s=locked' },
      { label: '2. Tinted band, paid', q: 'view=closing&v=2&s=paid' },
    ],
  },
]

function Frame({ q, width, scale }: { q: string; width: number; scale: number }) {
  const height = 1100
  return (
    <div style={{ width: width * scale, height: height * scale, overflow: 'hidden', borderRadius: 12, border: '1px solid #E5E1D5', background: '#FFFFFF', flexShrink: 0 }}>
      <iframe src={`/report/lab/options/frame?${q}`} title={`${q} at ${width}`} width={width} height={height}
        style={{ border: 0, transform: `scale(${scale})`, transformOrigin: '0 0' }} />
    </div>
  )
}

export default function LabOptionsPage() {
  return (
    <div style={{ background: '#EFEBE2', minHeight: '100vh', padding: '32px 24px 80px', fontFamily: 'var(--font-body)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 36, textAlign: 'center', margin: '0 0 6px' }}>Report lab: options</h1>
      <p style={{ textAlign: 'center', color: '#6B675F', fontSize: 14, margin: '0 0 32px' }}>Each option at 390 (left) and 1280 (right). Real renders, scaled to fit.</p>
      {BOARD.map((s) => (
        <section key={s.section} style={{ marginBottom: 56 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, margin: '0 0 16px' }}>{s.section}</h2>
          {s.items.map((it) => (
            <div key={it.q} style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 14, color: '#56534D', margin: '0 0 8px' }}>{it.label} · <a href={`/report/lab/options/frame?${it.q}`}>open</a></p>
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
