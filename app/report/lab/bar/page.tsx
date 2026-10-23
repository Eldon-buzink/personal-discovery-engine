import { buildMetadata } from '@/lib/seo'
import { BAR_STATES } from '@/lib/lab/barStates'

// Report lab: sticky bar and closing panel options, every state at 390 and 1280.
export const metadata = buildMetadata({ path: '/report/lab/bar', title: 'Report lab: bar | Bearing', description: 'Report lab, sticky bar and closing panel.', noindex: true })

const LABEL: Record<string, string> = {
  'not-started': 'Not started', 'in-progress': 'In progress, before the lock', locked: 'Locked at 5',
  'paid-unfinished': 'Paid, Ring 1 unfinished', 'paid-done': 'Paid, Ring 1 finished',
}

function Frame({ q, width, scale, height }: { q: string; width: number; scale: number; height: number }) {
  return (
    <div style={{ width: width * scale, height: height * scale, overflow: 'hidden', borderRadius: 12, border: '1px solid #E5E1D5', background: '#FFFFFF', flexShrink: 0 }}>
      <iframe src={`/report/lab/bar/frame?${q}`} title={`${q} at ${width}`} width={width} height={height} style={{ border: 0, transform: `scale(${scale})`, transformOrigin: '0 0' }} />
    </div>
  )
}

export default function LabBarPage() {
  return (
    <div style={{ background: '#EFEBE2', minHeight: '100vh', padding: '32px 24px 80px', fontFamily: 'var(--font-body)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 36, textAlign: 'center', margin: '0 0 6px' }}>Report lab: sticky bar and closing panel</h1>
      <p style={{ textAlign: 'center', color: '#6B675F', fontSize: 14, margin: '0 0 32px' }}>Bar: (A) full-width bottom bar, (B) floating pill. Panel: (A) contained card, (B) open section. The demo shows the show/hide rules.</p>
      {(['bar', 'panel'] as const).map((part) => (['A', 'B'] as const).map((o) => (
        <section key={part + o} style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 24, margin: '0 0 12px' }}>{part === 'bar' ? 'Sticky bar' : 'Closing panel'} {o}</h2>
          {BAR_STATES.map((s) => (
            <div key={s} style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 14, color: '#56534D', margin: '0 0 6px' }}>{LABEL[s]} · <a href={`/report/lab/bar/frame?o=${o}&s=${s}&part=${part}`}>open</a></p>
              <div style={{ display: 'flex', gap: 16, overflowX: 'auto', alignItems: 'flex-start' }}>
                <Frame q={`o=${o}&s=${s}&part=${part}`} width={390} scale={0.6} height={part === 'bar' ? 600 : 520} />
                <Frame q={`o=${o}&s=${s}&part=${part}`} width={1280} scale={0.42} height={part === 'bar' ? 600 : 520} />
              </div>
            </div>
          ))}
        </section>
      )))}
      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 24, margin: '0 0 12px' }}>Behaviour demo</h2>
        <p style={{ fontSize: 14, color: '#56534D' }}><a href="/report/lab/bar/frame?o=A&s=locked&part=demo">Bar A, locked</a> · <a href="/report/lab/bar/frame?o=B&s=paid-done&part=demo">Bar B, paid and finished</a></p>
      </section>
    </div>
  )
}
