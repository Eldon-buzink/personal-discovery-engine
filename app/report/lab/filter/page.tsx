import { buildMetadata } from '@/lib/seo'
import { CLUSTERS } from '@/lib/lab/filterLab'

// Report lab, filter concept: the options board. Every state as a real
// render at 390 and 1280 (each in its own frame, scaled to fit side by
// side). Not indexed; nothing here is used by the real report.
export const metadata = buildMetadata({ path: '/report/lab/filter', title: 'Report lab: filter | Bearing', description: 'Report lab, filter concept.', noindex: true })

const CONTROL_NAMES: Record<string, string> = { a: 'a. Segmented + cluster chips', b: 'b. "Showing" button + menu', c: 'c. One scrolling chip row' }

const BOARD: { section: string; items: { label: string; q: string }[] }[] = [
  { section: 'Free user (no filter)', items: [
    { label: "Today's carousel, per-trait hues (as live)", q: 'f=free&k=carousel&hue=trait' },
    { label: "Today's carousel, cluster hues", q: 'f=free&k=carousel&hue=cluster' },
    { label: 'New composition, cluster hues', q: 'f=free&k=cluster&hue=cluster' },
  ] },
  ...['a', 'b', 'c'].map((c) => ({
    section: `2.1 / 2.2 Filter control ${CONTROL_NAMES[c]}`,
    items: [
      { label: 'Most pronounced (10-way tie, 5 shown at equal size)', q: `f=ctl&c=${c}&view=top` },
      { label: 'One cluster (Drive and discipline, 6)', q: `f=ctl&c=${c}&view=Conscientiousness` },
      ...(c === 'b' ? [{ label: 'Menu open', q: 'f=ctl&c=b&view=top&menu=1' }] : []),
      ...(c === 'c' ? [{ label: 'Longest label selected ([LAB COPY] Curiosity / Drive and discipline)', q: 'f=ctl&c=c&view=Openness' }] : []),
    ],
  })),
  { section: '2.2 Every cluster (control a)', items: CLUSTERS.map((k) => ({ label: k, q: `f=ctl&c=a&view=${k}` })) },
  { section: '2.3 Zoom a: satellites in the same arrangement', items: [
    { label: 'Most pronounced, Take-charge zoomed', q: 'f=ctl&c=c&z=a&view=top&trait=Assertiveness' },
    { label: 'Cluster, Ambitious zoomed', q: 'f=ctl&c=c&z=a&view=Conscientiousness&trait=Achievement-Striving' },
  ] },
  { section: '2.3 Zoom b: a row of dots beneath', items: [
    { label: 'Most pronounced, Take-charge zoomed', q: 'f=ctl&c=c&z=b&view=top&trait=Assertiveness' },
    { label: 'Cluster, Ambitious zoomed', q: 'f=ctl&c=c&z=b&view=Conscientiousness&trait=Achievement-Striving' },
  ] },
  { section: '2.4 Summary a: the text follows the level', items: [
    { label: 'Most pronounced: Ring 1 summary', q: 'f=sum&s=a&view=top' },
    { label: 'Cluster: cluster summary', q: 'f=sum&s=a&view=Conscientiousness' },
    { label: 'Trait: trait detail', q: 'f=sum&s=a&view=Conscientiousness&trait=Achievement-Striving' },
  ] },
  { section: '2.4 Summary b: a Summary chip', items: [
    { label: 'Summary', q: 'f=sum&s=b&view=summary' },
    { label: 'Most pronounced: trait list only', q: 'f=sum&s=b&view=top' },
    { label: 'Cluster: trait list only', q: 'f=sum&s=b&view=Conscientiousness' },
  ] },
  { section: '2.5 Extra (optional): one quiet connector where an insight exists', items: [
    { label: 'Drive and discipline, connector closed', q: 'f=conn&view=Conscientiousness' },
  ] },
  { section: 'Reference: the A+ mock from a138942 (branch report-options)', items: [{ label: 'As it was', q: 'f=ref' }] },
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
      <p style={{ textAlign: 'center', color: '#6B675F', fontSize: 14, margin: '0 0 32px' }}>Each state at 390 (left) and 1280 (right). Real renders, scaled to fit. Every frame is live: tap, filter, zoom, Back.</p>
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
